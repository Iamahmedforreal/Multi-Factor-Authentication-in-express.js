import express from "express";
import passport from "passport";
const router = express.Router();

import {loginRatelimit , refreshratelimit} from "../middleware/ratelimiter.js"

import { 
    login,
    register,
    logout,
    userStatus,
    mfa,
    resetmfa,
    refresh,
    verifyEmail,
    forgotPassword,
    resetPassword,
    verifyLogin,
    verifySetup,
    changePassword,
    logoutAllSessions,
    resendEmailverify
    

} from "../controller/authController.js";

//pulic route
router.post("/register",register);
router.post("/logout", logout);
router.get("/verify-email" , verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password" , resetPassword);
router.get("/refresh" ,refreshratelimit , refresh);
router.post("/login" ,loginRatelimit,passport.authenticate('local' , {session: false}), login);
router.post("/resend-email-verify" , resendEmailverify);

//private route
router.get("/status", passport.authenticate('jwt', {session:false}), userStatus);
router.post("/2fa/setup" , passport.authenticate('jwt', {session:false}), mfa);
router.post("/2fa/login/verify" ,  passport.authenticate('temp-jwt', {session:false}), verifyLogin)
router.post("/2fa/setup/verify"  ,  passport.authenticate('jwt', {session:false}), verifySetup)
router.post("/2fa/reset", passport.authenticate('jwt',{session:false}) ,resetmfa);


router.post("/change-password" , passport.authenticate('jwt', {session:false}), changePassword);
router.post("/logout-all" , passport.authenticate('jwt', {session:false}), logoutAllSessions);


export default router;
