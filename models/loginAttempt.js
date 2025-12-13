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

// Field-level `index: true` is defined for `email`, `ip`, and `timestamp` above.
// Removed schema.index calls to avoid duplicate index definitions.

export default mongoose.model("LoginAttempt", LoginAttemptSchema);