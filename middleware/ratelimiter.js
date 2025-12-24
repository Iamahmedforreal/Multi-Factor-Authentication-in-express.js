import bucketSchema from "../models/ratelimit.js";
import { buildKey } from "../utils/helper.js";
import RefreshTokenModel from "../models/token.js";



const MAX_ATTEMP = 5;
const MAX_WINDOW = 10;

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
            expiredAt:{$gte:now}
        },
        {
            $inc:{count:1},
            $setOnInsert:{
                key:key,
                expiredAt: new Date(now.getTime() + MAX_WINDOW * 60 * 1000)
            
            },
        },
            {upsert:true , new:true}        
    )
    if(bucket.count >= MAX_ATTEMP){
        return res.status(429).json({
            error:"too many login attempts try again later",
            retryAfter: bucket.expiredAt
        })
    }
    next();
}

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
    if(bucket.count >= MAX_ATTEMP){
        return res.status(429).json({
            error:"too many refresh attempts try again later",
            retryAfter: bucket.expiredAt
        });
    }
    

    next();

    

}
