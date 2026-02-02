import { Worker } from 'bullmq';
import emailService from '../services/emailService.js';
import redis from '../config/redis.js';
import { EMAIL_QUEUE_NAME } from '../config/queue.js';

/**
 * Worker to process email jobs from the queue
 */
const emailWorker = new Worker(EMAIL_QUEUE_NAME, async (job) => {
    const { type, email, data, action, meta } = job.data;

    console.log(`Processing email job: ${type} for ${email}`);

    try {
        switch (type) {
            case 'VERIFY_EMAIL':
                await emailService._sendEmailVerification(email, data.token);
                break;
            case 'RESET_PASSWORD':
                await emailService._sendPasswordResetEmail(email, data.token);
                break;
            case 'SECURITY_WARNING':
                await emailService._sendSecurityWarning(email, action, meta);
                break;
            case 'DEVICE_LOGIN':
                await emailService._sendNewDeviceLoginAlert(email, action, meta);
                break;
            default:
                throw new Error(`Unknown email job type: ${type}`);
        }
    } catch (error) {
        console.error(`Failed to process email job ${job.id}:`, error);
        throw error; 
    }
}, {
    connection: redis,
    concurrency: 5 
});

emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job.id} failed: ${err.message}`);
});

export default emailWorker;
