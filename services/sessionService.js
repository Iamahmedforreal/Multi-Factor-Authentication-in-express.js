import { AuditLogFunction } from "../utils/helper.js";
import crypto from "crypto";
import { redis } from "../utils/radis.js";
import tokenService from "./tokenService.js";


const MAX_ACTIVE_SESSIONS = 5;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

class SessionService {
    /**
     * Save refresh token and session metadata to Redis
     */
    async saveRefreshToken(userId, token, ip, deviceInfo, fingerPrint) {
        const decoded = tokenService.decodeToken(token);
        const jti = decoded?.jti;
        if (!jti) throw new Error('Invalid refresh token: missing jti');

        const hashed = crypto.createHash("sha256").update(token).digest("hex");
        const tokenKey = `refresh:${userId}:${jti}`;
        const userSessionsKey = `user:sessions:${userId}`;
        const ttl = 60 * 60 * 24 * 30; // 30 days

        const sessionMetadata = {
            jti,
            userId,
            ip,
            device: deviceInfo,
            fingerPrint,
            hashedToken: hashed,
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString()
        };

        // Use a pipeline for atomic write
        const pipeline = redis.pipeline();
        pipeline.setex(tokenKey, ttl, JSON.stringify(sessionMetadata));
        pipeline.sadd(userSessionsKey, jti);
        pipeline.expire(userSessionsKey, ttl);
        await pipeline.exec();

        // Register device as "known"
        if (fingerPrint) {
            await redis.sadd(`known_devices:${userId}`, fingerPrint);
            await redis.expire(`known_devices:${userId}`, 60 * 60 * 24 * 180); // 180 days
        }
    }

    /**
     * Manage active sessions (enforce limit)
     */
    async manageActiveSessions(userId) {
        const userSessionsKey = `user:sessions:${userId}`;
        const sessionIds = await redis.smembers(userSessionsKey);

        if (sessionIds.length >= MAX_ACTIVE_SESSIONS) {
            // In a real senior app, we'd sort by lastSeen and remove oldest
            // For now, let's remove the first one found
            const oldestJti = sessionIds[0];
            await this.deleteToken(userId, oldestJti);
        }

        return sessionIds.length;
    }

    /**
     * Check if device is new for this user (using Redis Set)
     */
    async isNewDevice(userId, fingerPrint) {
        if (!fingerPrint) return true;
        const isMember = await redis.sismember(`known_devices:${userId}`, fingerPrint);
        return !isMember;
    }

    /**
     * Get all active sessions for a user
     */
    async getActiveSessions(userId) {
        const userSessionsKey = `user:sessions:${userId}`;
        const sessionIds = await redis.smembers(userSessionsKey);

        const sessions = [];
        for (const jti of sessionIds) {
            const data = await redis.get(`refresh:${userId}:${jti}`);
            if (data) {
                sessions.push(JSON.parse(data));
            } else {
                // Cleanup orphaned entry in Set
                await redis.srem(userSessionsKey, jti);
            }
        }
        return sessions;
    }

    /**
     * Revoke a specific session
     */
    async revokeSession(userId, jti, req) {
        const success = await this.deleteToken(userId, jti);
        if (success) {
            await AuditLogFunction(userId, "SESSION_REVOKED", req, { jti });
            return true;
        }
        return false;
    }

    /**
     * Revoke all sessions for a user
     */
    async revokeAllSessions(userId, req) {
        const userSessionsKey = `user:sessions:${userId}`;
        const sessionIds = await redis.smembers(userSessionsKey);

        if (sessionIds.length === 0) return 0;

        const pipeline = redis.pipeline();
        for (const jti of sessionIds) {
            pipeline.del(`refresh:${userId}:${jti}`);
        }
        pipeline.del(userSessionsKey);
        await pipeline.exec();

        await AuditLogFunction(userId, "ALL_SESSIONS_REVOKED", req, {
            count: sessionIds.length
        });

        return sessionIds.length;
    }

    /**
     * Validate and get refresh token from database
     * @param {string} token - Refresh token string
     * @returns {Promise<Object>} - Token document
     * @throws {Error} - If token invalid or expired
     */
    async validateRefreshToken(token) {
        const decoded = tokenService.decodeToken(token);
        const jti = decoded?.jti;
        const userId = decoded?.id;

        if (!jti || !userId) {
            throw new Error("INVALID_REFRESH_TOKEN_FORMAT");
        }

        const tokenKey = `refresh:${userId}:${jti}`;
        const storedHash = await redis.get(tokenKey);

        if (!storedHash) {
            throw new Error("REFRESH_TOKEN_EXPIRED_OR_INVALID");
        }
        const IncomingToken = crypto.createHash("sha256").update(token).digest("hex");

        if (storedHash !== IncomingToken) {
            throw new Error("INVALID_REFRESH_TOKEN");
        }
        return { userId, jti }

    }

    /**
     * Delete a specific refresh token from Redis
     */
    async deleteToken(userId, jti) {
        const tokenKey = `refresh:${userId}:${jti}`;
        const userSessionsKey = `user:sessions:${userId}`;

        const pipeline = redis.pipeline();
        pipeline.del(tokenKey);
        pipeline.srem(userSessionsKey, jti);
        const results = await pipeline.exec();

        // results[0][1] is the result of 'del'
        return results[0][1] > 0;
    }

    /**
     * Clean up expired tokens (Redis handles this automatically via TTL)
     */
    async cleanupExpiredTokens() {
        return 0; // No-op for Redis
    }

    /**
     * Get session statistics for a user
     */
    async getSessionStats(userId) {
        const sessions = await this.getActiveSessions(userId);

        const deviceBreakdown = sessions.reduce((acc, session) => {
            const device = session.device || 'unknown';
            acc[device] = (acc[device] || 0) + 1;
            return acc;
        }, {});

        return {
            totalActiveSessions: sessions.length,
            maxAllowedSessions: MAX_ACTIVE_SESSIONS,
            deviceBreakdown,
            sessions: sessions.map(s => ({
                id: s.jti,
                device: s.device,
                ip: s.ip,
                lastSeenAt: s.lastSeenAt,
                createdAt: s.createdAt
            }))
        };
    }

    /**
     * Update session last seen timestamp in Redis
     */
    async updateLastSeen(userId, jti) {
        const tokenKey = `refresh:${userId}:${jti}`;
        const data = await redis.get(tokenKey);
        if (data) {
            const session = JSON.parse(data);
            session.lastSeenAt = new Date().toISOString();
            await redis.set(tokenKey, JSON.stringify(session), 'KEEPTTL');
        }
    }
}

export default new SessionService();
