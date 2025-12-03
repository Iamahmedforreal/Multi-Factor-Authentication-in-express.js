import mongoose from "mongoose";


const RefreshTokenSchema  = new mongoose.Schema({
    userId:{
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "User",    
    },

    token:{
        type: String,
        required: true,
    }, 
    
    expiresAt:{
        type: Date,
        required: true,
    },
    device:{
        type: String,
        default:"unknown"
    },
    ip_address:{
        type: String,
        default: null    
    }

})

const refreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);

export default refreshToken;