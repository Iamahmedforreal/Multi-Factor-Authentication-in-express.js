
import emailService from '../services/emailService.js';
// Utility functions to send different types of emails
export const sendEmailVerification = async (email, token) => {
    return await emailService.sendEmailVerification(email, token);
}
//send password reset email
export const sendEmailResetPassword = async (email, token) => {
    return await emailService.sendPasswordResetEmail(email, token);
}
//send security warning email
export const sendWarningEmail = async (email, action, meta = {}) => {
    return await emailService.sendSecurityWarning(email, action, meta);
}
//send new device login alert email
export const sendLoginAlertEmail = async (email, action, meta = {}) => {
    return await emailService.sendNewDeviceLoginAlert(email, action, meta);
}

// Export service for direct access
export default emailService;
