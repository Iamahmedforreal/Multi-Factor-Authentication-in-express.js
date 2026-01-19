import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:7000';

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    /**
     * Send email verification link
     * @param {string} email - Recipient email
     * @param {string} token - Verification token
     * @returns {Promise<void>}
     */
    async sendEmailVerification(email, token) {
        const link = `${BASE_URL}/api/auth/verify-email?token=${token}`;

        await this.transporter.sendMail({
            to: email,
            subject: "Verify Your Email Address",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Email Verification</h2>
                    <p>Thank you for registering! Please verify your email address by clicking the link below:</p>
                    <p>
                        <a href="${link}" 
                           style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 4px; display: inline-block;">
                            Verify Email
                        </a>
                    </p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="color: #666; word-break: break-all;">${link}</p>
                    <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        });
    }

    /**
     * Send password reset email
     * @param {string} email - Recipient email
     * @param {string} token - Reset token
     * @returns {Promise<void>}
     */
    async sendPasswordResetEmail(email, token) {
        const link = `${BASE_URL}/api/auth/reset-password?token=${token}`;

        await this.transporter.sendMail({
            to: email,
            subject: "Password Reset Request",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset</h2>
                    <p>You requested to reset your password. Click the link below to proceed:</p>
                    <p>
                        <a href="${link}" 
                           style="background-color: #2196F3; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 4px; display: inline-block;">
                            Reset Password
                        </a>
                    </p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="color: #666; word-break: break-all;">${link}</p>
                    <p style="color: #999; font-size: 12px;">This link will expire in 15 minutes.</p>
                    <p style="color: #ff5722; font-size: 14px;">
                        <strong>Security Warning:</strong> If you didn't request this password reset, 
                        please ignore this email and consider changing your password.
                    </p>
                </div>
            `
        });
    }

    /**
     * Send security warning email (new device, suspicious activity)
     * @param {string} email - Recipient email
     * @param {string} action - Action type
     * @param {Object} meta - Metadata (ip, device, etc.)
     * @returns {Promise<void>}
     */
    async sendSecurityWarning(email, action, meta = {}) {
        const ip = meta?.ip || 'unknown';
        const deviceInfo = meta?.device || 'unknown';

        await this.transporter.sendMail({
            to: email,
            subject: "Security Alert - Unusual Activity Detected",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ff5722;">Security Alert</h2>
                    <p>We detected unusual activity on your account:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>Action:</strong> ${action}</p>
                        <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ip}</p>
                        <p style="margin: 5px 0;"><strong>Device:</strong> ${deviceInfo}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toUTCString()}</p>
                    </div>
                    <p style="color: #ff5722;">
                        <strong>If this wasn't you, your account may be compromised.</strong>
                    </p>
                    <p>Recommended actions:</p>
                    <ul>
                        <li>Change your password immediately</li>
                        <li>Enable two-factor authentication if not already enabled</li>
                        <li>Review your recent account activity</li>
                    </ul>
                </div>
            `
        });
    }

    /**
     * Send new device login notification
     * @param {string} email - Recipient email
     * @param {string} action - Action type
     * @param {Object} meta - Metadata
     * @returns {Promise<void>}
     */
    async sendNewDeviceLoginAlert(email, action, meta = {}) {
        const ip = meta?.ip || 'unknown';
        const deviceInfo = meta?.device || 'unknown';

        await this.transporter.sendMail({
            to: email,
            subject: "New Device Login Detected",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2196F3;">New Device Login</h2>
                    <p>A new login to your account was detected from:</p>
                    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ip}</p>
                        <p style="margin: 5px 0;"><strong>Device:</strong> ${deviceInfo}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toUTCString()}</p>
                    </div>
                    <p>If this was you, you can safely ignore this email.</p>
                    <p style="color: #ff5722;">
                        If this wasn't you, please change your password immediately and enable 
                        two-factor authentication.
                    </p>
                </div>
            `
        });
    }

    /**
     * Verify email service configuration
     * @returns {Promise<boolean>}
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            console.error("Email service verification failed:", error);
            return false;
        }
    }
}

export default new EmailService();
