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
    resetmfa
} from "../controller/authController.js";

router.post("/register",register);
router.post("/login", passport.authenticate('local' , {session: false}), login);
router.get("/logout", logout);
router.get("/status", passport.authenticate('jwt', {session:false}), userStatus);
router.post("/2fa/setup", mfa);
router.post("/2fa/verify", verify);
router.post("/2fa/reset", resetmfa);

export default router;
