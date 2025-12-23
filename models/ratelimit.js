import mongoose, { now } from "mongoose";
import { string } from "zod";

const bucketSchema  = new mongoose.Schema({
   
    key:{
        type:string,
        required:true,
        unique:true,
    },

    count:{
        type: Number,
        default: 1,
    },
    expiredAt:{
        type: Date,
        required: true,
    }
});

bucketSchema.index({expiredAt:1} , {expireAfterSeconds:0})

export default mongoose.model("Bucket" , bucketSchema);