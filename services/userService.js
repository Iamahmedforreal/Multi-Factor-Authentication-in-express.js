import User from "../models/user.js";

class UserService {
    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>} - User object or null
     */
    async findByEmail(email) {
        return await User.findOne({ email: email.toUpperCase() });
    }

    /**
     * Find user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} - User object or null
     */
    async findById(userId) {
        return await User.findById(userId);
    }

    /**
     * Get user status (email verified, MFA active, etc.)
     * @param {Object} user - User object
     * @param {number} activeSessionCount - Number of active sessions
     * @returns {Object} - User status
     */
    getUserStatus(user, activeSessionCount) {
        return {
            email: user.email,
            emailVerified: user.emailVerified,
            mfaActive: user.MfaActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            activeSessions: activeSessionCount
        };
    }

    /**
     * Update user's last login timestamp
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    async updateLastLogin(userId) {
        await User.updateOne(
            { _id: userId },
            { lastLogin: new Date() }
        );
    }

    /**
     * Check if email is verified
     * @param {Object} user - User object
     * @returns {boolean} - True if verified
     */
    isEmailVerified(user) {
        return user.emailVerified === true;
    }

    /**
     * Check if MFA is active
     * @param {Object} user - User object
     * @returns {boolean} - True if MFA active
     */
    isMfaActive(user) {
        return user.MfaActive === true && !!user.TwoFactorSecret;
    }

    /**
     * Get user count (for admin purposes)
     * @returns {Promise<number>} - Total user count
     */
    async getTotalUserCount() {
        return await User.countDocuments();
    }

    /**
     * Get verified user count
     * @returns {Promise<number>} - Verified user count
     */
    async getVerifiedUserCount() {
        return await User.countDocuments({ emailVerified: true });
    }

    /**
     * Get MFA enabled user count
     * @returns {Promise<number>} - MFA enabled user count
     */
    async getMfaEnabledUserCount() {
        return await User.countDocuments({ MfaActive: true });
    }

    /**
     * Search users by email pattern (admin function)
     * @param {string} emailPattern - Email search pattern
     * @param {number} limit - Result limit
     * @returns {Promise<Array>} - Array of users
     */
    async searchByEmail(emailPattern, limit = 10) {
        return await User.find({
            email: { $regex: emailPattern, $options: 'i' }
        })
            .select('email emailVerified MfaActive createdAt lastLogin')
            .limit(limit);
    }

    /**
     * Safely get user public profile (no sensitive data)
     * @param {Object} user - User object
     * @returns {Object} - Public user data
     */
    getPublicProfile(user) {
        return {
            id: user._id,
            email: user.email,
            emailVerified: user.emailVerified,
            mfaActive: user.MfaActive,
            createdAt: user.createdAt
        };
    }
}

export default new UserService();
