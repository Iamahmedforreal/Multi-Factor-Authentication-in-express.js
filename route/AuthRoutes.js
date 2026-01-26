import express from "express";
import passport from "passport";

import {
    loginRateLimit,
    refreshRateLimit,
    resetPasswordConfirmRateLimit,
    forgotPasswordRateLimit,
    mfaVerifyRateLimit
} from "../middleware/ratelimiter.js";

import {
    login,
    register,
    logout,
    userStatus,
    setupMfa,
    resetMfa,
    refresh,
    verifyEmail,
    forgotPassword,
    resetPassword,
    verifyMfaLogin,
    verifyMfaSetup,
    changePassword,
    logoutAllSessions,
    resendEmailVerification
} from "../controller/authController.js";

const router = express.Router();


// PUBLIC ROUTES


// Registration & Email Verification
router.post("/register", register);
router.get("/verify-email", verifyEmail);
router.post("/resend-email-verify", resendEmailVerification);

// Authentication
router.post("/login", loginRateLimit, passport.authenticate('local', { session: false }), login);
router.post("/logout", logout);
router.get("/refresh", refreshRateLimit, refresh);

// Password Management
router.post("/forgot-password", forgotPasswordRateLimit, forgotPassword);
router.post("/reset-password", resetPasswordConfirmRateLimit, resetPassword);


// PROTECTED ROUTES (JWT Required)


// User Status
router.get("/status", passport.authenticate('jwt', { session: false }), userStatus);

// Password Change
router.post("/change-password", passport.authenticate('jwt', { session: false }), changePassword);

// Session Management
router.post("/logout-all", passport.authenticate('jwt', { session: false }), logoutAllSessions);

// MFA Setup & Management
router.post("/2fa/setup", passport.authenticate('jwt', { session: false }), setupMfa);
router.post("/2fa/setup/verify", passport.authenticate('jwt', { session: false }), mfaVerifyRateLimit, verifyMfaSetup);
router.post("/2fa/reset", passport.authenticate('jwt', { session: false }), resetMfa);


// PROTECTED ROUTES (Temporary JWT for MFA)


// MFA Login Verification
router.post("/2fa/login/verify", passport.authenticate('temp-jwt', { session: false }), mfaVerifyRateLimit, verifyMfaLogin);

export default router;
