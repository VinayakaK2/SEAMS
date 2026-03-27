const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const axios = require('axios');
const db = require('../db');
const Redis = require('ioredis');
const { getRecommendations, refreshCandidatePool } = require('../services/recommendationService');

// Shared HA Redis client for background jobs
const jobRedis = require('../utils/redisClient');

// ── Job 1: Refresh global candidate pool every 3 minutes ──────────────────
cron.schedule('*/3 * * * *', async () => {
    console.log('[POOL REFRESH] Refreshing global candidate pool...');
    try {
        await refreshCandidatePool();
        console.log('[POOL REFRESH] Done.');
    } catch (err) {
        console.error('[POOL REFRESH] Failed:', err.message);
    }
});

// ── Job 2: Precompute feeds for active users every 5 minutes ───────────────
cron.schedule('*/5 * * * *', async () => {
    console.log('[PRECOMPUTE] Starting feed precomputation for active users...');
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeUsersResult = await db('user_activity')
            .distinct('user_id')
            .where('timestamp', '>', oneDayAgo)
            .limit(50); // Top 50 most active users

        const activeUserIds = activeUsersResult.map(row => row.user_id);
        console.log(`[PRECOMPUTE] Found ${activeUserIds.length} active users to precompute.`);

        let successCount = 0;
        for (const userId of activeUserIds) {
            try {
                const result = await getRecommendations(userId, 1, 10);
                // Store the precomputed result
                try {
                    await jobRedis.set(
                        `recommendations:precomputed:${userId}`,
                        JSON.stringify(result),
                        'EX', 600 // 10 min TTL
                    );
                    successCount++;
                } catch(e) { /* Redis down — skip writing precomputed */ }
            } catch (err) {
                console.error(`[PRECOMPUTE] Error for user ${userId}:`, err.message);
            }
        }
        console.log(`[PRECOMPUTE] Done — precomputed feeds for ${successCount}/${activeUserIds.length} users.`);
    } catch (error) {
        console.error('[PRECOMPUTE] Failed:', error.message);
    }
});

// ── Job 3 (legacy): Hourly full precompute fallback ──────────────────────────
cron.schedule('0 * * * *', async () => {
    console.log('[Background Job] Starting hourly recommendation precompute (fallback)...');
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const activeUsersResult = await db('users')
            .select('id')
            .where('last_active_at', '>', sevenDaysAgo);
        const activeUserIds = activeUsersResult.map(row => row.id);
        let successCount = 0;
        for (const userId of activeUserIds) {
            try { await getRecommendations(userId, 1, 10); successCount++; } catch (err) {}
        }
        console.log(`[Background Job] Hourly precompute done: ${successCount}/${activeUserIds.length} users.`);
    } catch (error) {
        console.error('[Background Job] Hourly precompute failed:', error);
    }
});

// Run every day at midnight for V4 Tag Decay (Long-Term Learning)
cron.schedule('0 0 * * *', async () => {
    console.log('[Background Job] Starting V4 Daily Tag Decay...');
    try {
        const users = await db('users').select('id', 'tag_profile').whereNotNull('tag_profile');
        
        let decayCount = 0;
        for (const user of users) {
            let profile = {};
            try {
                profile = typeof user.tag_profile === 'string' ? JSON.parse(user.tag_profile) : (user.tag_profile || {});
            } catch (e) {
                continue;
            }
            
            let modified = false;
            for (const tag in profile) {
                if (profile[tag] > 0) {
                    profile[tag] = parseFloat((profile[tag] * 0.95).toFixed(2));
                    if (profile[tag] < 0.05) profile[tag] = 0;
                    modified = true;
                }
            }
            
            if (modified) {
                await db('users').where({ id: user.id }).update({ tag_profile: JSON.stringify(profile) });
                decayCount++;
            }
        }
        console.log(`[Background Job] Tag Decay complete! Decayed profiles for ${decayCount} users.`);
    } catch (error) {
        console.error('[Background Job] Failed to execute tag decay:', error);
    }
});

// Run every day at 1:00 AM for V5 Global Event Score Update
cron.schedule('0 1 * * *', async () => {
    console.log('[Background Job] Starting V5 Global Event Score Update...');
    try {
        const events = await db('events')
            .select('id', 'total_impressions', 'total_clicks', 'total_likes', 'total_registrations')
            .where('status', 'approved');

        let updatedCount = 0;
        for (const ev of events) {
            const impressions = ev.total_impressions || 0;
            const clicks = ev.total_clicks || 0;
            const likes = ev.total_likes || 0;
            const registrations = ev.total_registrations || 0;

            let engagementScore = 0;
            if (impressions > 0) {
                engagementScore = (clicks * 2 + likes * 3 + registrations * 5) / impressions;
                const ctr = clicks / impressions;
                // V5 Feedback-driven penalty: globally penalize events with high impressions but abysmal CTR
                if (impressions > 20 && ctr < 0.03) engagementScore *= 0.5;
            } else if ((clicks + likes + registrations) > 0) {
                engagementScore = 0.5;
            }

            await db('events').where({ id: ev.id }).update({
                global_event_score: parseFloat(engagementScore.toFixed(4))
            });
            updatedCount++;
        }
        console.log(`[Background Job] Global Event Score Update complete! Updated ${updatedCount} events.`);
    } catch (error) {
        console.error('[Background Job] Failed to update global event scores:', error);
    }
});

// Run every day at 2:00 AM for V6 Learning-Based Model Retraining
cron.schedule('0 2 * * *', () => {
    console.log('[Background Job] Starting V6 ML Model Retraining...');
    const scriptPath = path.join(__dirname, '../../ml/train_ranker.py');
    const cwd = path.join(__dirname, '../../ml');
    
    exec(`python "${scriptPath}"`, { cwd }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Background Job] V6 ML Model Retraining Failed: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`[Background Job] V6 ML Model Retraining Error Output: ${stderr}`);
        }
        console.log(`[Background Job] V6 ML Model Retraining Output:\n${stdout}`);
    });
});

// ── Job 5 (V9): Daily embedding backfill — 3:00 AM ─────────────────────────
// Processes all approved events without an embedding in small batches.
cron.schedule('0 3 * * *', async () => {
    console.log('[EMBED JOB] Starting V9 event embedding backfill...');
    const mlUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';
    try {
        const events = await db('events')
            .select('id', 'title', 'description', 'tags')
            .where('status', 'approved')
            .whereNull('embedding')
            .orderBy('id', 'asc')
            .limit(200); // Safety cap per run

        if (events.length === 0) {
            console.log('[EMBED JOB] No events missing embeddings. Done.');
            return;
        }
        console.log(`[EMBED JOB] Found ${events.length} events to embed.`);

        const BATCH_SIZE = 10;
        let success = 0, failed = 0;

        for (let i = 0; i < events.length; i += BATCH_SIZE) {
            const batch = events.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (ev) => {
                try {
                    let tags = [];
                    try { tags = Array.isArray(ev.tags) ? ev.tags : JSON.parse(ev.tags || '[]'); } catch (e) {}
                    const resp = await axios.post(`${mlUrl}/ml/embed/event`, {
                        title:       ev.title       || '',
                        description: ev.description || '',
                        tags,
                    }, { timeout: 15000 });
                    if (resp.data?.status === 'success' && resp.data.embedding) {
                        await db('events').where({ id: ev.id }).update({
                            embedding: JSON.stringify(resp.data.embedding)
                        });
                        success++;
                    } else {
                        failed++;
                    }
                } catch (err) {
                    console.warn(`[EMBED JOB] Failed for event ${ev.id}: ${err.message}`);
                    failed++;
                }
            }));
            // Polite delay between batches
            if (i + BATCH_SIZE < events.length) await new Promise(r => setTimeout(r, 50));
        }
        console.log(`[EMBED JOB] Done. success=${success}, failed=${failed}`);
    } catch (err) {
        console.error('[EMBED JOB] Fatal error:', err.message);
    }
});
