
import AuditLog from "../models/AuditLog.js";
import RefreshTokenModel from "../models/token.js";
import loginAttempt from "../models/loginAttempt.js";

const LOCK_OUT_DURATION = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPT = 5;

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

export  const AuditLogFunction = async (userId , action , req , metadata={}) => {
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
export const checkAccountLogout = async (email , ip) => {
 
//we checking email or ip and if its in last LOCK_COUNT_ATTEMPT
 const recentLoginAttempts = await loginAttempt.find({
    $or:[{email} , {ip}],
    timestamp: {gte: new Date(Date.now() - LOCK_OUT_DURATION)}
 })
//filtering by failed login attempts
 const failedLoginAttempts  = recentLoginAttempts.filter(attempt => !attempt.successfull.lenght);
//check if those login attemps > max login we allow
if(failedLoginAttempts.length >= MAX_LOGIN_ATTEMPT){
    //sort for latest attampt
    const recentAttempts = recentLoginAttempts.sort((a , b)=> b.timestamp - a.timestamp)[0];
    //calculate time remaining
    const timeRemaining = Math.ceil((LOCK_OUT_DURATION - (Date.now() - recentAttempts.timestamp)) / 60000);
    
    return {
        locked:true,
        minutesRemaining:timeRemaining
    }
}

return{
    locked:false,   
}   
}