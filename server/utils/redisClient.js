const Redis = require('ioredis');
require('dotenv').config();

const createRedisClient = () => {
    if (process.env.REDIS_SENTINELS) {
        // Expected format: host1:port1,host2:port2
        const sentinels = process.env.REDIS_SENTINELS.split(',').map(s => {
            const [host, port] = s.split(':');
            return { host, port: parseInt(port, 10) };
        });
        
        return new Redis({
            sentinels,
            name: process.env.REDIS_MASTER_NAME || 'mymaster',
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => Math.min(times * 100, 3000)
        });
    } else {
        return new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
            retryStrategy: (times) => Math.min(times * 100, 3000)
        });
    }
};

const redis = createRedisClient();

redis.on('error', (err) => {
    console.warn(`[REDIS] Connection Error: ${err.message}`);
});

let isConnected = false;
redis.on('connect', () => {
    if (!isConnected) {
        console.log('[REDIS] Connected successfully to ' + (process.env.REDIS_SENTINELS ? 'Sentinel Cluster' : 'Standalone'));
        isConnected = true;
    }
});

module.exports = redis;
