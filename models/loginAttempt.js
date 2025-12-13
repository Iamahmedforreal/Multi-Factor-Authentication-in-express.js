import mongoose from "mongoose";

const LoginAttemptSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Types.ObjectId,
        ref: "User",    
    },
    email:{
        type: String,
        required: true,
        index: true,
    },
    ip:{
        type: String,
        required: true,
        index: true,
    },
    timestamp:{
        type: Date,
        default: Date.now,
        index:true,
        expire:86400
    },
    successfull:{
        type: Boolean,
        required: true,
    } 


});

LoginAttemptSchema.index({email: 1}, {timestamp: -1});
LoginAttemptSchema.index({ip: 1}, {timestamp: -1});

export default mongoose.model("LoginAttempt", LoginAttemptSchema);