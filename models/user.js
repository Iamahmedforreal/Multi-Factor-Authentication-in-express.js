import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

    username: {
        type: String,
        unique: true,
        required: true,
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
