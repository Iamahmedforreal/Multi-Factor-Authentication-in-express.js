import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/user.js";
import { registerSchema, loginSchema, emailSchema } from "../validators/registerValidation.js";
import { AuditLogFunction, recodLastLoginAttempt, checkAccountLogout } from "../utils/helper.js";
import emailService from "./emailService.js";

const EMAIL_VERIFICATION_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours
const BCRYPT_ROUNDS = 12; 

class AuthService {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @param {Object} req - Request object for audit logging
     * @returns {Promise<Object>} - Registration result
     */
    async register(userData, req) {
        // Validate input
        const data = registerSchema.parse(userData);
        const { email, password } = data;

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toUpperCase() });
        if (existingUser) {
            throw new Error("USER_ALREADY_EXISTS");
        }

        // Hash password with increased rounds
        const hashpassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Generate email verification token
        const token = crypto.randomBytes(32).toString("hex");
        const hashToken = crypto.createHash("sha256").update(token).digest("hex");

        // Create new user
        const newUser = new User({
            email: email.toUpperCase(),
            password: hashpassword,
            emailVerificationToken: hashToken,
            emailVerificationTokenExpires: Date.now() + EMAIL_VERIFICATION_EXPIRY,
            MfaActive: false,
            TwoFactorSecret: ""
        });

        await newUser.save();

        // Audit log
        AuditLogFunction(newUser._id, "USER_REGISTERED", req, { email: newUser.email });

        // Send verification email (non-blocking)
        emailService.sendEmailVerification(newUser.email, token).catch((err) => {
            console.error("Error sending verification email:", err);
        });

        return {
            success: true,
            message: "User created successfully. Please verify your email."
        };
    }

    /**
     * Verify user email with token
     * @param {string} token - Verification token
     * @param {Object} req - Request object for audit logging
     * @returns {Promise<Object>} - Verification result
     */
    async verifyEmail(token, req) {
        const hashToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            emailVerificationToken: hashToken,
            emailVerificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            throw new Error("INVALID_OR_EXPIRED_TOKEN");
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationTokenExpires = undefined;

        await user.save();
        await AuditLogFunction(user._id, "EMAIL_VERIFIED", req);

        return {
            success: true,
            message: "Email verified successfully"
        };
    }

    /**
     * Resend email verification
     * @param {string} email - User email
     * @param {Object} req - Request object for audit logging
     * @returns {Promise<Object>} - Result
     */
    async resendEmailVerification(email, req) {
        const validatedData = emailSchema.parse({ email });
        const user = await User.findOne({ email: validatedData.email.toUpperCase() });

        if (!user) {
            throw new Error("USER_NOT_FOUND");
        }

        if (user.emailVerified) {
            throw new Error("EMAIL_ALREADY_VERIFIED");
        }

        const token = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        user.emailVerificationToken = hashedToken;
        user.emailVerificationTokenExpires = Date.now() + EMAIL_VERIFICATION_EXPIRY;
        await user.save();

        await emailService.sendEmailVerification(user.email, token).catch((err) => {
            console.error("Error sending email:", err);
        });

        await AuditLogFunction(user._id, "EMAIL_VERIFICATION_SENT", req);

        return {
            success: true,
            message: "Verification email sent successfully"
        };
    }

    /**
     * Validate login credentials and check account status
     * @param {Object} user - User object from passport
     * @param {Object} req - Request object
     * @returns {Promise<Object>} - Validation result
     */
    async validateLogin(user, ip) {
        // Check account lockout
        const lockedOut = await checkAccountLogout(user.email, ip);

        if (lockedOut.locked) {
            await recodLastLoginAttempt(user._id, ip, user.email, false);
            throw new Error(`ACCOUNT_LOCKED:${lockedOut.minutesRemaining}`);
        }

        // Check email verification
        if (!user.emailVerified) {
            await recodLastLoginAttempt(user._id, ip, user.email, false);
            throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Record successful login attempt
        await recodLastLoginAttempt(user._id, ip, user.email, true);

        return {
            success: true,
            user,
            requiresMfa: user.MfaActive
        };
    }

    /**
     * Initiate password reset process
     * @param {string} email - User email
     * @param {Object} req - Request object
     * @returns {Promise<Object>} - Result
     */
    async forgotPassword(email, req) {
        // Always return success to prevent user enumeration
        const user = await User.findOne({ email: email.toUpperCase() });

        if (user) {
            const token = crypto.randomBytes(32).toString("hex");
            const hashToken = crypto.createHash("sha256").update(token).digest("hex");

            user.resetPasswordToken = hashToken;
            user.resetPasswordTokenExpires = Date.now() + 1000 * 60 * 15; // 15 minutes
            await user.save();

            await AuditLogFunction(user._id, "PASSWORD_RESET_REQUESTED", req);
            await emailService.sendPasswordResetEmail(user.email, token);
        }

        // Generic response to prevent enumeration
        return {
            success: true,
            message: "If that email exists, a password reset link has been sent"
        };
    }

    /**
     * Reset password with token
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     * @param {string} confirmPassword - Password confirmation
     * @param {Object} req - Request object
     * @returns {Promise<Object>} - Result
     */
    async resetPassword(token, newPassword, confirmPassword, req) {
        if (newPassword !== confirmPassword) {
            throw new Error("PASSWORDS_DO_NOT_MATCH");
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            await AuditLogFunction(null, "PASSWORD_RESET_FAILED", req, { hashedToken });
            throw new Error("INVALID_OR_EXPIRED_TOKEN");
        }

        user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpires = undefined;
        await user.save();

        await AuditLogFunction(user._id, "PASSWORD_RESET_COMPLETED", req);

        return {
            success: true,
            message: "Password reset successfully"
        };
    }

    /**
     * Change password for authenticated user
     * @param {Object} user - Current user
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @param {string} confirmPassword - Password confirmation
     * @param {Object} req - Request object
     * @returns {Promise<Object>} - Result
     */
    async changePassword(user, currentPassword, newPassword, confirmPassword, req) {
        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error("ALL_FIELDS_REQUIRED");
        }

        if (newPassword !== confirmPassword) {
            throw new Error("PASSWORDS_DO_NOT_MATCH");
        }

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            await AuditLogFunction(user._id, "PASSWORD_CHANGE_FAILED", req);
            throw new Error("INVALID_CURRENT_PASSWORD");
        }

        user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await user.save();

        await AuditLogFunction(user._id, "PASSWORD_CHANGED", req);

        return {
            success: true,
            message: "Password changed successfully"
        };
    }
}

export default new AuthService();
