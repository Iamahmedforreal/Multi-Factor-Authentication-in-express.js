import bucketSchema from "../models/ratelimit.js";
import { generateLoginkey } from "../utils/helper.js";
import { emailSchema } from "../validators/registerValidation.js";

const MAX_ATTEMP = 5;
const MAX_WINDOW = 10;

export const loginRatelimit = async (req , res , next) => {
    const ip = (req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()) || req?.ip || null;
    const { email } = emailSchema.parse(req.body || {});

    if(!email){
        return res.status(403).json({error:"email not found"});
    }
    const key = await generateLoginkey(ip , email , "login");

    const bucket = await bucketSchema.findOne({key});
    if(!bucket){
        const newBucket = await  bucketSchema.create({
            key,
            count:1,
            expiredAt: new Date(Date.now() + MAX_WINDOW * 60 * 1000)
        })

        await newBucket.save();
        return next();
    }
    if(bucket.count >= MAX_ATTEMP){
        return res.status(429).json({
            error:"Too many login attempts. Please try again later"
        })
    }

    bucket.count += 1;
    await bucket.save();
    next();    
}