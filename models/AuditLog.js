import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Types.ObjectId,
        ref: "User",  
        index:true,  
    },
    action:{
        type: String,
        required: true,
        enum: [
            'USER_REGISTERED', 'LOGIN_SUCCESS', 'LOGIN_MFA_REQUIRED',
            'LOGOUT', 'LOGOUT_ALL_SESSIONS', 'SESSION_REVOKED',
            'MFA_SETUP_INITIATED', 'MFA_ENABLED', 'MFA_DISABLED',
            'MFA_VERIFY_SUCCESS', 'MFA_VERIFY_FAILED',
            'EMAIL_VERIFIED', 'PASSWORD_RESET_REQUESTED',
            'PASSWORD_RESET_COMPLETED', 'PASSWORD_CHANGED',
            'PASSWORD_CHANGE_FAILED','LOGIN_MFA_VERIFIED'
        ],

        index:true,
    },
    ip:{
        type: String,
    },
    userAgent :{
        type: String,    
    },
    metadata:{
        type: mongoose.Schema.Types.Mixed,
    },
    timestamp:{
        type: Date,
        default: Date.now,
        index:true,
    }

})

AuditLogSchema.index({userId: 1 ,timestamp:-1});
AuditLogSchema.index({action:1 ,timestamp: -1});


export default mongoose.model("AuditLog", AuditLogSchema);