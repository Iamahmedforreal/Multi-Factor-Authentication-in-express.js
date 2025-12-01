import express from "express";
const router = express.Router();

import { 
    login,
    register,
    logout,
    userStatus,
    mfa,
    verify,
    resetmfa
} from "../controllers/authController.js";

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/status", userStatus);
router.post("/2fa/setup", mfa);
router.post("/2fa/verify", verify);
router.post("/2fa/reset", resetmfa);

export default router;
