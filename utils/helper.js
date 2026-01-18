
import AuditLog from "../models/AuditLog.js";
import RefreshTokenModel from "../models/token.js";
import loginAttempt from "../models/loginAttempt.js";
import crypto from "crypto";
const LOCK_OUT_DURATION = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPT = 5;
import mongoose from "mongoose";

export const handleError = (res , err , StatusCode = 500) => {

    console.error("error:" , err);
    return res.status(StatusCode).json({massage: "An error occurred. Please try again later."});
}
//function for saving token 
export const SaveRefreshToke = async (userId , token , ip , deviceInfo , fingerPrint ) => {
     await RefreshTokenModel.create({
        userId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        device: deviceInfo,
        ip_address: ip,
        fingerPrint,
        
    })    
}

//function for recording
export const recodLastLoginAttempt = async (UserId , ip  , email ,successfull) =>{
    await loginAttempt.create({
        userId: UserId,
        email: email.toLowerCase(),
        ip,
        successfull,
        timestamp: new Date()
    })
}
// function for getting the audit
export  const AuditLogFunction = async (userId , action , req ,  metadata={}) => {
    const ip_address = (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()) || req?.ip || null;
    const device  = req?.headers?.['user-agent'] || null;

    await AuditLog.create({
        userId,
        action,
        ip: ip_address,
        userAgent : device,
        metadata,
        timestamp: new Date()
    })
}
export const checkAccountLogout = async (email , ip) => {
 
//we checking email or ip and if its in last LOCK_COUNT_ATTEMPT
 const recentLoginAttemp2ts = await loginAttempt.find({
    $or:[{email} , {ip}],
    timestamp: {$gte: new Date(Date.now() - LOCK_OUT_DURATION)}
 })
//filtering by failed login attempts
 const failedLoginAttempts  = recentLoginAttempts.filter(attempt => !attempt.successfull);
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
export const buildKey = (action , ip , email) => {
    return`${action}:${ip}:${email}`
}
//function to check if the device is new

export const newDevice = async(userId , fingerPrint) => {
    
    const isNewDevice = await RefreshTokenModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        fingerPrint: fingerPrint
    })


   
    if(!isNewDevice){
        return true;
    }
    return false;
   
}

export const getIp = (req ) => {
    return (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()) || req?.ip || null;
}

export const getDeviceInfo = (req) => {
    return req?.headers?.['user-agent'] || null;
}
export const genrateFingerPrint = (userId , deviceInfo) => {
    const fingerPrint =  `${userId}|${deviceInfo}`;
    const hashedFingerPrint = crypto.createHash('sha256').update(fingerPrint).digest('hex');
    return hashedFingerPrint;
}




