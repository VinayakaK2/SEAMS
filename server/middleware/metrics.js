/**
 * Observability Middleware — middleware/metrics.js
 * 
 * Attaches per-request tracking for:
 *   - API response time
 *   - Cache hit / miss counts per request
 *   - DB query count per request (via Knex events)
 * 
 * Emits a structured JSON log line at response end for easy ingestion
 * by log aggregators (Datadog, Cloudwatch, Loki, etc.).
 */
const db = require('../db');

// ─── Per-request context ──────────────────────────────────────────────────────
// Stores query count per async context. We use the request object itself
// rather than AsyncLocalStorage to keep it dependency-free.

const SLOW_API_MS = parseInt(process.env.SLOW_API_MS || '1000', 10);

// Knex fires 'query' for every SQL statement.
// We increment a counter on the *request* object if one is set.
db.on('query', () => {
    // This is a global hook — we gate on the request dbQueryCount tracker
    // set in requestContext middleware below. This avoids any per-query overhead
    // outside of active requests.
});

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * requestContext — MUST be used before routes.
 * Initialises per-request metric counters and injects them into req.
 */
const requestContext = (req, res, next) => {
    req._metrics = {
        startTime: Date.now(),
        dbQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
    };

    // Intercept Knex queries and count only those during this request.
    // We attach/detach per-request to avoid double-counting.
    const queryListener = () => { req._metrics.dbQueries++; };
    db.on('query', queryListener);

    res.on('finish', () => {
        // Remove listener immediately after response to avoid memory leak
        db.removeListener('query', queryListener);

        const elapsed = Date.now() - req._metrics.startTime;
        const { dbQueries, cacheHits, cacheMisses } = req._metrics;
        const totalCacheOps = cacheHits + cacheMisses;
        const cacheHitRate = totalCacheOps > 0
            ? `${Math.round((cacheHits / totalCacheOps) * 100)}%`
            : 'N/A';

        const logLine = {
            ts:          new Date().toISOString(),
            method:      req.method,
            path:        req.path,
            status:      res.statusCode,
            ms:          elapsed,
            dbQueries,
            cacheHits,
            cacheMisses,
            cacheHitRate,
            ip:          req.ip,
            user:        req.user?.id || null
        };

        if (elapsed > SLOW_API_MS) {
            console.warn('[SLOW API]', JSON.stringify(logLine));
        } else {
            console.log('[API]', JSON.stringify(logLine));
        }
    });

    next();
};

/**
 * Call this inside getCache / setCache to record hits & misses
 * on the currently active request.
 * 
 * @param {Request|null} req - express request (pass null if unavailable)
 * @param {'hit'|'miss'} result
 */
const recordCacheResult = (req, result) => {
    if (!req?._metrics) return;
    if (result === 'hit') req._metrics.cacheHits++;
    else req._metrics.cacheMisses++;
};

module.exports = { requestContext, recordCacheResult };
