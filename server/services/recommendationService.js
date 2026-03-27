const db = require('../db');
const Redis = require('ioredis');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// ─── In-Memory LRU Cache (simple Map-based, capped size) ─────────────────────
const makeLRU = (maxSize) => {
    const cache = new Map();
    return {
        get(key) {
            if (!cache.has(key)) return null;
            const val = cache.get(key);
            cache.delete(key); cache.set(key, val); // move to end (LRU)
            return val;
        },
        set(key, val) {
            if (cache.has(key)) cache.delete(key);
            cache.set(key, val);
            if (cache.size > maxSize) cache.delete(cache.keys().next().value);
        },
        delete(key) { cache.delete(key); },
        clear() { cache.clear(); },
        size() { return cache.size; },
    };
};

// memPool  — stores the global candidate pool (1 slot, but wrap in LRU for consistency)
// memFeed  — stores per-user precomputed/feed results (up to 500 users)
const memPool = makeLRU(2);
const memFeed = makeLRU(500);

// ─── Redis Circuit Breaker ────────────────────────────────────────────────────
const CIRCUIT = {
    FAILURE_THRESHOLD: 5,      // failures before opening
    WINDOW_MS:         10000,  // sliding window (10s)
    OPEN_DURATION_MS:  30000,  // stay open for 30s then half-open
    failures: [],              // timestamps of recent failures
    openedAt: null,            // when circuit was opened
    isOpen: false,
    status: 'ok',              // 'ok' | 'degraded' | 'down'
};

const recordRedisFailure = () => {
    const now = Date.now();
    CIRCUIT.failures = CIRCUIT.failures.filter(t => now - t < CIRCUIT.WINDOW_MS);
    CIRCUIT.failures.push(now);
    if (!CIRCUIT.isOpen && CIRCUIT.failures.length >= CIRCUIT.FAILURE_THRESHOLD) {
        CIRCUIT.isOpen   = true;
        CIRCUIT.openedAt = now;
        CIRCUIT.status   = 'down';
        console.error('[REDIS CIRCUIT OPEN] Too many Redis failures — bypassing Redis for 30s');
    } else if (!CIRCUIT.isOpen) {
        CIRCUIT.status = 'degraded';
        console.warn(`[REDIS DOWN] failure #${CIRCUIT.failures.length} in window`);
    }
};

const checkCircuitRecovery = () => {
    if (!CIRCUIT.isOpen) return;
    if (Date.now() - CIRCUIT.openedAt >= CIRCUIT.OPEN_DURATION_MS) {
        CIRCUIT.isOpen   = false;
        CIRCUIT.failures = [];
        CIRCUIT.status   = 'ok';
        console.info('[REDIS RECOVERED] Circuit closed — resuming Redis usage');
    }
};

const safeRedisGet = async (key) => {
    checkCircuitRecovery();
    if (CIRCUIT.isOpen) return null;
    try {
        const val = await redis.get(key);
        if (CIRCUIT.status !== 'ok') { CIRCUIT.status = 'ok'; }
        return val;
    } catch (err) {
        recordRedisFailure();
        return null;
    }
};

const safeRedisSet = async (key, val, ttl) => {
    checkCircuitRecovery();
    if (CIRCUIT.isOpen) return;
    try {
        if (ttl) await redis.set(key, val, 'EX', ttl);
        else     await redis.set(key, val);
    } catch (err) {
        recordRedisFailure();
    }
};

// ─── Performance counters ─────────────────────────────────────────────────────
const perfCounters = {
    redis_hits:         0,
    redis_misses:       0,
    ml_fallbacks:       0,
    ml_requests:        0,
    ml_timeout_count:   0,
    total_requests:     0,
    semantic_requests:  0,
    semantic_fallbacks: 0,
};

// ─── Per-request DB query counter ────────────────────────────────────────────
let _dbQueryCount = 0;
const resetDbCount = () => { _dbQueryCount = 0; };
const incDbCount   = (n = 1) => { _dbQueryCount += n; };
const MAX_DB_QUERIES = 4; // safety guard

// ─── Timed DB query with slow-query logging ───────────────────────────────────
const timedDbQuery = async (label, fn) => {
    incDbCount();
    if (_dbQueryCount > MAX_DB_QUERIES) {
        console.warn(`[SAFETY] DB query limit exceeded (${_dbQueryCount}), short-circuiting: ${label}`);
        return { result: null, elapsed: 0 };
    }
    const start = performance.now();
    const result = await fn();
    const elapsed = performance.now() - start;
    if (elapsed > 200) console.warn(`[SLOW_QUERY] ${label}: ${Math.round(elapsed)}ms`);
    return { result, elapsed };
};

// ─── Redis connection ─────────────────────────────────────────────────────────
const redis = require('../utils/redisClient');

redis.on('error', (err) => {
    recordRedisFailure();
    console.error('[REDIS DOWN] Error:', err.message);
});
redis.on('ready', () => {
    if (CIRCUIT.isOpen) {
        CIRCUIT.isOpen   = false;
        CIRCUIT.failures = [];
        CIRCUIT.status   = 'ok';
        console.info('[REDIS RECOVERED] Connection re-established');
    }
});



// ─── Candidate Pool Management ────────────────────────────────────────────────
const CANDIDATE_POOL_KEY = 'candidate_pool:global';
const CANDIDATE_POOL_TTL = 180; // 3 minutes

/** Fetch events + activity counts in one mega-JOIN and store in Redis + memPool */
const refreshCandidatePool = async () => {
    try {
        const rows = await db('events')
            .select(
                'events.id', 'events.title', 'events.category', 'events.status',
                'events.tags', 'events.date', 'events.points', 'events.venue', 'events.poster',
                'events.total_impressions', 'events.total_clicks', 'events.total_likes', 'events.total_registrations'
            )
            .leftJoin(
                db('user_activity').select('event_id').count('id as activity_count').groupBy('event_id').as('ua'),
                'events.id', 'ua.event_id'
            )
            .select(db.raw('COALESCE(ua.activity_count, 0) as activity_count'))
            .where('events.status', 'approved')
            .whereRaw('events.date >= CURRENT_DATE')
            .limit(500);

        const serialized = JSON.stringify(rows);
        await safeRedisSet(CANDIDATE_POOL_KEY, serialized, CANDIDATE_POOL_TTL);
        memPool.set(CANDIDATE_POOL_KEY, rows); // also store in LRU
        console.log(`[CACHE] candidate_pool refreshed: ${rows.length} events`);
        return rows;
    } catch (err) {
        console.error('[CACHE] candidate_pool refresh failed:', err.message);
        return memPool.get(CANDIDATE_POOL_KEY) || []; // serve stale LRU if available
    }
};

/** Get candidate pool: Redis → memPool → DB refresh (in that order) */
const getCandidatePool = async () => {
    // 1. Try Redis
    const cached = await safeRedisGet(CANDIDATE_POOL_KEY);
    if (cached) {
        perfCounters.redis_hits++;
        const pool = JSON.parse(cached);
        memPool.set(CANDIDATE_POOL_KEY, pool); // keep LRU warm
        return pool;
    }
    // 2. Try in-memory LRU (Redis down or miss)
    const memCached = memPool.get(CANDIDATE_POOL_KEY);
    if (memCached) {
        perfCounters.redis_misses++;
        console.log('[CACHE] candidate_pool served from in-memory LRU (Redis unavailable)');
        return memCached;
    }
    // 3. Refresh from DB
    perfCounters.redis_misses++;
    incDbCount();
    return await refreshCandidatePool();
};

/**
 * Incrementally patch the candidate pool without a full DB refresh.
 * Called from event controller on create/update/delete.
 * action: 'add' | 'update' | 'remove'
 */
const patchCandidatePool = async (action, event) => {
    try {
        let pool = memPool.get(CANDIDATE_POOL_KEY);
        if (!pool) {
            const cached = await safeRedisGet(CANDIDATE_POOL_KEY);
            pool = cached ? JSON.parse(cached) : null;
        }
        if (!pool) return; // Pool not yet initialized, skip patch

        if (action === 'add') {
            pool = pool.filter(e => e.id !== event.id); // dedup
            pool.push({ ...event, activity_count: 0 });
            console.log(`[POOL PATCH] Added event ${event.id} to candidate pool`);
        } else if (action === 'update') {
            pool = pool.map(e => e.id === event.id ? { ...e, ...event } : e);
            console.log(`[POOL PATCH] Updated event ${event.id} in candidate pool`);
        } else if (action === 'remove') {
            pool = pool.filter(e => e.id !== event.id);
            console.log(`[POOL PATCH] Removed event ${event.id} from candidate pool`);
        }

        memPool.set(CANDIDATE_POOL_KEY, pool);
        await safeRedisSet(CANDIDATE_POOL_KEY, JSON.stringify(pool), CANDIDATE_POOL_TTL);
    } catch (err) {
        console.error('[POOL PATCH] Failed:', err.message);
    }
};

/** Flush candidate pool from both Redis and in-memory LRU */
const invalidateCandidatePool = async () => {
    memPool.delete(CANDIDATE_POOL_KEY);
    try { await redis.del(CANDIDATE_POOL_KEY); } catch(e) {}
    console.log('[CACHE] candidate_pool invalidated');
};

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
 * Normalizes a plain { id -> rawScore } Map to the range [0, 1].
 * Returns a new Map { id -> normalizedScore }.
 */
const normalizeScoreMap = (scoreMap) => {
    if (scoreMap.size === 0) return scoreMap;
    const vals = [...scoreMap.values()];
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const result = new Map();
    if (max === min) {
        scoreMap.forEach((v, k) => result.set(k, max > 0 ? 1 : 0));
    } else {
        scoreMap.forEach((v, k) => result.set(k, (v - min) / (max - min)));
    }
    return result;
};

// ─── V9 Hybrid Semantic: User Embedding ───────────────────────────────────────
/**
 * Get or build a user embedding:
 * 1. Try Redis cache (TTL 20 min)
 * 2. Build from interacted event embeddings by calling /ml/embed/user
 * 3. Cache result in Redis
 * Returns float[384] array or null if unavailable.
 */
const getUserEmbedding = async (userId, interactedIds, candidatePool) => {
    const embKey = `user:embedding:${userId}`;
    try {
        // 1. Try Redis cache first
        const cached = await safeRedisGet(embKey);
        if (cached) {
            perfCounters.redis_hits++;
            return JSON.parse(cached);
        }
        perfCounters.redis_misses++;

        // 2. Collect embeddings of events the user interacted with (from candidatePool)
        const interactedSet = new Set(interactedIds);
        const interactedEmbeddings = candidatePool
            .filter(ev => interactedSet.has(ev.id) && ev.embedding)
            .map(ev => {
                try {
                    return typeof ev.embedding === 'string' ? JSON.parse(ev.embedding) : ev.embedding;
                } catch (e) { return null; }
            })
            .filter(Boolean);

        if (interactedEmbeddings.length === 0) {
            return null; // Cold-start: no embeddings available yet
        }

        // 3. Call /ml/embed/user to compute mean embedding
        perfCounters.semantic_requests++;
        const mlUrl = process.env.ML_SERVICE_URL || `http://127.0.0.1:${process.env.ML_PORT || 5001}`;
        const response = await axios.post(`${mlUrl}/ml/embed/user`,
            { embeddings: interactedEmbeddings },
            { timeout: 500 }
        );

        if (response.data?.status !== 'success' || !response.data?.embedding) return null;

        const userEmbedding = response.data.embedding;
        // Cache for 20 minutes
        await safeRedisSet(embKey, JSON.stringify(userEmbedding), 1200);
        return userEmbedding;
    } catch (err) {
        perfCounters.semantic_fallbacks++;
        console.warn(`[SEMANTIC] getUserEmbedding failed for user ${userId}: ${err.message}`);
        return null;
    }
};

// ─── V10 FAISS Hybrid Semantic: Candidate Search ─────────────────────────────────────
/**
 * V10: Find top-N most semantically similar events to the user embedding using FAISS ANN.
 * Calls /ml/semantic-search securely with just the user vector.
 */
const getSemanticCandidates = async (userEmbedding, candidatePool, excludedIds, topN = 100) => {
    if (!userEmbedding) return [];
    try {
        const excludedSet = new Set(excludedIds);

        perfCounters.semantic_requests++;
        
        const vectorUrl = process.env.VECTOR_SERVICE_URL || `http://127.0.0.1:${process.env.VECTOR_PORT || 5002}`;
        
        // Request bounds expansion to account for potential user-interacted excluded elements in FAISS DB
        const searchN = topN + excludedSet.size;
        const response = await axios.post(`${vectorUrl}/vector/search`,
            { user_embedding: userEmbedding, top_n: searchN },
            { timeout: 500 }
        );

        if (response.data?.status !== 'success') return [];

        // Map results back to full event objects residing securely in candidatePool memory
        const poolMap = new Map(candidatePool.map(ev => [ev.id, ev]));
        return (response.data.candidates || [])
            .map(r => {
                if (excludedSet.has(r.id)) return null;
                const ev = poolMap.get(r.id);
                return ev ? { event: ev, semanticScore: r.score } : null;
            })
            .filter(Boolean)
            .slice(0, topN);
            
    } catch (err) {
        perfCounters.semantic_fallbacks++;
        console.warn(`[SEMANTIC] FAISS getSemanticCandidates failed: ${err.message}`);
        return [];
    }
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
 * Now accepts pre-fetched `logStats` to avoid hitting recommendation_logs DB on every call.
 */
const computeUserSegment = (userId, interactionsCount, logStats = null) => {
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

    // V5: Auto-tune based on personal CTR from pre-fetched log stats
    if (logStats) {
        const { shown = 0, clicked = 0 } = logStats;
        const ctr = shown > 10 ? clicked / shown : null;
        if (ctr !== null) {
            if (ctr < 0.05) exploreRatio = Math.min(exploreRatio + 0.1, 0.6);
            else if (ctr > 0.2) exploreRatio = Math.max(exploreRatio - 0.05, 0.05);
        }
    }

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

// Rewritten to use pre-loaded candidatePool from Redis instead of querying DB
const getPersonalizedEvents = (user, alreadyInteractedIds, candidatePool, sessionTags) => {
    const tagProfile = typeof user.tag_profile === 'string' ? JSON.parse(user.tag_profile) : (user.tag_profile || {});
    const interests = Array.isArray(user.interests) ? user.interests : [];
    
    const hasProfile = Object.keys(tagProfile).length > 0;
    const hasInterests = interests.length > 0;
    
    if (!hasProfile && !hasInterests) return [];

    const interactedSet = new Set(alreadyInteractedIds);
    
    const scores = candidatePool
        .filter(event => !interactedSet.has(event.id))
        .map(event => {
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
                if (hasProfile && tagProfile[t]) {
                    contentScore += tagProfile[t];
                    matchedTags.push(t);
                } else if (hasProfile && !tagProfile[t]) {
                    contentScore += 0.1;
                    discoveryBoosted = true;
                }
                if (sessionTags && sessionTags.has(t)) {
                    contentScore += 0.5;
                    sessionBoosted = true;
                }
            });
            
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
            if (sessionBoosted) reason = 'Because you recently viewed similar events';
            else if (matchedTags.length > 0) reason = `Based on your interaction with ${matchedTags[0]}`;
            else if (matchedInterests.length > 0) reason = `Matches your interest in ${matchedInterests[0]}`;
            else if (discoveryBoosted) reason = 'Explore something new';

            return { event, contentScore, interestScore, reason };
        });

    const normalizedContent = normalize(scores.map(s => ({...s, score: s.contentScore})));
    const normalizedInterest = normalize(scores.map(s => ({...s, score: s.interestScore})));
    
    return scores.map((s, index) => {
        const cScore = normalizedContent[index].score;
        const iScore = normalizedInterest[index].score;
        const baseScore = (cScore * 0.7) + (iScore * 0.3);
        const recencyBoost = getRecencyBoost(s.event.date);
        return { event: s.event, score: baseScore * (1 + recencyBoost), reason: s.reason };
    }).filter(s => s.score > 0);
};

// Rewritten to use pre-loaded candidatePool from Redis instead of querying DB
const getTrendingEvents = (alreadyInteractedIds, candidatePool) => {
    const interactedSet = new Set(alreadyInteractedIds);
    
    const scores = candidatePool
        .filter(event => !interactedSet.has(event.id))
        .map(event => {
            const interactions = parseInt(event.activity_count) || 0;
            const recencyBoost = getRecencyBoost(event.date);
            const score = interactions * (1 + recencyBoost);
            return { event, score, reason: score > 0 ? 'Trending event' : null };
        });

    return scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 30);
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

const getRecommendations = async (userId, page = 1, limit = 10) => { // V9 Hybrid Semantic
    resetDbCount(); // Reset per-request DB counter
    const t0 = performance.now();
    perfCounters.total_requests++;
    const safeLimit = Math.min(Number(limit), 50);
    const safePage = Math.max(Number(page), 1);
    const cacheKey = `recommendations:v8:${userId}:${safePage}:${safeLimit}`;

    // ── 0a. Precomputed feed (layer-0 cache: populated by background job) ──
    const precomputedKey = `recommendations:precomputed:${userId}`;
    const precomputedRaw = await safeRedisGet(precomputedKey)
                        || (memFeed.get(precomputedKey) ? JSON.stringify(memFeed.get(precomputedKey)) : null);
    if (precomputedRaw) {
        perfCounters.redis_hits++;
        const precomputed = JSON.parse(precomputedRaw);
        console.log(`[REDIS HIT] precomputed feed:${userId}`);
        return { ...precomputed, meta: { ...precomputed.meta, precomputed_used: true } };
    }

    // ── 0b. Feed-level cache (5 min TTL) ─────────────────────────────────
    const feedRaw = await safeRedisGet(cacheKey) || (memFeed.get(cacheKey) ? JSON.stringify(memFeed.get(cacheKey)) : null);
    if (feedRaw) {
        perfCounters.redis_hits++;
        console.log(`[REDIS HIT] feed:${userId}`);
        return JSON.parse(feedRaw);
    }
    perfCounters.redis_misses++;
    console.log(`[REDIS MISS] feed:${userId}`);

    // ── 1. Fetch user features (DB only if cache miss, 30 min TTL) ────────
    const userCacheKey = `user:features:v9:${userId}`;
    let userFeatures;
    const cachedUser = await safeRedisGet(userCacheKey) || (memFeed.get(userCacheKey) ? JSON.stringify(memFeed.get(userCacheKey)) : null);
    if (cachedUser) {
        userFeatures = JSON.parse(cachedUser);
        perfCounters.redis_hits++;
        console.log(`[REDIS HIT] user_features:${userId}`);
    } else {
        perfCounters.redis_misses++;
        console.log(`[REDIS MISS] user_features:${userId} – fetching from DB`);
    }

    if (!userFeatures) {
        const [{ result: user }, { result: activity }, { result: logRow }] = await Promise.all([
            timedDbQuery(`users.select(${userId})`, () => db('users').where({ id: userId }).first()),
            timedDbQuery(`user_activity.select(${userId})`, () =>
                db('user_activity').select('event_id', 'timestamp').where({ user_id: userId }).orderBy('timestamp', 'desc')),
            timedDbQuery(`rec_logs.ctr(${userId})`, () =>
                db('recommendation_logs').where({ user_id: userId })
                    .select(
                        db.raw("COUNT(*) FILTER (WHERE action='shown') as shown"),
                        db.raw("COUNT(*) FILTER (WHERE action='clicked') as clicked")
                    ).first())
        ]);

        if (!user) return { events: [], total: 0, page: safePage, limit: safeLimit };

        userFeatures = {
            user,
            interactedIds: [...new Set(activity.map(a => a.event_id))],
            interactionsCount: activity.length,
            activity,
            logStats: {
                shown: parseInt((logRow || {}).shown || 0),
                clicked: parseInt((logRow || {}).clicked || 0)
            }
        };
        // Cache for 30 minutes in both Redis and LRU
        const serializedUser = JSON.stringify(userFeatures);
        await safeRedisSet(userCacheKey, serializedUser, 1800);
        
        // V11: Centralized Distributable Feature Store natively structured into Redis Hashes
        if (!CIRCUIT.isOpen) {
            try {
                const pipe = redis.pipeline();
                pipe.hset(`user:features:${userId}`, {
                    interactionsCount: userFeatures.interactionsCount,
                    logStats_shown: userFeatures.logStats.shown,
                    logStats_clicked: userFeatures.logStats.clicked
                });
                pipe.expire(`user:features:${userId}`, 1800);
                await pipe.exec();
            } catch (e) {
                recordRedisFailure();
            }
        }
        
        memFeed.set(userCacheKey, userFeatures);
    }

    const { user, interactedIds, interactionsCount, activity, logStats } = userFeatures;

    // Build session tags from cached activity (no extra DB hit)
    const now = new Date();
    const sessionRecencyHours = activity.length > 0 ? (now - new Date(activity[0].timestamp)) / (1000 * 60 * 60) : 100.0;
    const recentActivityItems = activity.filter(a => (now - new Date(a.timestamp)) < 15 * 60 * 1000);
    const recentClickedIds = recentActivityItems.map(a => a.event_id);

    // Build session tags using events already in candidatePool (avoids extra DB hit)
    // They will be built lazily after pool fetch

    // ── 2. Fetch global candidate pool (DB only if cache miss) ────────────
    // DB QUERY #2: one mega-JOIN of events + activity counts
    const [{ segment, abGroup, exploreRatio }, candidatePool] = await Promise.all([
        Promise.resolve(computeUserSegment(userId, interactionsCount, logStats)),
        getCandidatePool()
    ]);

    // Build session tags from pool in-memory
    const sessionTagSet = new Set();
    const recentClickedSet = new Set(recentClickedIds);
    candidatePool.forEach(ev => {
        if (recentClickedSet.has(ev.id)) {
            let tgs = [];
            try { tgs = Array.isArray(ev.tags) ? ev.tags : JSON.parse(ev.tags || '[]'); } catch(e) {}
            tgs.forEach(t => sessionTagSet.add(t));
        }
    });

    // Marker: candidate generation done
    const tCandidateGen = performance.now();

    // ── 3. V9 Hybrid Candidate Generation ────────────────────────────────
    //   50% semantic | 30% cached pool (V8 exploitation) | 20% exploration
    //   All components are deduplicated and capped at 200 total.
    const MAX_CANDIDATES = 200;
    const semanticLimit  = Math.ceil(MAX_CANDIDATES * 0.5);  // 100 from semantic
    const exploitLimit   = Math.ceil(MAX_CANDIDATES * 0.3);  // 60 from V8 pool
    const exploreLimit   = MAX_CANDIDATES - semanticLimit - exploitLimit; // 40 exploration

    // 3a. Semantic candidates (try embedding-based search)
    let semanticUsed = false;
    let userEmbedding = null;
    let semanticItems = [];
    let semanticScoreMap = new Map(); // event_id -> cosine similarity

    try {
        userEmbedding = await getUserEmbedding(userId, interactedIds, candidatePool);
        if (userEmbedding) {
            const rawSemantic = await getSemanticCandidates(userEmbedding, candidatePool, interactedIds, semanticLimit);
            if (rawSemantic.length > 0) {
                semanticUsed = true;
                semanticItems = rawSemantic.map(s => ({ ...s.event, reason: 'Semantically matched to your interests' }));
                rawSemantic.forEach(s => semanticScoreMap.set(s.event.id, s.semanticScore));
            }
        }
    } catch (semanticErr) {
        perfCounters.semantic_fallbacks++;
        console.warn(`[SEMANTIC] Candidate generation failed, falling back to V8: ${semanticErr.message}`);
    }

    // 3b. V8 exploitation pool (tag-based personalization + trending)
    const globalEngagementScores = computeGlobalEventScores(candidatePool);
    const semanticExcluded = new Set([...interactedIds, ...semanticItems.map(e => e.id)]);

    const personalizedList = getPersonalizedEvents(user, [...interactedIds, ...semanticItems.map(e => e.id)], candidatePool, sessionTagSet);
    const rawTrending = getTrendingEvents([...interactedIds, ...semanticItems.map(e => e.id)], candidatePool);
    const normalizedTrending = normalize(rawTrending);

    const exploitMap = new Map();
    personalizedList.forEach(item => {
        const engScore = globalEngagementScores.get(item.event.id) || 0;
        const engBoost = Math.min(engScore * 0.1, 0.5);
        exploitMap.set(item.event.id, { ...item, score: item.score * 0.7 + engBoost });
    });
    normalizedTrending.forEach(item => {
        const existing = exploitMap.get(item.event.id);
        const engScore = globalEngagementScores.get(item.event.id) || 0;
        const engBoost = Math.min(engScore * 0.1, 0.5);
        if (existing) {
            existing.score += item.score * 0.3 + engBoost;
        } else {
            exploitMap.set(item.event.id, { ...item, score: item.score * 0.3 + engBoost });
        }
    });
    const exploitationRawData = Array.from(exploitMap.values()).sort((a, b) => b.score - a.score);
    const exploitationItems = applyDynamicDiversity(exploitationRawData, exploitLimit);

    // 3c. Exploration pool (novel events)
    const allExcluded = new Set([
        ...interactedIds,
        ...semanticItems.map(e => e.id),
        ...exploitationItems.map(e => e.id)
    ]);
    let explorationItems = [];
    if (exploreLimit > 0) {
        // V11: Multi-Armed Bandit (Upper Confidence Bound) Exploration
        const totalActivity = candidatePool.reduce((sum, ev) => sum + parseInt(ev.activity_count || 0), 0) + 1;
        
        const exploreCandidates = candidatePool
            .filter(ev => !allExcluded.has(ev.id))
            .map(ev => {
                const activity = parseInt(ev.activity_count || 0);
                const popScore = globalEngagementScores.get(ev.id) || 0;
                // UCB Formula: Exploitation (popularity) + Exploration (novelty constraint) 
                const ucbScore = popScore + (0.5 * Math.sqrt(Math.log(totalActivity) / (activity + 1)));
                return { ...ev, ucbScore, reason: 'Discover something new' };
            })
            .sort((a, b) => b.ucbScore - a.ucbScore)
            .slice(0, exploreLimit);
        
        explorationItems = exploreCandidates;
    }

    // 3d. Merge all three pools (deduplication by id, capped at MAX_CANDIDATES)
    const seenIds = new Set();
    const allCandidatesRaw = [...semanticItems, ...exploitationItems, ...explorationItems]
        .filter(ev => {
            if (!ev || !ev.id || seenIds.has(ev.id)) return false;
            seenIds.add(ev.id);
            return true;
        })
        .slice(0, MAX_CANDIDATES);

    // ── 4. V9 Hybrid ML Ranking ────────────────────────────────────────────
    //   final_score = 0.5 × ML (LightGBM) + 0.3 × semantic_sim + 0.2 × global_engagement
    //   All three components are min-max normalized before combining.
    let finalEvents = [];
    let isV7 = false;
    let mlInferenceTime = 0;
    const allCandidates = allCandidatesRaw;

    // Pre-build a raw ML score map (filled by LightGBM)
    const mlScoreMap = new Map();
    // Normalize semantic scores (already 0-1 cosine, but normalize across candidates)
    const normalizedSemanticMap = normalizeScoreMap(semanticScoreMap);
    // Normalize global engagement scores
    const normalizedEngagementMap = normalizeScoreMap(globalEngagementScores);

    if (allCandidates.length > 0) {
        try {
            const candidateFeatures = allCandidates.map(item => {
                const eDate = new Date(item.date);
                let ageInDays = (now - eDate) / (1000 * 60 * 60 * 24);
                if (ageInDays < 0) ageInDays = 0;
                let freshnessBucket = 3;
                if (ageInDays < 1) freshnessBucket = 0;
                else if (ageInDays <= 3) freshnessBucket = 1;
                else if (ageInDays <= 7) freshnessBucket = 2;
                const tagWeight = item.score !== undefined ? item.score : 0;
                // Pass semantic similarity as tag_sim feature to LightGBM for better ranking
                const semScore = semanticScoreMap.get(item.id) || 0;
                return {
                    event_id: item.id,
                    tag_sim: semScore > 0 ? semScore : (tagWeight > 0 ? 0.5 : 0),
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
            perfCounters.ml_requests++;
            console.log(`[ML] Hybrid batch inference: ${candidateFeatures.length} candidates, user=${userId}, abGroup=${abGroup}, semantic=${semanticUsed}`);

            const isShadowTest = (abGroup === 'A');
            if (isShadowTest) {
                // Fire-and-forget shadow test — 300ms timeout
                axios.post(`${mlUrl}/ml/rank`, { segment, candidates: candidateFeatures }, { timeout: 300 })
                    .then(async (response) => {
                        if (response.data?.status === 'success' && response.data.ranked.length > 0) {
                            try {
                                const candidateMap = new Map(allCandidates.map(c => [c.id, c]));
                                const recentCategories = new Set(
                                    candidatePool.filter(e => recentClickedSet.has(e.id)).map(e => e.category).filter(Boolean)
                                );
                                let shadowRanked = response.data.ranked.map(r => {
                                    let s = r.v7_score || 0;
                                    const cand = candidateMap.get(r.event_id);
                                    if (cand?.category && recentCategories.has(cand.category)) s *= 1.5;
                                    return { event_id: r.event_id, score: s };
                                }).sort((a,b) => b.score - a.score);
                                const top5V7 = shadowRanked.slice(0, 5).map(r => r.event_id).join(',');
                                await db('recommendation_logs').insert({
                                    user_id: userId, event_id: shadowRanked[0].event_id,
                                    action: 'shadow_v7_diff', recommendation_context: `v7_top5:[${top5V7}]`
                                });
                            } catch(err) {}
                        }
                    }).catch(() => {});
                isV7 = false;
            } else {
                const tMLStart = performance.now();
                const response = await axios.post(`${mlUrl}/ml/rank`, { segment, candidates: candidateFeatures }, { timeout: 300 });
                mlInferenceTime = performance.now() - tMLStart;
                console.log(`[ML LATENCY] ${Math.round(mlInferenceTime)}ms`);
                if (response.data?.status === 'success' && response.data.ranked.length > 0) {
                    // Fill mlScoreMap with raw LightGBM probabilities
                    response.data.ranked.forEach(r => mlScoreMap.set(r.event_id, r.v7_score || 0));
                    isV7 = true;
                }
            }
        } catch (mlError) {
            perfCounters.ml_fallbacks++;
            const isTimeout = mlError.code === 'ECONNABORTED' || (mlError.message || '').includes('timeout');
            if (isTimeout) {
                perfCounters.ml_timeout_count++;
                console.warn(`[ML TIMEOUT] #${perfCounters.ml_timeout_count} – response exceeded 300ms`);
            } else {
                console.error(`[ML FALLBACK] #${perfCounters.ml_fallbacks} – ${mlError.message}`);
            }
        }
    }

    // ── 4b. Compute hybrid final score (V10 Meta-Ranker) ───────────────────────────────────
    // Normalize LightGBM scores across all candidates
    const normalizedMlMap = normalizeScoreMap(mlScoreMap);
    const recentCategories = new Set(
        candidatePool.filter(e => recentClickedSet.has(e.id)).map(e => e.category).filter(Boolean)
    );
    const candidateMap = new Map(allCandidates.map(c => [c.id, c]));

    let isV10 = false;
    if (isV7 || semanticUsed) {
        // V10 Adaptive Vector Meta-Ranking
        try {
            const metaCandidates = allCandidates.map(item => ({
                event_id: item.id,
                semantic_sim: normalizedSemanticMap.get(item.id) || 0,
                ml_score: normalizedMlMap.get(item.id) || 0,
                popularity: normalizedEngagementMap.get(item.id) || 0,
                recency: getRecencyBoost(item.date)
            }));
            
            const mlUrl = process.env.ML_SERVICE_URL || `http://127.0.0.1:${process.env.ML_PORT || 5001}`;
            const tMetaStart = performance.now();
            const metaResponse = await axios.post(`${mlUrl}/ml/meta-rank`, { candidates: metaCandidates }, { timeout: 400 });
            console.log(`[ML LATENCY] Meta-Ranker ${Math.round(performance.now() - tMetaStart)}ms`);
            
            if (metaResponse.data?.status === 'success' && metaResponse.data.ranked?.length > 0) {
                const metaScoreMap = new Map(metaResponse.data.ranked.map(r => [r.event_id, r.meta_score || 0]));
                isV10 = true;
                
                finalEvents = allCandidates.map(item => {
                    const metaScore = metaScoreMap.get(item.id) || 0;
                    const boosted = (item.category && recentCategories.has(item.category)) ? metaScore * 1.3 : metaScore;
                    
                    let reason = item.reason;
                    if (!reason) {
                        if ((normalizedSemanticMap.get(item.id)||0) > 0.6) reason = 'Highly relevant to your interests';
                        else if ((normalizedMlMap.get(item.id)||0) > 0.6) reason = 'Highly relevant to you';
                        else reason = 'Explore something new';
                    }
                    return { ...item, hybridScore: boosted, reason };
                });
                finalEvents.sort((a, b) => b.hybridScore - a.hybridScore);
            }
        } catch (metaErr) {
            console.warn(`[ML META-RANK FALLBACK] Meta-Ranker failed, falling back to static V9 formula: ${metaErr.message}`);
        }
        
        // V9 Fallback if Meta-Ranker fails
        if (!isV10) {
            finalEvents = allCandidates.map(item => {
                const mlScore       = normalizedMlMap.get(item.id) || 0;
                const semScore      = normalizedSemanticMap.get(item.id) || 0;
                const engScore      = normalizedEngagementMap.get(item.id) || 0;
                const hybridScore   = (0.5 * mlScore) + (0.3 * semScore) + (0.2 * engScore);

                const boosted = (item.category && recentCategories.has(item.category)) ? hybridScore * 1.3 : hybridScore;

                let reason = item.reason;
                if (!reason) {
                    if (semScore > 0.6)  reason = 'Highly relevant to your interests';
                    else if (mlScore > 0.6) reason = 'Highly relevant to you';
                    else reason = 'Explore something new';
                }
                return { ...item, hybridScore: boosted, reason };
            });
            finalEvents.sort((a, b) => b.hybridScore - a.hybridScore);
        }
    }

    // ── 5. V5 fallback ────────────────────────────────────────────────────
    // Only activate if hybrid scoring (LightGBM + semantic) produced no results.
    if (finalEvents.length === 0) {
        if (exploitationItems.length === 0 && explorationItems.length === 0) {
            // Cold start: use top of candidatePool
            finalEvents = candidatePool.slice(0, safeLimit).map(ev => ({ ...ev, reason: 'Discover something new' }));
        } else {
            let expIdx = 0, rndIdx = 0;
            const moduloFactor = Math.max(Math.floor(1 / exploreRatio), 1);
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

    finalEvents = finalEvents.slice(0, safeLimit);

    // ── 6. Build response ────────────────────────────────────────────────────
    const tEnd = performance.now();
    const tCandidateMs = tCandidateGen - t0;
    const tTotal = tEnd - t0;

    const hitRate = (perfCounters.redis_hits + perfCounters.redis_misses) > 0
        ? Math.round(perfCounters.redis_hits / (perfCounters.redis_hits + perfCounters.redis_misses) * 100)
        : 0;

    console.log(`[PIPELINE] user=${userId} | total=${Math.round(tTotal)}ms | cand=${Math.round(tCandidateMs)}ms | ml=${Math.round(mlInferenceTime)}ms | model=${typeof isV10 !== 'undefined' && isV10 ? 'v10' : (isV7 ? 'v7' : 'v5')} | db=${_dbQueryCount} | redis=${CIRCUIT.status}`);

    const result = {
        events: finalEvents,
        total: candidatePool.length,
        page: safePage,
        limit: safeLimit,
        meta: {
            segment, abGroup, exploreRatio,
            model: (typeof isV10 !== 'undefined' && isV10) ? 'v10_meta_ranker' : (isV7 ? 'v9_hybrid_lightgbm' : (semanticUsed ? 'v9_hybrid_heuristic' : 'v5_heuristic')),
            semantic_used: semanticUsed,
            v10_meta_used: typeof isV10 !== 'undefined' && isV10,
            hybrid_mode: true,
            latency: {
                total_pipeline_ms: Math.round(tTotal),
                candidate_gen_ms:  Math.round(tCandidateMs),
                ml_inference_ms:   Math.round(mlInferenceTime)
            },
            perf: {
                db_queries:             _dbQueryCount,
                redis_hit_rate_pct:     hitRate,
                redis_status:           CIRCUIT.status,
                circuit_breaker_open:   CIRCUIT.isOpen,
                precomputed_used:       false,
                ml_requests:            perfCounters.ml_requests,
                ml_fallbacks:           perfCounters.ml_fallbacks,
                ml_timeout_count:       perfCounters.ml_timeout_count,
                semantic_requests:      perfCounters.semantic_requests,
                semantic_fallbacks:     perfCounters.semantic_fallbacks,
                total_requests:         perfCounters.total_requests
            }
        }
    };

    // Write to Redis (safe) + in-memory LRU fallback
    const serializedResult = JSON.stringify(result);
    await safeRedisSet(cacheKey, serializedResult, 300); // 5 min
    memFeed.set(cacheKey, result);
    return result;
};

module.exports = {
    getRecommendations,
    getPersonalizedEvents,
    getTrendingEvents,
    refreshCandidatePool,
    patchCandidatePool,
    invalidateCandidatePool,
};
