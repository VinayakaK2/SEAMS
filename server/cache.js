/**
 * Redis Cache Service — cache.js
 * 
 * Implements a cache-aside pattern with graceful degradation.
 * If Redis is unavailable, all operations silently fall through
 * to the database — the app remains fully functional.
 * 
 * Usage:
 *   const { getCache, setCache, delCache, delCachePattern } = require('./cache');
 *   const data = await getCache('key') || await db.query...
 */
const Redis = require('ioredis');

const REDIS_ENABLED = process.env.REDIS_URL || process.env.REDIS_HOST;

let client = null;

if (REDIS_ENABLED) {
    client = process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL, { lazyConnect: true })
        : new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            lazyConnect: true,
            // Retry strategy: disable after 5 attempts so server doesn't hang
            retryStrategy: (times) => times > 5 ? null : Math.min(times * 100, 2000)
        });

    client.on('connect', () => console.log('[Cache] Redis connected'));
    client.on('error', (err) => console.warn('[Cache] Redis error (falling through to DB):', err.message));

    client.connect().catch(err =>
        console.warn('[Cache] Redis not available — caching disabled:', err.message)
    );
} else {
    console.log('[Cache] REDIS_HOST / REDIS_URL not set — caching disabled');
}

// Default TTLs (seconds)
const TTL = {
    EVENTS_LIST: 60,      // Events list — 1 minute
    EVENT:       120,     // Single event — 2 minutes
    USER_PROFILE: 30,     // User profile — 30 seconds
    LEADERBOARD:  120,    // Leaderboard — 2 minutes
    STATS:        60,     // Stats — 1 minute
};

/**
 * Returns cached value or null. Never throws.
 * @param {string} key
 */
const getCache = async (key) => {
    if (!client || client.status !== 'ready') return null;
    try {
        const val = await client.get(key);
        if (val) {
            console.log(`[Cache] HIT ${key}`);
            return JSON.parse(val);
        }
        console.log(`[Cache] MISS ${key}`);
        return null;
    } catch (err) {
        console.warn('[Cache] getCache error:', err.message);
        return null;
    }
};

/**
 * Stores a JSON-serialisable value in Redis with a TTL.
 * Never throws; silently no-ops if Redis is down.
 * @param {string} key
 * @param {*} value - must be JSON-serializable
 * @param {number} ttl - seconds (defaults to 60)
 */
const setCache = async (key, value, ttl = 60) => {
    if (!client || client.status !== 'ready') return;
    try {
        await client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
        console.warn('[Cache] setCache error:', err.message);
    }
};

/**
 * Deletes a specific cache key.
 */
const delCache = async (key) => {
    if (!client || client.status !== 'ready') return;
    try {
        await client.del(key);
        console.log(`[Cache] INVALIDATE ${key}`);
    } catch (err) {
        console.warn('[Cache] delCache error:', err.message);
    }
};

/**
 * Deletes all keys matching a glob pattern (e.g. 'events:*').
 * Uses SCAN instead of KEYS to avoid blocking Redis.
 */
const delCachePattern = async (pattern) => {
    if (!client || client.status !== 'ready') return;
    try {
        let cursor = '0';
        do {
            const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length) {
                await client.del(...keys);
                console.log(`[Cache] INVALIDATE pattern ${pattern} → deleted ${keys.length} keys`);
            }
        } while (cursor !== '0');
    } catch (err) {
        console.warn('[Cache] delCachePattern error:', err.message);
    }
};

module.exports = { getCache, setCache, delCache, delCachePattern, TTL };
