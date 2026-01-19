import express from "express";
import passport from "passport";

import {
    loginRatelimit,
    refreshratelimit,
    resetPasswordConfirmRatelimit,
    forgetpasswordratelimit,
    mfaVerifyRatelimit
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
router.post("/login", loginRatelimit, passport.authenticate('local', { session: false }), login);
router.post("/logout", logout);
router.get("/refresh", refreshratelimit, refresh);

// Password Management
router.post("/forgot-password", forgetpasswordratelimit, forgotPassword);
router.post("/reset-password", resetPasswordConfirmRatelimit, resetPassword);


// PROTECTED ROUTES (JWT Required)


// User Status
router.get("/status", passport.authenticate('jwt', { session: false }), userStatus);

// Password Change
router.post("/change-password", passport.authenticate('jwt', { session: false }), changePassword);

// Session Management
router.post("/logout-all", passport.authenticate('jwt', { session: false }), logoutAllSessions);

// MFA Setup & Management
router.post("/2fa/setup", passport.authenticate('jwt', { session: false }), setupMfa);
router.post("/2fa/setup/verify", passport.authenticate('jwt', { session: false }), mfaVerifyRatelimit, verifyMfaSetup);
router.post("/2fa/reset", passport.authenticate('jwt', { session: false }), resetMfa);


// PROTECTED ROUTES (Temporary JWT for MFA)


// MFA Login Verification
router.post("/2fa/login/verify", passport.authenticate('temp-jwt', { session: false }), mfaVerifyRatelimit, verifyMfaLogin);

export default router;
