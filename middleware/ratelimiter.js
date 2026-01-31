import { redis } from "../utils/redis.js";
import { buildKey, AuditLogFunction, getIp, getDeviceInfo } from "../utils/helper.js";
import eventEmitter from "./eventEmmit.js";
import jwt from "jsonwebtoken"; // Import jwt to decode directly

const MAX_ATTEMPTS = 5;
const MAX_WINDOW_SECONDS = 10 * 60; // 10 minutes

/**
 * Generic Redis Rate Limiter Helper
 * @param {string} key - Redis key
 * @param {number} limit - Max attempts
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<{allowed: boolean, count: number, ttl: number}>}
 */
const rateLimit = async (key, limit, windowSeconds) => {
    const multi = redis.multi();
    multi.incr(key);
    multi.ttl(key);

    const results = await multi.exec();
    const count = results[0][1];
    let ttl = results[1][1];

    // If key is new (ttl = -1), set expiration
    if (count === 1) {
        await redis.expire(key, windowSeconds);
        ttl = windowSeconds;
    }

    return {
        allowed: count <= limit,
        count,
        ttl
    };
};

// Login rate limit 
export const loginRateLimit = async (req, res, next) => {
    const ip = getIp(req);
    const email = req.body.email;

    if (!email) {
        return res.status(403).json({ error: "email not found" });
    }

    const key = buildKey("login", ip, email);

    const { allowed, count, ttl } = await rateLimit(key, MAX_ATTEMPTS, MAX_WINDOW_SECONDS);

    if (!allowed) {
        AuditLogFunction(null, "RATE_LIMIT_BLOCKED", req, { key, email, ip, bucketCount: count });
        const deviceInfo = getDeviceInfo(req);
        const meta = { ip, deviceInfo };
        eventEmitter.emit('limit_hit', { email, action: "RATE_LIMIT_EXCEEDED", meta });

        return res.status(429).json({
            error: "Too many login attempts, try again later",
            retryAfter: Math.ceil(ttl / 60) // Return minutes
        });
    }
    next();
};

// Refresh token rate limit
export const refreshRateLimit = async (req, res, next) => {
    const refreshToken = req.cookies.refreshtoken;

    if (!refreshToken) {
        return res.status(403).json({ error: "refresh token not found" });
    }

    let userId = "unknown";
    try {
        // Decode without verifying signature just to get the ID for rate limiting
        // Real verification happens in the controller/service
        const decoded = jwt.decode(refreshToken);
        if (decoded && decoded.id) {
            userId = decoded.id;
        } else {
            // If we can't decode it, it's garbage. Limit by IP instead?
            // Or just fail. Let's fallback to IP if no ID.
            userId = getIp(req);
        }
    } catch (err) {
        userId = getIp(req);
    }

    const key = `refresh:${userId}`;
    const { allowed, count, ttl } = await rateLimit(key, MAX_ATTEMPTS, MAX_WINDOW_SECONDS);

    if (!allowed) {
        await AuditLogFunction(userId, "RATE_LIMIT_BLOCKED", req, { key, bucketCount: count });
        return res.status(429).json({
            error: "Too many refresh attempts, try again later",
            retryAfter: Math.ceil(ttl / 60)
        });
    }
    next();
};

// Forgot password rate limit
export const forgotPasswordRateLimit = async (req, res, next) => {
    const ip = getIp(req);
    const email = req.body.email;

    if (!email) {
        return res.status(403).json({ error: "email not found" });
    }

    const key = buildKey("forgotpassword", ip, email);
    const { allowed, count, ttl } = await rateLimit(key, MAX_ATTEMPTS, MAX_WINDOW_SECONDS);

    if (!allowed) {
        AuditLogFunction(null, "RATE_LIMIT_BLOCKED", req, { key, email, ip, bucketCount: count });
        return res.status(429).json({
            error: "Too many forgot password attempts, try again later",
            retryAfter: Math.ceil(ttl / 60)
        });
    }
    next();
};

// Reset password confirm rate limit
export const resetPasswordConfirmRateLimit = async (req, res, next) => {
    const ip = getIp(req);
    const email = req.body.email;

    if (!email) {
        return res.status(403).json({ error: "email not found" });
    }

    const key = buildKey("resetpasswordconfirm", ip, email);
    const { allowed, count, ttl } = await rateLimit(key, MAX_ATTEMPTS, MAX_WINDOW_SECONDS);

    if (!allowed) {
        await AuditLogFunction(null, "RATE_LIMIT_BLOCKED", req, { key, email, ip, bucketCount: count });
        return res.status(429).json({
            error: "Too many reset attempts, try again later",
            retryAfter: Math.ceil(ttl / 60)
        });
    }

    next();
};

// MFA verify rate limiter
export const mfaVerifyRateLimit = async (req, res, next) => {
    const ip = getIp(req);
    const userId = req?.user?._id?.toString() || req?.body?.userId || null;

    if (!userId) {
        return res.status(400).json({ error: "User ID required for rate limiting" });
    }

    const key = `mfaverify:${userId}:${ip}`;
    const { allowed, count, ttl } = await rateLimit(key, MAX_ATTEMPTS, MAX_WINDOW_SECONDS);

    if (!allowed) {
        await AuditLogFunction(userId, "RATE_LIMIT_BLOCKED", req, { key, ip, bucketCount: count });
        return res.status(429).json({
            error: "Too many MFA verify attempts, try again later",
            retryAfter: Math.ceil(ttl / 60)
        });
    }

    next();
};