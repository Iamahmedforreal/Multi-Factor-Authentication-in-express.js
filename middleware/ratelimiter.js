import bucketSchema from "../models/ratelimit.js";
import { buildKey } from "../utils/helper.js";



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

    const bucket = await bucketSchema.findOne({key:key});

    if(!bucket || bucket.expiredAt.getTime() < now.getTime()){
        await bucketSchema.findOneAndUpdate(
            {key:key},
            {
                key:key,
                count:1,
                expiredAt: new Date(now.getTime() + MAX_WINDOW * 60 * 1000)
            }
            ,
            {upsert:true}
        )
        return next();
        
    }
    if(bucket.count >= MAX_ATTEMP){
        return res.status(429).json({error:"too many login attempts try again later"})
    }
    
    await bucketSchema.updateOne(
        {key:key},
        {
            $inc:{count:1},
        }
    )
    return next();
}
