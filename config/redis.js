import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: null,  // Required for BullMQ
    enableReadyCheck: false
};

const redis = new Redis(redisConfig);

redis.on("connect", () => {
    console.log("Connected to Redis successfully");
});

redis.on("error", (error) => {
    console.error("Redis connection error:", error);
});

export default redis;
