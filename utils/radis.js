import dotenv from 'dotenv';
dotenv.config();
import raduis from 'ioredis';

export const raduis =  new raduis(
    process.env.REDIS_HOST,
    process.env.REDIS_PORT
);
