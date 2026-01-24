import RefreshTokenModel from "../models/token.js";
import { AuditLogFunction, getDeviceInfo, genrateFingerPrint } from "../utils/helper.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { redis } from "../utils/radis.js";
import tokenService from "./tokenService.js";


const MAX_ACTIVE_SESSIONS = 5;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

class SessionService {
    /**
     * Save refresh token to database
     * @param {string} userId - User ID
     * @param {string} token - Refresh token
     * @returns {Promise<Object>} - Saved token to radis
     */
    async saveRefreshToken(userId , token) {
        const hashed = crypto.createHash("sha256").update(token).digest("hex");
        
        
        const decoded = tokenService.decodeToken(token);
        const jti = decoded?.jti;

        if (!jti) {
            throw new Error('Invalid refresh token: missing jti');
        }

        await redis.setex(`refresh:${userId}:${jti}`, 60 * 60 * 24 * 30, hashed);
    }
    /**
     * Check and manage active sessions (enforce max session limit)
     * @param {string} userId - User ID
     * @returns {Promise<number>} - Number of active sessions
     */
    async manageActiveSessions(userId) {
        const activeSessions = await this.getActiveSessions(userId);
    }

    /**
     * Check if device is new for this user
     * @param {string} userId - User ID
     * @param {string} fingerPrint - Device fingerprint
     * @returns {Promise<boolean>} - True if new device
     */
    async isNewDevice(userId, fingerPrint) {
        const existingDevice = await RefreshTokenModel.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            fingerPrint: fingerPrint
        });

        return !existingDevice;
    }

    /**
     * Get all active sessions for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - Array of active sessions
     */
    async getActiveSessions(userId) {
        return await RefreshTokenModel.find({
            userId,
            expiresAt: { $gt: Date.now() }
        }).sort({ createdAt: -1 });
    }

    /**
     * Revoke a specific session
     * @param {string} userId - User ID
     * @param {string} tokenId - Token document ID
     * @param {Object} req - Request object
     * @returns {Promise<boolean>} - True if revoked
     */
    async revokeSession(userId, tokenId, req) {
        const result = await RefreshTokenModel.deleteOne({
            _id: tokenId,
            userId
        });

        if (result.deletedCount > 0) {
            await AuditLogFunction(userId, "SESSION_REVOKED", req, { tokenId });
            return true;
        }
        return false;
    }

    /**
     * Revoke all sessions for a user
     * @param {string} userId - User ID
     * @param {Object} req - Request object
     * @returns {Promise<number>} - Number of sessions revoked
     */
    async revokeAllSessions(userId, req) {
        const result = await RefreshTokenModel.deleteMany({ userId });

        if (result.deletedCount > 0) {
            await AuditLogFunction(userId, "ALL_SESSIONS_REVOKED", req, {
                count: result.deletedCount
            });
        }

        return result.deletedCount;
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
        const IncomingToken = crypto.createHash("sha256").update(token).digest("hex");

        if (storedHash !== IncomingToken) {
            throw new Error("INVALID_REFRESH_TOKEN");
        }
        return { userId, jti }
        
    }

    /**
     * Delete a specific refresh token
     * @param {string} tokenId - Token document ID
     * @returns {Promise<boolean>} - True if deleted
     */
    async deleteToken(tokenId) {
        const result = await RefreshTokenModel.deleteOne({ _id: tokenId });
        return result.deletedCount > 0;
    }

    /**
     * Clean up expired tokens (should be run periodically)
     * @returns {Promise<number>} - Number of deleted tokens
     */
    async cleanupExpiredTokens() {
        const result = await RefreshTokenModel.deleteMany({
            expiresAt: { $lt: new Date() }
        });

        return result.deletedCount;
    }

    /**
     * Get session statistics for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Session statistics
     */
    async getSessionStats(userId) {
        const sessions = await this.getActiveSessions(userId);
        const totalSessions = sessions.length;

        const deviceBreakdown = sessions.reduce((acc, session) => {
            const device = session.device || 'unknown';
            acc[device] = (acc[device] || 0) + 1;
            return acc;
        }, {});

        return {
            totalActiveSessions: totalSessions,
            maxAllowedSessions: MAX_ACTIVE_SESSIONS,
            deviceBreakdown,
            sessions: sessions.map(s => ({
                id: s._id,
                device: s.device,
                ip: s.ip_address,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt
            }))
        };
    }

    /**
     * Update session last seen timestamp
     * @param {string} tokenId - Token document ID
     * @returns {Promise<void>}
     */
    async updateLastSeen(tokenId) {
        await RefreshTokenModel.updateOne(
            { _id: tokenId },
            { lastSeenAt: new Date() }
        );
    }
}

export default new SessionService();
