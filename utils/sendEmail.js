
import emailService from '../services/emailService.js';

export const sendEmailVerification = async (email, token) => {
    return await emailService.sendEmailVerification(email, token);
}

export const sendEmailResetPassword = async (email, token) => {
    return await emailService.sendPasswordResetEmail(email, token);
}

export const sendWarningEmail = async (email, action, meta = {}) => {
    return await emailService.sendSecurityWarning(email, action, meta);
}

export const sendLoginAlertEmail = async (email, action, meta = {}) => {
    return await emailService.sendNewDeviceLoginAlert(email, action, meta);
}

// Export service for direct access
export default emailService;
