import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
import crypto from "crypto";
class TokenService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_SECRET;
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
        this.temporaryTokenSecret = process.env.JWT_TEMPOROY;
        this.accessTokenExpiry = process.env.JWT_EXPIRE || "7m";
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRE || "7d";
        this.temporaryTokenExpiry = process.env.JWT_TEMPOROY_EXPIRES_IN || "10m";

        // Validate required secrets on initialization
        if (!this.accessTokenSecret || !this.refreshTokenSecret || !this.temporaryTokenSecret) {
            throw new Error("JWT secrets not configured properly in environment variables");
        }
    }

    /**
     * Generate access token for authenticated users
     * @param {Object} user - User object
     * @returns {string} - JWT access token
     */
    generateAccessToken(user) {
        const payload = {
            id: user._id.toString(),
            email: user.email,
            type: "access-token"
        };

        return jwt.sign(payload, this.accessTokenSecret, {
            expiresIn: this.accessTokenExpiry,
            issuer: 'authentication-service',
            audience: 'api-access'
        });
    }

    /**
     * Generate refresh token for session management
     * @param {Object} user - User object
     * @returns {string} - JWT refresh token
     */
    generateRefreshToken(user) {

        const jti = crypto.randomBytes(16).toString("hex"); 

        const payload = {
            id: user._id.toString(),
            type: "refresh-token",
            jti
        };

        return jwt.sign(payload, this.refreshTokenSecret, {
            expiresIn: this.refreshTokenExpiry,
            issuer: 'authentication-service',
            audience: 'refresh-token'
        });
    }

    /**
     * Generate temporary token for MFA verification
     * @param {Object} user - User object
     * @returns {string} - JWT temporary token
     */
    generateTemporaryToken(user) {
        const payload = {
            id: user._id.toString(),
            type: "mfa-pending",
            requiresMfa: true
        };

        return jwt.sign(payload, this.temporaryTokenSecret, {
            expiresIn: this.temporaryTokenExpiry,
            issuer: 'authentication-service',
            audience: 'mfa-verification'
        });
    }

    /**
     * Verify access token
     * @param {string} token - JWT token
     * @returns {Object} - Decoded payload
     * @throws {Error} - If token is invalid
     */
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.accessTokenSecret, {
                issuer: 'authentication-service',
                audience: 'api-access'
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('ACCESS_TOKEN_EXPIRED');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('INVALID_ACCESS_TOKEN');
            }
            throw error;
        }
    }

    /**
     * Verify refresh token
     * @param {string} token - JWT token
     * @returns {Object} - Decoded payload
     * @throws {Error} - If token is invalid
     */
    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, this.refreshTokenSecret, {
                issuer: 'authentication-service',
                audience: 'refresh-token'
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('REFRESH_TOKEN_EXPIRED');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('INVALID_REFRESH_TOKEN');
            }
            throw error;
        }
    }

    /**
     * Verify temporary token
     * @param {string} token - JWT token
     * @returns {Object} - Decoded payload
     * @throws {Error} - If token is invalid
     */
    verifyTemporaryToken(token) {
        try {
            return jwt.verify(token, this.temporaryTokenSecret, {
                issuer: 'authentication-service',
                audience: 'mfa-verification'
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('TEMPORARY_TOKEN_EXPIRED');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('INVALID_TEMPORARY_TOKEN');
            }
            throw error;
        }
    }

    /**
     * @param {string} token - JWT token
     * @returns {Object|null} - Decoded payload or null
     */
    decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if token is expired
     * @param {string} token - JWT token
     * @returns {boolean} - True if expired
     */
    isTokenExpired(token) {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) {
            return true;
        }
        return Date.now() >= decoded.exp * 1000;
    }
}

export default new TokenService();
