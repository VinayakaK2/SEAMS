const db = require('../db');
const Redis = require('ioredis');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Redis connection - Hardened and safe
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000)
});

redis.on('error', (err) => {
    console.error('Redis Error:', err.message); // Silently log
});

/**
 * Normalizes an array of objects containing a `score` property to the range [0, 1].
 */
const normalize = (list) => {
    if (list.length === 0) return list;
    const max = Math.max(...list.map(i => i.score));
    const min = Math.min(...list.map(i => i.score));
    
    if (max === 0 || max === min) {
        return list.map(i => ({ ...i, score: max > 0 ? 1 : 0 }));
    }
    
    return list.map(i => ({
        ...i,
        score: (i.score - min) / (max - min)
    }));
};

/**
 * Calculates a recency multiplier (boost) based on the age of the event.
 */
const getRecencyBoost = (eventDate) => {
    const now = new Date();
    const eDate = new Date(eventDate);
    let ageInDays = (now - eDate) / (1000 * 60 * 60 * 24);
    if (ageInDays < 0) ageInDays = 0; // Future events
    
    return 1 / (1 + ageInDays);
};

/**
 * V5: Compute user segment and auto-tune explore ratio.
 * Segments: new (<5), casual (5-20), power (>20)
 * A/B: Group B gets +10% exploration
 */
const computeUserSegment = async (userId, interactionsCount) => {
    // A/B Testing: Deterministically assign based on userId parity
    const abGroup = userId % 2 === 0 ? 'A' : 'B';
    const groupBBonus = abGroup === 'B' ? 0.1 : 0;

    let exploreRatio;
    let segment;
    if (interactionsCount < 5) {
        segment = 'new';
        exploreRatio = 0.5;
    } else if (interactionsCount <= 20) {
        segment = 'casual';
        exploreRatio = 0.25;
    } else {
        segment = 'power';
        exploreRatio = 0.1;
    }

    // V5: Auto-tune based on personal CTR from recommendation_logs
    try {
        const userLogs = await db('recommendation_logs')
            .where({ user_id: userId })
            .select(db.raw('COUNT(*) FILTER (WHERE action=\'shown\') as shown'), db.raw('COUNT(*) FILTER (WHERE action=\'clicked\') as clicked'));
        
        const logRow = userLogs[0] || {};
        const shown = parseInt(logRow.shown || 0);
        const clicked = parseInt(logRow.clicked || 0);
        const ctr = shown > 10 ? clicked / shown : null; // Only act if enough data

        if (ctr !== null) {
            if (ctr < 0.05) exploreRatio = Math.min(exploreRatio + 0.1, 0.6); // Low CTR -> more explore
            else if (ctr > 0.2) exploreRatio = Math.max(exploreRatio - 0.05, 0.05); // High CTR -> more personalize
        }
    } catch(e) { /* Non-fatal */ }

    return { segment, abGroup, exploreRatio: Math.min(exploreRatio + groupBBonus, 0.7) };
};

/**
 * V5: Compute engagement-based global event score.
 * event_score = (clicks * 2 + likes * 3 + registrations * 5) / impressions
 * Also applies feedback-driven global penalties/boosts.
 */
const computeGlobalEventScores = (events) => {
    const scoreMap = new Map();
    for (const ev of events) {
        const impressions = ev.total_impressions || 0;
        const clicks = ev.total_clicks || 0;
        const likes = ev.total_likes || 0;
        const registrations = ev.total_registrations || 0;

        let engagementScore = 0;
        if (impressions > 0) {
            engagementScore = (clicks * 2 + likes * 3 + registrations * 5) / impressions;
            // Feedback-driven penalty: high impressions but abysmally low CTR -> penalize
            const ctr = clicks / impressions;
            if (impressions > 20 && ctr < 0.03) engagementScore *= 0.5;
        } else if ((clicks + likes + registrations) > 0) {
            // Events with some activity but no impression tracking  -> neutral score
            engagementScore = 0.5;
        }
        scoreMap.set(ev.id, engagementScore);
    }
    return scoreMap;
};

const getPersonalizedEvents = async (user, alreadyInteractedIds) => {
    const tagProfile = typeof user.tag_profile === 'string' ? JSON.parse(user.tag_profile) : (user.tag_profile || {});
    const interests = user.interests || [];
    
    const hasProfile = Object.keys(tagProfile).length > 0;
    const hasInterests = interests.length > 0;
    
    if (!hasProfile && !hasInterests) return [];

    // V4: Session Context (Last 5 Interactions)
    const recentActivity = await db('user_activity')
        .select('event_id')
        .where({ user_id: user.id })
        .orderBy('timestamp', 'desc')
        .limit(5);
        
    const recentEventIds = recentActivity.map(a => a.event_id);
    const recentEvents = recentEventIds.length > 0 ? await db('events').select('tags').whereIn('id', recentEventIds) : [];
    
    const sessionTags = new Set();
    recentEvents.forEach(e => {
        let tgs = [];
        try { tgs = typeof e.tags === 'string' ? JSON.parse(e.tags) : e.tags; } catch(err) {}
        tgs.forEach(t => sessionTags.add(t));
    });

    // V3 Perf: Select ONLY required columns to save memory
    const allEvents = await db('events')
        .select('id', 'title', 'category', 'status', 'tags', 'date', 'points', 'venue', 'poster')
        .where('status', 'approved')
        .whereRaw('date >= CURRENT_DATE')
        .whereNotIn('id', alreadyInteractedIds);

    const scores = allEvents.map(event => {
        let eventTags = [];
        try {
            eventTags = Array.isArray(event.tags) ? event.tags : JSON.parse(event.tags || '[]');
        } catch (e) {
            eventTags = [];
        }
        
        let contentScore = 0;
        let matchedTags = [];
        let sessionBoosted = false;
        let discoveryBoosted = false;

        eventTags.forEach(t => {
            // 1. Semantic Tag Profile Score (Dot Product)
            if (hasProfile && tagProfile[t]) {
                contentScore += tagProfile[t];
                matchedTags.push(t);
            } else if (hasProfile && !tagProfile[t]) {
                // V4 Category Discovery: Give a tiny boost to tags the user hasn't seen
                contentScore += 0.1;
                discoveryBoosted = true;
            }

            // V4 Session Awareness
            if (sessionTags.has(t)) {
                contentScore += 0.5; // Temporary session boost
                sessionBoosted = true;
            }
        });
        
        // 2. Explicit Interests Score
        let interestScore = 0;
        let matchedInterests = [];
        if (hasInterests) {
             eventTags.forEach(t => {
                if (interests.includes(t)) {
                    interestScore++;
                    matchedInterests.push(t);
                }
            });
        }
        
        let reason = null;
        if (sessionBoosted) {
             reason = `Because you recently viewed similar events`;
        } else if (matchedTags.length > 0) {
            reason = `Based on your interaction with ${matchedTags[0]}`;
        } else if (matchedInterests.length > 0) {
            reason = `Matches your interest in ${matchedInterests[0]}`;
        } else if (discoveryBoosted) {
            reason = `Explore something new`;
        }

        return { 
            event, 
            contentScore, 
            interestScore,
            reason 
        };
    });

    // Normalize locally before returning
    const normalizedContent = normalize(scores.map(s => ({...s, score: s.contentScore})));
    const normalizedInterest = normalize(scores.map(s => ({...s, score: s.interestScore})));
    
    // Combine back with recency boost
    const finalScores = scores.map((s, index) => {
        const cScore = normalizedContent[index].score;
        const iScore = normalizedInterest[index].score;
        
        let baseScore = (cScore * 0.7) + (iScore * 0.3); // Heavy weight on learned profile over explicit interests
        
        // V3 Recency Multiplier
        const recencyBoost = getRecencyBoost(s.event.date);
        const finalScore = baseScore * (1 + recencyBoost);
        
        return {
            event: s.event,
            score: finalScore,
            reason: s.reason
        };
    }).filter(s => s.score > 0);

    return finalScores;
};

const getTrendingEvents = async (alreadyInteractedIds) => {
    // V3 Perf Optimization
    const activityCounts = await db('user_activity')
        .select('event_id')
        .count('id as count')
        .groupBy('event_id');

    const allEventsList = await db('events')
         .select('id', 'title', 'category', 'status', 'tags', 'date', 'points', 'venue', 'poster')
        .where('status', 'approved')
        .whereRaw('date >= CURRENT_DATE')
        .whereNotIn('id', alreadyInteractedIds);

    const scores = allEventsList.map(event => {
        const activity = activityCounts.find(a => a.event_id === event.id);
        const interactions = activity ? parseInt(activity.count) : 0;
        
        const recencyBoost = getRecencyBoost(event.date);
        
        // Final Trending Score
        const score = interactions * (1 + recencyBoost);
        const reason = score > 0 ? `Trending event` : null;
        
        return { event, score, reason };
    });

    return scores.filter(s => s.score > 0).sort((a,b) => b.score - a.score).slice(0, 30);
};

const applyDynamicDiversity = (scoredList, limit) => {
    const finalEvents = [];
    const categoryCounts = new Map();
    const DIVERSITY_PENALTY = 0.25; // Reduce score by 25% for each repetition

    // Apply penalty dynamically based on current rank list count
    let remaining = [...scoredList];

    while (finalEvents.length < limit && remaining.length > 0) {
        // Recalculate dynamic scores based on what is currently in `finalEvents` categoryCounts
        remaining.forEach(item => {
            const cat = item.event.category || 'general';
            const count = categoryCounts.get(cat) || 0;
            // V3 Dynamic Repetition Penalty
            item.dynamicScore = item.score - (item.score * (count * DIVERSITY_PENALTY));
        });

        // Sort by dynamic score
        remaining.sort((a, b) => b.dynamicScore - a.dynamicScore);

        // Pop the top
        const topItem = remaining.shift();
        
        const cat = topItem.event.category || 'general';
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
        
        // Ensure reason exists
        topItem.event.reason = topItem.reason;
        finalEvents.push(topItem.event);
    }

    return finalEvents;
};

const getRecommendations = async (userId, page = 1, limit = 10) => {
    const t0 = performance.now();
    const safeLimit = Math.min(Number(limit), 50);
    const safePage = Math.max(Number(page), 1);
    const cacheKey = `recommendations:v5:${userId}:${safePage}:${safeLimit}`;

    // Check final feed cache first
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch(e) {}
    
    // V8: Feature Precomputation & Caching
    const userCacheKey = `user:features:v8:${userId}`;
    let userFeatures;
    try {
        const cachedUser = await redis.get(userCacheKey);
        if (cachedUser) userFeatures = JSON.parse(cachedUser);
    } catch(e) {}

    if (!userFeatures) {
        const user = await db('users').where({ id: userId }).first();
        if (!user) return { events: [], total: 0, page: safePage, limit: safeLimit };
        
        const activity = await db('user_activity').select('event_id', 'timestamp').where({ user_id: userId }).orderBy('timestamp', 'desc');
        
        userFeatures = {
            user,
            interactedIds: [...new Set(activity.map(a => a.event_id))],
            interactionsCount: activity.length,
            activity
        };
        // Cache user features for 10 minutes (V8)
        try { await redis.set(userCacheKey, JSON.stringify(userFeatures), 'EX', 600); } catch(e) {}
    }

    const { user, interactedIds, interactionsCount, activity } = userFeatures;

    // V7: User Behavioral Features & Real-Time Setup
    const now = new Date();
    const lastActive = activity.length > 0 ? new Date(activity[0].timestamp) : new Date(0);
    const sessionRecencyHours = activity.length > 0 ? (now - lastActive) / (1000 * 60 * 60) : 100.0;
    
    const recentActivity = activity.filter(a => (now - new Date(a.timestamp)) < 15 * 60 * 1000);
    const recentClickedIds = recentActivity.map(a => a.event_id);

    // V8: Concurrent Candidate Generation (Parallel Execution)
    const [
        { segment, abGroup, exploreRatio },
        personalizedList,
        rawTrending
    ] = await Promise.all([
        computeUserSegment(userId, interactionsCount),
        getPersonalizedEvents(user, interactedIds),
        getTrendingEvents(interactedIds)
    ]);

    const exploreLimit = Math.ceil(safeLimit * exploreRatio);
    const exploitLimit = safeLimit - exploreLimit;
    
    const normalizedTrending = normalize(rawTrending);

    // V5: Compute global engagement scores for all candidate events
    // Limit to max 200 candidates total to save memory and inference time
    const maxCandidates = 200;
    let allCandidateEvents = [...personalizedList.map(p => p.event), ...rawTrending.map(t => t.event)];
    // Deduplicate and cap pool Size
    let uniqueEvents = Array.from(new Map(allCandidateEvents.map(e => [e.id, e])).values()).slice(0, maxCandidates);
    // Fetch full metrics for all events
    const eventMetrics = uniqueEvents.length > 0 ? await db('events').whereIn('id', uniqueEvents.map(e => e.id)).select('id', 'total_impressions', 'total_clicks', 'total_likes', 'total_registrations') : [];
    const globalEngagementScores = computeGlobalEventScores(eventMetrics);

    // Combine Personalized & Trending for Exploitation Feed
    const exploitMap = new Map();
    personalizedList.forEach(item => {
        const engScore = globalEngagementScores.get(item.event.id) || 0;
        // V5: Boost score by global engagement score (clipped to max +0.5)
        const engBoost = Math.min(engScore * 0.1, 0.5);
        exploitMap.set(item.event.id, { ...item, score: item.score * 0.7 + engBoost, reason: item.reason });
    });
    normalizedTrending.forEach(item => {
        const existing = exploitMap.get(item.event.id);
        const engScore = globalEngagementScores.get(item.event.id) || 0;
        const engBoost = Math.min(engScore * 0.1, 0.5);
        if (existing) {
            existing.score += item.score * 0.3 + engBoost; // Give trending boost to personalized stuff
        } else {
            exploitMap.set(item.event.id, { ...item, score: item.score * 0.3 + engBoost, reason: item.reason }); // Pure trending items
        }
    });

    // 3. Apply V3 Dynamic Diversity Penalty to get Exploitation items
    const exploitationRawData = Array.from(exploitMap.values()).sort((a,b) => b.score - a.score);
    const exploitationItems = applyDynamicDiversity(exploitationRawData, exploitLimit);

    // 4. Smart Exploration Feed Selection (V4)
    const excludedIds = new Set([
        ...interactedIds, 
        ...exploitationItems.map(e => e.id)
    ]);
    
    // V4: Smart Exploration instead of Pure Random
    let explorationItems = [];
    if (exploreLimit > 0) {
        // Query events ordered by fewest interactions to highlight unseen/emerging content
        const smartExploreDocs = await db('events')
            .leftJoin('user_activity', 'events.id', 'user_activity.event_id')
            .select('events.id', 'events.title', 'events.category', 'events.status', 'events.tags', 'events.date', 'events.points', 'events.venue', 'events.poster')
            .count('user_activity.id as interaction_count')
            .where('events.status', 'approved')
            .whereRaw('events.date >= CURRENT_DATE')
            .whereNotIn('events.id', Array.from(excludedIds))
            .groupBy('events.id')
            .orderBy('interaction_count', 'asc')
            .limit(exploreLimit * 2); // Fetch extra to shuffle
            
        // Shuffle the low-interaction events heavily so they feel random but are structurally sound
        const shuffledExplore = smartExploreDocs.sort(() => 0.5 - Math.random()).slice(0, exploreLimit);
        
        explorationItems = shuffledExplore.map(ev => {
            // Remove the grouping count off the actual event object
            delete ev.interaction_count;
            ev.reason = "Explore something new";
            return ev;
        });
    }

    // V7: Learning-Based Ranking Inference
    let finalEvents = [];
    let isV7 = false;
    
    // Combine all candidates for ML ranking
    const allCandidates = [...exploitationItems, ...explorationItems];

    if (allCandidates.length > 0) {
        try {
            // Build feature matrix
            const candidateFeatures = allCandidates.map(item => {
                const now = new Date();
                const eDate = new Date(item.date);
                let ageInDays = (now - eDate) / (1000 * 60 * 60 * 24);
                if (ageInDays < 0) ageInDays = 0;
                
                let freshnessBucket = 3;
                if (ageInDays < 1) freshnessBucket = 0;
                else if (ageInDays <= 3) freshnessBucket = 1;
                else if (ageInDays <= 7) freshnessBucket = 2;

                // Re-extract tag info from score obj or fallback
                let tagSim = 0;
                let tagWeight = 0;
                if (item.score !== undefined) {
                    tagWeight = item.score; 
                    tagSim = item.score > 0 ? 0.5 : 0; 
                }

                return {
                    event_id: item.id,
                    tag_sim: tagSim,
                    tag_weight: tagWeight,
                    global_event_score: item.global_event_score || 0.5,
                    time_of_day: now.getHours(),
                    day_of_week: now.getDay(),
                    freshness_bucket: freshnessBucket,
                    user_freq: interactionsCount,
                    session_recency: Math.min(sessionRecencyHours, 100.0)
                };
            });

            const mlPort = process.env.ML_PORT || 5001;
            const mlUrl = process.env.ML_SERVICE_URL || `http://127.0.0.1:${mlPort}`;
            
            // Latency marker 1: Candidate Generation complete
            const t1 = performance.now();
            let mlInferenceTime = 0;

            // V7 Shadow Testing logic
            const isShadowTest = (abGroup === 'A'); // Group A: Shadow Mode (Control), Group B: Live V7 (Experimental)

            if (isShadowTest) {
                // Fire and forget, don't block
                const tMLStart = performance.now();
                axios.post(`${mlUrl}/ml/rank`, {
                    segment: segment,
                    candidates: candidateFeatures
                }, { timeout: 1500 }).then(async (response) => {
                    if (response.data && response.data.status === 'success' && response.data.ranked.length > 0) {
                        try {
                            const tMLEnd = performance.now();
                            mlInferenceTime = tMLEnd - tMLStart;
                            
                            const candidateMap = new Map(allCandidates.map(c => [c.id, c]));
                            const recentEvents = uniqueEvents.filter(e => recentClickedIds.includes(e.id));
                            const recentCategories = new Set(recentEvents.map(e => e.category).filter(Boolean));

                            let shadowRanked = response.data.ranked.map(r => {
                                let final_score = r.v7_score || 0;
                                const cand = candidateMap.get(r.event_id);
                                if (cand && cand.category && recentCategories.has(cand.category)) {
                                    final_score *= 1.5;
                                }
                                return { event_id: r.event_id, score: final_score };
                            });

                            shadowRanked.sort((a,b) => b.score - a.score);
                            const top5V7 = shadowRanked.slice(0, 5).map(r => r.event_id).join(',');
                            
                            // Log the V7 top 5 recommendations to recommendation_logs for offline differential analysis
                            await db('recommendation_logs').insert({
                                user_id: userId,
                                event_id: shadowRanked[0].event_id, // Primary recommended event
                                action: 'shadow_v7_diff',
                                recommendation_context: `v7_top5:[${top5V7}]`
                            });
                        } catch(err) { /* ignore */ }
                    }
                }).catch(err => { /* ignore */ });
                
                // Set to false to trigger V5 fallback immediately
                isV7 = false;
            } else {
                // Live Execution for Group B
                const tMLStart = performance.now();
                const response = await axios.post(`${mlUrl}/ml/rank`, {
                    segment: segment,
                    candidates: candidateFeatures
                }, { timeout: 1500 });
                const tMLEnd = performance.now();
                mlInferenceTime = tMLEnd - tMLStart;
                
                if (response.data && response.data.status === 'success' && response.data.ranked.length > 0) {
                    const mlRankedIds = response.data.ranked.map(r => r.event_id);
                    const scoreMap = new Map();
                    const candidateMap = new Map(allCandidates.map(c => [c.id, c]));
                    
                    // V7: Extrapolate recently clicked categories for real-time 1.5x boost
                    const recentEvents = uniqueEvents.filter(e => recentClickedIds.includes(e.id));
                    const recentCategories = new Set(recentEvents.map(e => e.category).filter(Boolean));

                    response.data.ranked.forEach(r => {
                        let final_score = r.v7_score || 0;
                        const cand = candidateMap.get(r.event_id);
                        if (cand && cand.category && recentCategories.has(cand.category)) {
                            final_score *= 1.5; // Real-time feedback multiplier
                        }
                        scoreMap.set(r.event_id, final_score);
                    });

                    finalEvents = mlRankedIds
                        .map(id => candidateMap.get(id))
                        .filter(Boolean)
                        .map(ev => {
                            ev.v7_score = scoreMap.get(ev.id);
                            ev.reason = ev.v7_score > 0.5 ? "Highly relevant to you" : "Explore something new";
                            return ev;
                        });
                    
                    // Sort post real-time boost
                    finalEvents.sort((a,b) => b.v7_score - a.v7_score);
                    
                    isV7 = true;
                }
            }
        } catch (mlError) {
            console.error('[V7 Fallback] ML Ranking failed or model not ready. Falling back to V5 scoring.', mlError.message);
        }
    }

    // V5 Fallback: If completely cold start or ML failed
    if (!isV7) {
        if (exploitationItems.length === 0 && explorationItems.length === 0) {
             const coldStartDocs = await db('events')
                .select('id', 'title', 'category', 'status', 'tags', 'date', 'points', 'venue', 'poster')
                .where('status', 'approved')
                .whereRaw('date >= CURRENT_DATE')
                .limit(safeLimit);
                
             finalEvents = coldStartDocs.map(ev => {
                ev.reason = "Discover something new";
                return ev;
            });
        } else {
            // Interleave the array (Spread explore items evenly)
            let expIdx = 0;
            let rndIdx = 0;
            
            const moduloFactor = Math.floor(1 / exploreRatio);
            
            for (let i = 0; i < safeLimit; i++) {
                if ((i + 1) % moduloFactor === 0 && rndIdx < explorationItems.length) {
                    finalEvents.push(explorationItems[rndIdx++]);
                } else if (expIdx < exploitationItems.length) {
                    finalEvents.push(exploitationItems[expIdx++]);
                } else if (rndIdx < explorationItems.length) {
                    finalEvents.push(explorationItems[rndIdx++]);
                }
            }
        }
    }

    // Cut off purely generated items to requested limit
    finalEvents = finalEvents.slice(0, safeLimit);

    // Determine final total pool math (Approximation for performance)
    const totalEventsCount = await db('events').where('status', 'approved').whereRaw('date >= CURRENT_DATE').count('id as count').first();
    const mockTotal = Math.min(parseInt(totalEventsCount.count), 50); // Hard limit pages to prevent huge DB scans

    const tEnd = performance.now();
    
    // Fallback timings if ML didn't run or wasn't tracked globally
    const tCandidate = typeof tCandidateGen !== 'undefined' ? (tCandidateGen - t0) : (tEnd - t0);
    // Note: mlInferenceTime is trapped inside the try block, we'll re-extract from tEnd - t1 approximation if live
    const tTotal = tEnd - t0;

    const result = {
        events: finalEvents,
        total: mockTotal,
        page: safePage,
        limit: safeLimit,
        meta: { 
            segment, 
            abGroup, 
            exploreRatio, 
            model: isV7 ? 'v7_lightgbm' : 'v5_heuristic',
            latency: {
                total_ms: Math.round(tTotal),
                candidate_gen_ms: Math.round(tCandidate),
                ml_inference_ms: isV7 ? Math.round(mlInferenceTime) : 0
            }
        } // V8: Expose algorithm version & exact latency metrics
    };

    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 300); // 5 mins
    } catch(e) {
        console.error('Redis set error:', e.message);
    }

    return result;
};

module.exports = {
    getRecommendations,
    getPersonalizedEvents,
    getTrendingEvents
};
