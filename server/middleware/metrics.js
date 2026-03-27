const client = require('prom-client');
const db = require('../db');

// Enable default metrics collection (CPU, Memory, Event Loop)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'seams_api_' });

// Custom Application Metric Histograms
const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'seams_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.05, 0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const cacheHitCounter = new client.Counter({
    name: 'seams_cache_hits_total',
    help: 'Total number of native Redis cache hits'
});

const cacheMissCounter = new client.Counter({
    name: 'seams_cache_misses_total',
    help: 'Total number of native Redis cache misses'
});

const mlFallbackCounter = new client.Counter({
    name: 'seams_ml_circuit_fallbacks_total',
    help: 'Total number of successful graceful fallbacks back to mathematical V9 engine'
});

const requestContext = (req, res, next) => {
    // Inject the native timer to measure response completion
    const end = httpRequestDurationMicroseconds.startTimer();
    req._metrics = { startTime: Date.now() };

    res.on('finish', () => {
        const route = req.route ? req.route.path : req.path;
        end({ route, status_code: res.statusCode, method: req.method });
    });

    next();
};

const recordCacheResult = (req, result) => {
    if (result === 'hit') cacheHitCounter.inc();
    else cacheMissCounter.inc();
};

const recordMlFallback = () => {
    mlFallbackCounter.inc();
}

module.exports = { 
    requestContext, 
    recordCacheResult, 
    recordMlFallback,
    promClient: client
};
