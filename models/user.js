import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        unique: true,
        required: true,
    },
    password:{
        type: String,
        required: true,
    },
    IsMfaActive:{
        type: Boolean,
        default: false,
    },


    TwoFactorSecrete:{
        type: String,
    },
    
    createdAt:{
        type: Date,
        default: Date.now,
    },
    updateAt:{
        type: Date,
        default: Date.now,
    }

})
const User = mongoose.model('User', userSchema);

export default User;