import express from "express";
import passport from "passport";
const router = express.Router();
import loginLimiter from "../middleware/bruteForceLimiter.js";

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


} from "../controller/authController.js";


router.post("/register",register);
router.post("/login", loginLimiter ,passport.authenticate('local' , {session: false}), login);
router.post("/logout", logout);
router.get("/status", passport.authenticate('jwt', {session:false}), userStatus);
router.post("/2fa/setup" , passport.authenticate('jwt', {session:false}), mfa);
router.post("/2fa/login/verify" , passport.authenticate('temp-jwt', {session:false}), verifyLogin)
router.post("/2fa/setup/verify" , passport.authenticate('jwt', {session:false}), verifySetup)
router.post("/2fa/reset", passport.authenticate('jwt',{session:false}) ,resetmfa);
router.get("/refresh" ,refresh);
router.get("/verify-email" , verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password" , resetPassword)

export default router;
