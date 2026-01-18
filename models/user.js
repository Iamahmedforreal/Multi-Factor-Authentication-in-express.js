import mongoose from "mongoose";
//User Schema 
const userSchema = new mongoose.Schema({
   email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        unique: true,
        
    },
    password: {
        type: String,
        required: true,
    },

    MfaActive: {
        type: Boolean,
        default: false,
    },
    TwoFactorSecret: {
        type: String,

    },
    emailVerified: {
        type: Boolean,
        default: false,
        
    },
    resetPasswordToken: {
        type: String,
        
    },
    resetPasswordTokenExpires: {
        type: Date,
    },
    emailVerificationToken: {
        type: String,
    },
    emailVerificationTokenExpires: {
        type: Date,

    },
    lastLogin:{
        type: Date,      
    },


    createdAt: {
        type: Date,
        default: Date.now,
       
    },

    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

userSchema.index({ email: 1 , emailVerified:1});


const User = mongoose.model("User", userSchema);

export default User;
