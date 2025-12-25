import bucketSchema from "../models/ratelimit.js";
import { buildKey, AuditLogFunction } from "../utils/helper.js";
import RefreshTokenModel from "../models/token.js";
import eventEmitter from "./eventEmmit.js";



const MAX_ATTEMP = 5;
const MAX_WINDOW = 10;
//login rate limit 
export const loginRatelimit = async (req , res , next) => {
    const ip = (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()) || req?.ip || null;
    const email = req.body.email;
    const now = new Date();

    if(!email){
        return res.status(403).json({error:"email not found"});
    }
    const key = await buildKey("login" , ip , email);

    const bucket = await bucketSchema.findOneAndUpdate({
        
            key:key,
            expiredAt:{$gte:now}// we looking for bucket that is not expired
        },
        {
            $inc:{count:1},//after that if its not expired we increament 1
            $setOnInsert:{//if user first time or it expired make new bucket
                key:key,
                expiredAt: new Date(now.getTime() + MAX_WINDOW * 60 * 1000)
            }
        },
            {upsert:true , new:true}        //we  returns document after it increment (without it returns false meaning it will return the old count )
    )
    if(bucket.count > MAX_ATTEMP){ // check if the count if its more than limit block it 
        await AuditLogFunction(null, "RATE_LIMIT_BLOCKED", req, { key, email, ip, bucketCount: bucket.count });
        eventEmitter.emit('limit_hit', {email:email , action:"LOGIN_RATE_LIMIT_HIT" , meta:{ip}});
        return res.status(429).json({
            error:"too many login attempts try again later",
            retryAfter: bucket.expiredAt
        })
    }
    next();
}
//rate limit for reset-password  (when user submits email for reseting)
export const refreshratelimit = async (req , res , next) => {
    const refreshToken = req.cookies.refreshtoken;
    const now = new Date();
    if(!refreshToken){
        return res.status(403).json({error:"refresh token not found"});
    }
    const token = await RefreshTokenModel.findOne({token:refreshToken});
    if(!token){
        return res.status(403).json({error:"invalid refresh token"});
    }
    const key = `${"refresh"}:${token.userId}`
   
    const bucket = await bucketSchema.findOneAndUpdate(
        {key:key,
        expiredAt:{$gte:now}
        },
        {
            $inc:{count:1},
            $setOnInsert:{
                key:key,
                expiredAt: new Date(now.getTime() + MAX_WINDOW * 60 * 1000)
            }
        }
        ,
        {upsert:true , new:true}
    )
    if(bucket.count > MAX_ATTEMP){
        const minutesLeft = Math.ceil((bucket.expiredAt.getTime() - now.getTime()) / 60000);
        await AuditLogFunction(token.userId || null, "RATE_LIMIT_BLOCKED", req, { key, bucketCount: bucket.count });
        return res.status(429).json({
            error:"too many refresh attempts try again later",
            retryAfter: minutesLeft
        });
    }
    next();
}
// rate limit for reset-password  (when user submits email for reseting)
export const forgetpasswordratelimit = async (req , res , next) => {
    const ip = (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()) || req?.ip || null;
    const email = req.body.email;
    const now = new Date();

    if(!email){
        return res.status(403).json({error:"email not found"});
    }
    const key = await buildKey("forgotpassword" , ip , email);
    const bucket = await bucketSchema.findOneAndUpdate(
        {
            key:key,
            expiredAt:{$gte:now}
        
        },
        {
            $inc:{count:1},
            $setOnInsert:{
                key:key,
                expiredAt: new Date(now.getTime() + MAX_WINDOW * 60 * 1000)
            }
            },
            {upsert:true , new:true}      
    )

    if(bucket.count > MAX_ATTEMP){
        await AuditLogFunction(null, "RATE_LIMIT_BLOCKED", req, { key, email, ip, bucketCount: bucket.count });

        return res.status(429).json({
            error:"too many forgot password attempts try again later",
            retryAfter: bucket.expiredAt
        });
    }
    next();           
}

// rate limit for reset-password confirmation (when user submits new password)
export const resetPasswordConfirmRatelimit = async (req, res, next) => {
    const ip = (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()) || req?.ip || null;
    const email = req.body?.email;
    const now = new Date();

    if (!email) {
        return res.status(403).json({ error: "email not found" });
    }

    const key = await buildKey("resetpasswordconfirm", ip, email);

    const bucket = await bucketSchema.findOneAndUpdate(
        {
            key: key,
            expiredAt: { $gte: now }
        },
        {
            $inc: { count: 1 },
            $setOnInsert: {
                key: key,
                expiredAt: new Date(now.getTime() + MAX_WINDOW * 60 * 1000)
            }
        },
        { upsert: true, new: true }
    );

    if (bucket.count > MAX_ATTEMP) {
        const minutesLeft = Math.ceil((bucket.expiredAt.getTime() - now.getTime()) / 60000);
        await AuditLogFunction(null, "RATE_LIMIT_BLOCKED", req, { key, email, ip, bucketCount: bucket.count });
        return res.status(429).json({
            error: "too many reset-password attempts, try again later",
            retryAfterMinutes: minutesLeft
        });
    }

    next();
}

// MFA verify rate limiter (applies to TOTP verify endpoints)
export const mfaVerifyRatelimit = async (req, res, next) => {
    
    const ip = (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()) || req?.ip || null;
    const userId = req?.user?._id?.toString() || req?.body?.userId || null;
    const now = new Date();

    if (!userId) {
        // fallback: we use ip-only key if no userId available
        return res.status(400).json({ error: "user id required for rate limiting" });
    }

    const key = `${"mfaverify"}:${userId}:${ip}`

    const bucket = await bucketSchema.findOneAndUpdate(
        {
            key: key,
            expiredAt: { $gte: now }
        },
        {
            $inc: { count: 1 },
            $setOnInsert: {
                key: key,
                expiredAt: new Date(now.getTime() + MAX_WINDOW * 60 * 1000)
            }
        },
        { upsert: true, new: true }
    );

    if (bucket.count > MAX_ATTEMP) {
        const minutesLeft = Math.ceil((bucket.expiredAt.getTime() - now.getTime()) / 60000);
        await AuditLogFunction(userId || null, "RATE_LIMIT_BLOCKED", req, { key, ip, bucketCount: bucket.count });
        return res.status(429).json({
            error: "too many mfa verify attempts, try again later",
            retryAfterMinutes: minutesLeft
        });
    }

    next();
}