import mongoose, { now } from "mongoose";


// schema for keeping tag on user requst
const bucketSchema  = new mongoose.Schema({
   
    key:{
        type:String,
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