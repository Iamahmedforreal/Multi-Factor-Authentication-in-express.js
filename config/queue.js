import { Queue } from 'bullmq';
import { redis } from '../utils/radis.js';

/**
 * Configuration for BullMQ
 */
export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

console.log(`Queue ${EMAIL_QUEUE_NAME} initialized`);
