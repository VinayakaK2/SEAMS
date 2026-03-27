/**
 * Rate Limiting Middleware — middleware/limiter.js
 * 
 * Provides fine-grained rate limiters for sensitive endpoints.
 * Uses express-rate-limit with in-memory store (production: swap for RedisStore).
 * 
 * Protects against:
 *   - Brute-force login attacks
 *   - Registration spam
 *   - QR scan replay/flooding
 *   - General API abuse
 */
const rateLimit = require('express-rate-limit');

// ─── Helper ───────────────────────────────────────────────────────────────────
const makeRateLimiter = ({ windowMinutes, max, message }) =>
    rateLimit({
        windowMs: windowMinutes * 60 * 1000,
        max,
        standardHeaders: true,   // Return RateLimit-* headers
        legacyHeaders: false,    // Disable X-RateLimit-* headers
        message: { message },
        handler: (req, res, _next, options) => {
            console.warn(`[RateLimit] ${req.ip} hit limit on ${req.path}`);
            res.status(429).json({ message: options.message.message });
        }
    });

// ─── Per-endpoint limiters ────────────────────────────────────────────────────

/**
 * Login: 10 attempts per 15 minutes per IP.
 * Prevents brute-force password guessing.
 */
const loginLimiter = makeRateLimiter({
    windowMinutes: 15,
    max: 10,
    message: 'Too many login attempts. Please try again in 15 minutes.'
});

/**
 * Registration: 5 accounts per hour per IP.
 * Prevents mass fake account creation.
 */
const registerLimiter = makeRateLimiter({
    windowMinutes: 60,
    max: 5,
    message: 'Too many registration attempts. Please try again later.'
});

/**
 * QR scan (both verify and verify-self): 30 scans per minute per IP.
 * Prevents QR replay flooding and scan spam.
 */
const qrScanLimiter = makeRateLimiter({
    windowMinutes: 1,
    max: 30,
    message: 'Too many QR scan requests. Please wait before scanning again.'
});

/**
 * Forgot password: 5 requests per 30 minutes per IP.
 * Prevents email bombing / account enumeration.
 */
const forgotPasswordLimiter = makeRateLimiter({
    windowMinutes: 30,
    max: 5,
    message: 'Too many password reset requests. Please try again in 30 minutes.'
});

// ─── Localhost skip helper (for load testing only) ──────────────────────────
const isLocalhost = (req) => {
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
};

/**
 * General API limiter: 200 requests per minute per IP.
 * Broad protection against automated scraping.
 * Note: Localhost (load tests) are exempt.
 */
const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isLocalhost(req),
    message: { message: 'Too many requests. Please slow down.' },
    handler: (req, res, _next, options) => {
        console.warn(`[RateLimit] ${req.ip} hit limit on ${req.path}`);
        res.status(429).json({ message: options.message.message });
    }
});

module.exports = { loginLimiter, registerLimiter, qrScanLimiter, forgotPasswordLimiter, generalLimiter };
