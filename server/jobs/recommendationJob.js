const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const db = require('../db');
const { getRecommendations } = require('../services/recommendationService');

// Run every hour to precompute recommendations for active users
cron.schedule('0 * * * *', async () => {
    console.log('[Background Job] Starting V3 Recommendation Precomputation...');
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const activeUsersResult = await db('users')
            .select('id')
            .where('last_active_at', '>', sevenDaysAgo);
            
        const activeUserIds = activeUsersResult.map(row => row.id);
        
        console.log(`[Background Job] Found ${activeUserIds.length} active users to precompute.`);

        let successCount = 0;
        for (const userId of activeUserIds) {
            try {
                await getRecommendations(userId, 1, 10);
                successCount++;
            } catch (err) {
                console.error(`[Background Job] Error precomputing for user ${userId}:`, err.message);
            }
        }
        
        console.log(`[Background Job] Precomputation complete! Successfully cached for ${successCount}/${activeUserIds.length} users.`);
    } catch (error) {
        console.error('[Background Job] Failed to execute precomputation:', error);
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
