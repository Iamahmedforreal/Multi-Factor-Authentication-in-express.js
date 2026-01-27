
import { AuditLogFunction, generateFingerPrint } from "../utils/helper.js";
import crypto from "crypto";
import { redis } from "../utils/redis.js";
import tokenService from "./tokenService.js";


const MAX_ACTIVE_SESSIONS = 5;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

class SessionService {
    /**
     * Save refresh token and session metadata to redis
     * @param {string} userId - User ID
     * @param {string} token - Refresh token
     * @returns {Promise<Object>} - Saved token to redis
     */
    async saveRefreshToken(userId , token , ip, deviceInfo, fingerPrint) {
        
        
        
        const decoded = tokenService.decodeToken(token);
        const jti = decoded?.jti;
        const hashed = crypto.createHash("sha256").update(token).digest("hex");

        if (!jti) {
            throw new Error('Invalid refresh token: missing jti');
        }

        const tokenKey = `refresh:${userId}:${jti}`;
        const sessionKey = `session:${userId}:${jti}`;

        const ttl = 60 * 60 * 24 * 30; // 30 days

        const metadata = {
            jti,
            userId,
            ip , 
            device: deviceInfo,
            fingerPrint,
            hashedToken: hashed,
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
        }

        const pipeline = redis.pipeline();
        pipeline.setex(tokenKey, ttl, JSON.stringify(metadata));
        pipeline.sadd(sessionKey, jti);
        pipeline.expire(sessionKey, ttl);
        await pipeline.exec();

        if(fingerPrint){
             await redis.sadd(`known_devices:${userId}`, fingerPrint);
             await redis.expire(`known_devices:${userId}`, 60 * 60 * 24 * 180);
        }

       
    }
    /**
     * Check and manage active sessions (enforce max session limit)
     * @param {string} userId - User ID
     * @returns {Promise<number>} - Number of active sessions
     */
    async manageActiveSessions(userId) {
        
        const userSessionsKey = `user:sessions:${userId}`;
        const sessionIds = await redis.smembers(userSessionsKey);

        if (sessionIds.length >= MAX_ACTIVE_SESSIONS) {
            const oldestJti = sessionIds[0];
            await this.deleteToken(userId, oldestJti);
        }

        return sessionIds.length;
    
    }

    /**
     * Check if device is new for this user
     * @param {string} userId - User ID
     * @param {string} fingerPrint - Device fingerprint
     * @returns {Promise<boolean>} - True if new device
     */
       async isNewDevice(userId, fingerPrint) {
        if (!fingerPrint) return true;
        const isMember = await redis.sismember(`known_devices:${userId}`, fingerPrint);
        return !isMember
       }
       
    /**
     * Get all active sessions for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - Array of active sessions
     */
    async getActiveSessions(userId) {
     const userSessionsKey = `user:sessions:${userId}`;
     const sessionIds = await redis.smembers(userSessionsKey);

     const sessions = [];
     for (const jti of sessionIds) {
        const data = await redis.get(`refresh:${userId}:${jti}`);
        if (data) {
            sessions.push(JSON.parse(data));
        }else{
            await redis.srem(userSessionsKey, jti);
        }

     }
        return sessions;
    }

    /**
     * Revoke a specific session
     * @param {string} userId - User ID
     * @param {string} tokenId - Token document ID
     * @param {Object} req - Request object
     * @returns {Promise<boolean>} - True if revoked
     */
    async revokeSession(userId, jti, req) {
        const success = await this.deleteToken(userId, tokenId);
        if(success){
            AuditLogFunction(userId , "SESSION_REVOKE" , req , {jti})
        }
    }

    /**
     * Revoke all sessions for a user
     * @param {string} userId - User ID
     * @param {Object} req - Request object
     * @returns {Promise<number>} - Number of sessions revoked
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

        if (!storedHash){
            throw new Error("REFRESH_TOKEN_EXPIRED_OR_INVALID");
        }
        const metadata = JSON.parse(storedHash);
        const IncomingToken = crypto.createHash("sha256").update(token).digest("hex");

        if (metadata.hashedToken !== IncomingToken) {
            throw new Error("INVALID_REFRESH_TOKEN");
        }
        return { userId, jti }
        
    }

    /**
     * Delete a specific refresh token
     * @param {string} tokenId - Token document ID
     * @returns {Promise<boolean>} - True if deleted
     */
    async deleteToken(userId , jti) {
        const tokenKey = `refresh:${userId}:${jti}`;
        const sessionKey  = `session:${userId}`;

        const pipeline = redis.pipeline();
        pipeline.del(tokenKey);
        pipeline.srem(sessionKey, jti);
        const results = await pipeline.exec();
        // results[0][1] means del
        return results[0][1] > 0;
    
    }

}
export default new SessionService();
