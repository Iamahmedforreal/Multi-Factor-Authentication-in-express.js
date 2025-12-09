import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
   email: {
        type: String,
        required: true,
        unique: true,
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
    },
    emailVerificationToken: {
        type: String,
    },
    emailVerificationTokenExpires: {
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

const User = mongoose.model("User", userSchema);

export default User;
