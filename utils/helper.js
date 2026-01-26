
import AuditLog from "../models/AuditLog.js";
import loginAttempt from "../models/loginAttempt.js";
import crypto from "crypto";

const LOCK_OUT_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPT = 5;


/**
 * Extract IP address from request
 * 
 */
export const getIp = (req) => {
    return (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()) || req?.ip || 'unknown';
};

/**
 * Extract device information from request
 */
export const getDeviceInfo = (req) => {
    return req?.headers?.['user-agent'] || 'unknown';
};

/**
 * Generate device fingerprint hash
 */
export const genrateFingerPrint = (userId, deviceInfo) => {

    const fingerPrint = `${userId}|${deviceInfo}`;
    return crypto.createHash('sha256').update(fingerPrint).digest('hex');
};


// AUDIT LOGGING


/**
 * Create audit log entry
 */
export const AuditLogFunction = async (userId, action, req, metadata = {}) => {
    const ip_address = getIp(req);
    const device = getDeviceInfo(req);

    await AuditLog.create({
        userId,
        action,
        ip: ip_address,
        userAgent: device,
        metadata,
        timestamp: new Date()
    });
};


// LOGIN ATTEMPT TRACKING


/**
 * Record login attempt (success or failure)
 */
export const recodLastLoginAttempt = async (userId, ip, email, successfull) => {
    await loginAttempt.create({
        userId,
        email: email.toLowerCase(),
        ip,
        successfull,
        timestamp: new Date()
    });
};

/**
 * Check if account is locked due to failed login attempts
 * Returns: { locked: boolean, minutesRemaining?: number }
 */
export const checkAccountLogout = async (email, ip) => {
    // Find recent failed login attempts by email or IP
    const failedLoginAttempts = await loginAttempt.find({
        $or: [{ email }, { ip }],
        timestamp: { $gte: new Date(Date.now() - LOCK_OUT_DURATION) },
        successfull: false
    });

    // Check if exceeded max attempts
    if (failedLoginAttempts.length >= MAX_LOGIN_ATTEMPT) {
        // Get most recent attempt
        const recentAttempt = recentLoginAttempts.sort((a, b) => b.timestamp - a.timestamp)[0];

        // Calculate remaining lockout time
        const timeRemaining = Math.ceil((LOCK_OUT_DURATION - (Date.now() - recentAttempt.timestamp)) / 60000);

        return {
            locked: true,
            minutesRemaining: timeRemaining > 0 ? timeRemaining : 1
        };
    }

    return {
        locked: false
    };
};


// RATE LIMITING HELPERS


/**
 * Build rate limit key
 */
export const buildKey = (action, ip, email) => {
    return `${action}:${ip}:${email}`;
};

