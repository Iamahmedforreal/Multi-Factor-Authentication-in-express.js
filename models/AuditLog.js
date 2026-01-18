import mongoose from "mongoose";
//  schema for aduitAction
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
            'USER_REGISTERED', 'LOGIN_SUCCESS', 'LOGIN_MFA_REQUIRED', 'LOGIN_FAILED', 'LOGIN_LOCKED', 'LOGIN_EMAIL_NOT_VERIFIED',
            'LOGOUT', 'LOGOUT_ALL_SESSIONS', 'SESSION_REVOKED',
            'MFA_SETUP_INITIATED', 'MFA_SETUP_FAILED', 'MFA_ENABLED', 'MFA_DISABLED',
            'MFA_VERIFY_SUCCESS', 'MFA_VERIFY_FAILED',
            'EMAIL_VERIFIED', 'EMAIL_VERIFICATION_SENT', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_FAILED',
            'PASSWORD_RESET_COMPLETED', 'PASSWORD_CHANGED',
            'PASSWORD_CHANGE_FAILED','LOGIN_MFA_VERIFIED','TOKEN_REFRESHED','RATE_LIMIT_BLOCKED'
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