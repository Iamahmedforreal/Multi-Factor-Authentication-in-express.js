
import AuditLog from "../models/AuditLog.js";
import RefreshTokenModel from "../models/token.js";
import loginAttempt from "../models/loginAttempt.js";

export const handleError = (res , err , StatusCode = 500) => {

    console.error("error:" , err);
    return res.status(StatusCode).json({massage: "An error occurred. Please try again later."});
}

export const SaveRefreshToke = async (userId , token) => {
    const EXPIRES_AT = 7;
    const expiresAt = new Date(Date.now() + EXPIRES_AT * 24 * 60 * 60 * 1000);
    const ip = req.headers["x-forwarded-for"] || req.ip;
    const device = req.headers["user-agent"];

    await RefreshTokenModel.create({
        userId,
        token,
        expiresAt,
        device,
        ip
    })    
}
export const recodLastLoginAttempt = async (UserId , ip  , email ,successfull ,) =>{
    await loginAttempt.create({
        userId: UserId,
        email: email.toLowerCase(),
        ip,
        successfull,
        timestamp: new Date()
    })
}

export  const AuditLogFunction = async (userId , action , req ,  ip , userAgent , metadata={}) => {
    const ip_addrss = req ? (req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip):null;
    const device  = req ? req.headers["user-agent"] : null;

    await AuditLog.create({
        userId,
        action,
        ip: ip_addrss,
        userAgent : device,
        metadata,
        timestamp: new Date()
    })
    
}
