import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
   email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: true,
    },

    IsMfaActive: {
        type: Boolean,
        default: false,
    },
    TwoFactorSecret: {
        type: String,
    },
    isemailVerified: {
        type: Boolean,
        default: false,
        index: true,
    },
    resetPasswordToken: {
        type: String,
        index: true,
    },
    resetPasswordTokenExpires: {
        type: Date,
    },
    emailVerificationToken: {
        type: String,
    },
    emailVerificationTokenExpires: {
        type: Date,
        index: true,
    },
    lastLogin:{
        type: Date,      
    },


    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },

    updatedAt: {
        type: Date,
        default: Date.now,
        index: true,
    }
});

// Note: field-level `index: true` is already set on several fields above.
// Removed redundant schema-level index to prevent duplicate-index warnings.
const User = mongoose.model("User", userSchema);

export default User;
