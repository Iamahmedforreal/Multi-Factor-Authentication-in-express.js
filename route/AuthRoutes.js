import express from "express";
import passport from "passport";
const router = express.Router();

import { 
    login,
    register,
    logout,
    userStatus,
    mfa,
    verify,
    resetmfa,
    refresh,

} from "../controller/authController.js";


router.post("/register",register);
router.post("/login", passport.authenticate('local' , {session: false}), login);
router.post("/logout", logout);
router.get("/status", passport.authenticate('jwt', {session:false}), userStatus);
router.post("/2fa/setup" , passport.authenticate('jwt', {session:false}), mfa);
router.post("/2fa/verify" , passport.authenticate('jwt', {session:false}), verify)
router.post("/2fa/reset", passport.authenticate('jwt',{session:false}) ,resetmfa);
router.get("/refresh" ,refresh);

export default router;
