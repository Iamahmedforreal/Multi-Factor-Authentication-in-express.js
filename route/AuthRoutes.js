import express from "express";
import passport from "passport";
const router = express.Router();
import globalratelimiter from "../middleware/ratelimiter.js";

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
    logoutAllSessions

} from "../controller/authController.js";

//pulic route
router.post("/register",register);
router.post("/logout", logout);
router.get("/verify-email" , verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password" , resetPassword);
router.post("/login", globalratelimiter ,passport.authenticate('local' , {session: false}), login);

//private route
router.get("/status", passport.authenticate('jwt', {session:false}), userStatus);
router.post("/2fa/setup" , passport.authenticate('jwt', {session:false}), mfa);
router.post("/2fa/login/verify" ,globalratelimiter ,  passport.authenticate('temp-jwt', {session:false}), verifyLogin)
router.post("/2fa/setup/verify" ,globalratelimiter ,  passport.authenticate('jwt', {session:false}), verifySetup)
router.post("/2fa/reset", passport.authenticate('jwt',{session:false}) ,resetmfa);
router.get("/refresh" , globalratelimiter, refresh);

router.post("/change-password" , passport.authenticate('jwt', {session:false}), changePassword);
router.post("/logout-all" , passport.authenticate('jwt', {session:false}), logoutAllSessions);


export default router;
