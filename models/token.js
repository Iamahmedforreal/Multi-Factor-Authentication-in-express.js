import mongoose from "mongoose";
import { create } from "qrcode";


const RefreshTokenSchema  = new mongoose.Schema({
    userId:{
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "User",    
        unique: true,
        
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
    },
    createdAt:{
        type: Date,
        default: Date.now,
    }


})

RefreshTokenSchema.index({userId:1 , expiresAt:-1});
RefreshTokenSchema.index({userId:1 ,createdAt:-1});

const RefreshTokenModel = mongoose.model("RefreshToken", RefreshTokenSchema);

export default RefreshTokenModel;