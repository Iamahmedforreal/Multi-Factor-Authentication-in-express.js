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
        unique: true,
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

const RefreshTokenModel = mongoose.model("RefreshToken", RefreshTokenSchema);

export default RefreshTokenModel;