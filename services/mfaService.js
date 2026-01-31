import speakeasy from "speakeasy";
import qrCode from "qrcode";
import RefreshTokenModel from "../models/token.js";
import { mfaVerifySchema } from "../validators/registerValidation.js";
import { AuditLogFunction } from "../utils/helper.js";

class MfaService {
    /**
     * Setup MFA for a user (generate secret and QR code)
     * @param {Object} user - User object
     * @param {Object} req - Request object for audit logging
     * @returns {Promise<Object>} - QR code and setup info
     */
    async setupMfa(user, req) {
        if (user.MfaActive && user.TwoFactorSecret) {
            throw new Error("MFA_ALREADY_SETUP");
        }

        const secret = speakeasy.generateSecret({
            issuer: "authentication-service",
            name: `${user.email}`,
            length: 20
        });

        user.TwoFactorSecret = secret.base32;
        await user.save();

        const url = speakeasy.otpauthURL({
            secret: secret.base32,
            label: `${user.email}`,
            issuer: "authenticatorApp",
            encoding: "base32",
        });

        const qrImage = await qrCode.toDataURL(url);

         AuditLogFunction(user._id, "MFA_SETUP_INITIATED", req);

        return {
            qrImage,
            secret: secret.base32,
            message: "MFA setup initiated. Scan QR code with your authenticator app."
        };
    }

    /**
     * Verify MFA setup with TOTP code
     * @param {Object} user - User object
     * @param {string} code - TOTP code
     * @param {Object} req - Request object
     * @returns {Promise<Object>} - Verification result
     */
    async verifyMfaSetup(user, code, req) {
        const { token } = mfaVerifySchema.parse({ token: code });

        if (!user.TwoFactorSecret) {
            throw new Error("MFA_NOT_SETUP");
        }

        const verified = speakeasy.totp.verify({
            secret: user.TwoFactorSecret,
            encoding: "base32",
            token: token,
            window: 2 // Allow 2 time steps before/after for clock skew
        });

        if (!verified) {
            await AuditLogFunction(user._id, "MFA_SETUP_FAILED", req);
            throw new Error("INVALID_MFA_CODE");
        }

        user.MfaActive = true;
        await user.save();

        AuditLogFunction(user._id, "MFA_ENABLED", req);

        return {
            success: true,
            message: "MFA verified and enabled successfully"
        };
    }

    /**
     * Verify MFA code during login
     * @param {Object} user - User object
     * @param {string} code - TOTP code
     * @param {Object} req - Request object
     * @returns {Promise<Object>} - Verification result
     */
    async verifyMfaLogin(user, code, req) {
        if (!user.MfaActive) {
            throw new Error("MFA_NOT_ENABLED");
        }

        const verified = speakeasy.totp.verify({
            secret: user.TwoFactorSecret,
            encoding: "base32",
            token: code,
            window: 2
        });

        if (!verified) {
            await AuditLogFunction(user._id, "MFA_VERIFY_FAILED", req);
            throw new Error("INVALID_MFA_CODE");
        }

        await AuditLogFunction(user._id, "LOGIN_MFA_VERIFIED", req);

        return {
            success: true,
            message: "MFA verified successfully"
        };
    }

    /**
     * Reset/disable MFA for a user
     * @param {Object} user - User object
     * @param {Object} req - Request object
     * @returns {Promise<Object>} - Reset result
     */
    async resetMfa(user, req) {
        if (!user.MfaActive) {
            throw new Error("MFA_NOT_ENABLED");
        }

        user.TwoFactorSecret = "";
        user.MfaActive = false;
        await user.save();

        // Revoke all sessions when MFA is disabled (security measure)
        await RefreshTokenModel.deleteMany({ userId: user._id });

        AuditLogFunction(user._id, "MFA_DISABLED", req);

        return {
            success: true,
            message: "MFA has been disabled. All sessions have been logged out. Please log in again."
        };
    }

    /**
     * Check if user has MFA enabled
     * @param {Object} user - User object
     * @returns {boolean} - MFA status
     */
    isMfaEnabled(user) {
        return user.MfaActive === true && !!user.TwoFactorSecret;
    }
}

export default new MfaService();
