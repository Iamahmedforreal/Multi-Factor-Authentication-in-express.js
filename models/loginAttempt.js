import mongoose from "mongoose";
//schema for loginAttempt we need to record for logout
const LoginAttemptSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Types.ObjectId,
        ref: "User",    
    },
    email:{
        type: String,
        required: true,
    },
    ip:{
        type: String,
        required: true,
    },
    timestamp:{
        type: Date,
        default: Date.now,

    },
    successfull:{
        type: Boolean,
        required: true,
    } 


});
LoginAttemptSchema.index({timestamp:1 , expireAfterSeconds:86400});

LoginAttemptSchema.index({email:1 , timestamp:-1});
LoginAttemptSchema.index({ip:1 , timestamp:-1});


export default mongoose.model("LoginAttempt", LoginAttemptSchema);