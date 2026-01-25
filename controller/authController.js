
import passport from "passport";
import { asyncHandler } from "../middleware/errorHandler.js";
import { authService, mfaService, sessionService, tokenService, userService, emailService } from "../services/index.js";
import { getDeviceInfo, genrateFingerPrint, getIp } from "../utils/helper.js";
import EventEmitter from "../middleware/eventEmmit.js";

const REFRESH_TOKEN_EXPIRY_DAYS = 7;


// REGISTRATION & EMAIL VERIFICATION


export const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, req);
    res.status(200).json(result);
});

export const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result = await authService.verifyEmail(token, req);
    res.status(200).json(result);
});

export const resendEmailVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.resendEmailVerification(email, req);
    res.status(200).json(result);
});


// LOGIN & AUTHENTICATION


export const login = asyncHandler(async (req, res) => {
    const user = req.user; // From passport middleware
    const ip = getIp(req);
    const deviceInfo = getDeviceInfo(req);

    // Validate login (email verification, account lockout)
    const validation = await authService.validateLogin(user, ip);

    // Manage active sessions (enforce max limit)
    await sessionService.manageActiveSessions(user._id);

    // Generate device fingerprint to check if this is a new device
    const fingerPrint = genrateFingerPrint(user._id, deviceInfo);
    const isNewDevice = await sessionService.isNewDevice(user._id, fingerPrint);

    // Check if MFA is: MFA enabled AND new device
    const requiresMfa = user.MfaActive && isNewDevice;

    if (requiresMfa) {
        const tempToken = tokenService.generateTemporaryToken(user);
        return res.status(200).json({
            success: true,
            message: "MFA verification required ",
            tempToken,
            isNewDevice: true
        });
    }

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    // Log new device login (even if no MFA required)
    if (isNewDevice) {
        EventEmitter.emit("NEW_LOGIN", {
            email: user.email,
            action: "NEW_LOGIN",
            meta: { ip, device: deviceInfo }
        });
    }

    // Save session
    await sessionService.saveRefreshToken(user._id, refreshToken, ip, deviceInfo, fingerPrint);

    // Set secure cookie
    res.cookie("refreshtoken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
        success: true,
        message: isNewDevice ? "Login successful from new device" : "Login successful",
        accessToken,
        isNewDevice
    });
});

export const logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshtoken;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            error: "No active session found"
        });
    }

    const tokenDoc = await sessionService.validateRefreshToken(refreshToken);
    await sessionService.deleteToken(user._id, tokenDoc.jti);

    res.clearCookie("refreshtoken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
});

export const logoutAllSessions = asyncHandler(async (req, res) => {
    const user = req.user;
    const count = await sessionService.revokeAllSessions(user._id, req);

    res.clearCookie("refreshtoken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
    });

    res.status(200).json({
        success: true,
        message: `Logged out from ${count} session(s) successfully`
    });
});


// TOKEN REFRESH

export const refresh = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshtoken;

    if (!refreshToken) {
        throw new Error("INVALID_REFRESH_TOKEN");
    }

    // Validate refresh token from database
    const tokenDoc = await sessionService.validateRefreshToken(refreshToken);

    // Verify JWT signature
    tokenService.verifyRefreshToken(refreshToken);

    // Get user
    const user = await userService.findById(tokenDoc.userId);
    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    // Generate new tokens
    const newAccessToken = tokenService.generateAccessToken(user);
    const newRefreshToken = tokenService.generateRefreshToken(user);

    // Save new refresh token
    const ip = getIp(req);
    const deviceInfo = getDeviceInfo(req);
    const fingerPrint = genrateFingerPrint(user._id, deviceInfo);
    await sessionService.saveRefreshToken(user._id, newRefreshToken, ip, deviceInfo, fingerPrint);

    // Delete old refresh token
    await sessionService.deleteToken(tokenDoc._id);

    // Update last seen
    res.cookie("refreshtoken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
        success: true,
        accessToken: newAccessToken,
        message: "Token refreshed successfully"
    });
});


// MULTI-FACTOR AUTHENTICATION


export const setupMfa = asyncHandler(async (req, res) => {
    const user = req.user;
    const result = await mfaService.setupMfa(user, req);

    res.status(200).json({
        success: true,
        ...result
    });
});

export const verifyMfaSetup = asyncHandler(async (req, res) => {
    const user = req.user;
    const { code } = req.body;

    await mfaService.verifyMfaSetup(user, code, req);

    res.status(200).json({
        success: true,
        message: "MFA enabled successfully"
    });
});

export const verifyMfaLogin = asyncHandler(async (req, res) => {
    const user = req.user; // From temp-jwt strategy
    const { code } = req.body;
    const ip = getIp(req);
    const deviceInfo = getDeviceInfo(req);

    // Verify MFA code
    await mfaService.verifyMfaLogin(user, code, req);

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    // Save session
    const fingerPrint = genrateFingerPrint(user._id, deviceInfo);
    await sessionService.saveRefreshToken(user._id, refreshToken, ip, deviceInfo, fingerPrint);

    res.cookie("refreshtoken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
        success: true,
        message: "Login successful",
        accessToken
    });
});

export const resetMfa = asyncHandler(async (req, res) => {
    const user = req.user;
    const result = await mfaService.resetMfa(user, req);

    res.clearCookie("refreshtoken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "strict",
    });

    res.status(200).json({
        success: true,
        massage: result.message,
    });
});


// PASSWORD MANAGEMENT


export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email, req);
    res.status(200).json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.query;
    const { Newpassword, confirmPassword } = req.body;

    const result = await authService.resetPassword(token, Newpassword, confirmPassword, req);
    res.status(200).json(result);
});

export const changePassword = asyncHandler(async (req, res) => {
    const user = req.user;
    const { currantPassword, newPassword, confirmPassword } = req.body;

    const result = await authService.changePassword(user, currantPassword, newPassword, confirmPassword, req);
    res.status(200).json(result);
});


// USER STATUS


export const userStatus = asyncHandler(async (req, res) => {
    const user = req.user;
    const activeSessionCount = await sessionService.getActiveSessions(user._id);

    const status = userService.getUserStatus(user, activeSessionCount.length);

    res.status(200).json({
        success: true,
        data: status
    });
});

