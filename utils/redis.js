import dotenv from 'dotenv';
dotenv.config();
import Redis from 'ioredis';

export const redis = new Redis(
    process.env.REDIS_PORT || 6379,
    process.env.REDIS_HOST || 'localhost',
    {
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 5,
        enableReadyCheck: false,
        enableOfflineQueue: true,
        connectTimeout: 10000
    }
);

redis.on('error', (error) => {
    console.warn('[Redis] Connection failed:', error.message);
});

redis.on('connect', () => {
    console.log('[Redis] Connected successfully');
});
