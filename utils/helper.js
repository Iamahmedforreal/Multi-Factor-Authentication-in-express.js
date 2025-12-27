
import AuditLog from "../models/AuditLog.js";
import RefreshTokenModel from "../models/token.js";
import loginAttempt from "../models/loginAttempt.js";
<<<<<<< HEAD
import * as uaParserPkg from "ua-parser-js";
const UAParser = uaParserPkg?.UAParser || uaParserPkg?.default || uaParserPkg;
import crypto from "crypto";
=======
import mongoose from "mongoose";
>>>>>>> cdb14fbcdb2954810934e76323f74d15edb0ad83

const LOCK_OUT_DURATION = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPT = 5;

export const handleError = (res , err , StatusCode = 500) => {

    console.error("error:" , err);
    return res.status(StatusCode).json({massage: "An error occurred. Please try again later."});
}

export const SaveRefreshToke = async (userId , token , req) => {
    const EXPIRES_AT = 7;
    const deviceInfo = getDeviceInfo(req);
    const ip = getIp(req);
    const location = await getLocation(ip);
    const fingerPrint = genrateFingerPrint(userId , deviceInfo);
    const expiresAt = new Date(Date.now() + EXPIRES_AT * 24 * 60 * 60 * 1000);
  
    


    await RefreshTokenModel.create({
        userId,
        token,
        expiresAt,
        device: deviceInfo,
        ip_address: ip,
        fingerPrint,
        location: location
    })    
}
export const recodLastLoginAttempt = async (UserId , ip  , email ,successfull) =>{
    await loginAttempt.create({
        userId: UserId,
        email: email.toLowerCase(),
        ip,
        successfull,
        timestamp: new Date()
    })
}

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
 const recentLoginAttempts = await loginAttempt.find({
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
export const buildKey = async(action , ip , email) => {
    return`${action}:${ip}:${email}`
}
//function to check if the device is new
<<<<<<< HEAD

export const newDevice = async({
    userId,
    fingerPrint,
})=>{
    const isNewDevice = await RefreshTokenModel.findOne({
        userId,
        fingerPrint
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
    const device = req?.headers?.['user-agent'] || null;
    const parser = new UAParser(device);
    const result = parser.getResult();

    return {
        browser: result.browser.name || "unknown",
        os: result.os.name || "unknown",
        deviceType: result.device.type || "unknown"
    }
}
export const genrateFingerPrint = (userId , deviceInfo) => {
    const fingerPrint =  `${userId}|${deviceInfo.os}|${deviceInfo.browser}|${deviceInfo.deviceType}`;
    const hashedFingerPrint = crypto.createHash('sha256').update(fingerPrint).digest('hex');
    return hashedFingerPrint;
}
export const getLocation = async(ip) => {
    const response = await fetch(`https://ip-api.com/json/${ip}`);
    const data = await response.json();
    return{
        country: data.country || "unknown",
        region: data.regionName || "unknown",
        city: data.city || "unknown",
        LL: data.lat || 0,
        LT: data.lon || 0,
    }
}

=======
//export const newDevice = async({
  //  userId,
    //ip_address,
    //device
//})=>{
  //  const isNewDevice = await RefreshTokenModel.findOne({
    //    userId,
      //  ip_address: ip_address,
        //device: device
    //})

   
    //if(!isNewDevice){
      //  return true;
    //}
    //return false;
   
//}
>>>>>>> cdb14fbcdb2954810934e76323f74d15edb0ad83


