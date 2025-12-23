import dotenv from "dotenv";
dotenv.config();
import User from "../models/user.js"
import RefreshTokenModel from "../models/token.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrCode from "qrcode";
import crypto from "crypto";
import { registerSchema  , loginSchema  , resetPasswordSchema  , mfaVerifySchema } from "../validators/registerValidation.js";
import {sendEmailResetPassword, sendEmailVerification} from "../utils/sendEmail.js";
import { generateAccessToken , generateRefreshToken , genarateTemporaryToken } from "../utils/token.js";
import { handleError , SaveRefreshToke , recodLastLoginAttempt , AuditLogFunction, checkAccountLogout } from "../utils/helper.js";


const EMAIL_VERIFICATION_EXPIRY = 1000 * 60 * 60 * 24;
const MAX_ACTIVE_SESSION = 5;
const REFRESH_TOKEN_EXPIRY = 7;


//register controller 
export const register = async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);
        const {email , password} = data;

        const user = await User.findOne({email:email.toLocaleUpperCase()});
        if(user){
            return res.status(400).json({massage:"user already exist"});
        }

        const hashpassword = await bcrypt.hash(password, 12);
        const token = crypto.randomBytes(32).toString("hex");
        const hashToken = crypto.createHash("sha256").update(token).digest("hex");

        const newUser = new User({
            email: email.toLocaleUpperCase(),
            password: hashpassword,
            emailVerificationToken: hashToken,
            emailVerificationTokenExpires: Date.now() + EMAIL_VERIFICATION_EXPIRY,
            IsMfaActive:false,
            twoFactorSecret:""
        });

        await newUser.save();

        await AuditLogFunction(newUser._id , "USER_REGISTERED" , req , {email:newUser.email});

        sendEmailVerification(newUser.email, token).catch((err) => {
            console.log("Error sending email",err);
        });;
        res.status(200).json({massage:"user created successfully"});
     
    } catch (err) {
        if (err == 'ZodError'){
            return  res.status(400).json({massage:"input not valid"});
        }
        console.log("error:" ,err);
        
    }
};
//authentication
export const login = async (req, res) => {
    try{
        const user = loginSchema.parse(req.user);
        const ip = req? (req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip):null;

        const lockedOut = await checkAccountLogout(user.email , ip);

        if(lockedOut.locked){
            await recodLastLoginAttempt(user._id , ip , user.email , false);
           return res.status(429).json({error:`Account locked for ${lockedOut.minutesRemaining} minutes`})   
        }
        if(!user.emailVerified){
            await recodLastLoginAttempt(user._id , ip , user.email , false);
            return res.status(400).json({massage:"email not verified"});
        }

        await recodLastLoginAttempt(user._id , ip , user.email , true);


        const activeSession = await RefreshTokenModel.countDocuments({
            userId: user._id,
            expiresAt: { $gt: Date.now() }
        
        });
        if(activeSession > MAX_ACTIVE_SESSION){
            const oldSession = await RefreshTokenModel.findOne({userId:user._id})
            .sort({created: 1})
            if(oldSession){
                await RefreshTokenModel.deleteOne({_id:oldSession._id});
            }
        }

        if(user.IsMfaActive){
            const temToken = genarateTemporaryToken(user);
            return res.status.json(
                {massage:"verify your 2fa setup"},
                 temToken);
            
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await SaveRefreshToke(user._id , refreshToken , req);

        res.cookie("refreshtoken" , refreshToken , {
            httpOnly: false,
            secure: false,
            sameSite: "none",
            maxAge: REFRESH_TOKEN_EXPIRY * 24 * 60 * 60 * 1000,
        })
        await AuditLogFunction(user._id , ip , "LOGIN_SUCCESS" , req);

        res.status(200).json({
            massage:"login successful",
            accessToken
        })
        
      
    }catch(err){
        if(err == 'ZodError'){
            return  res.status(400).json({massage:"input not valid"});
        }
        console.log("error:" ,err);
        
    }
};


//logout router for revoking and deleting refresh from db
export const logout = async (req, res) => {
   const refreshToken = req.cookies.refreshtoken;
   if(!refreshToken) {
    return res.status(400).json({massage:"refresh token not found"});
   }

   try{
    const tokenDoc = await RefreshTokenModel.findOne({token:refreshToken});
    if(!tokenDoc){
        return res.status(401).json({massage:"invalid refresh token"});
    
         }

    await AuditLogFunction(tokenDoc.userId , "LOGOUT" , req);

    await RefreshTokenModel.deleteOne({token:refreshToken});

    res.clearCookie("refreshtoken" , {
        httpOnly: false,
        secure: false,
        sameSite: "none",
    });
    return res.status(200).json({massage:"logged out successfully"});
    

   }catch(err){
    return handleError(res , err);
   }
   
};
export const logoutAllSessions = async (req, res) => {
    try{
        const user = req.user;

      await RefreshTokenModel.deleteMany({userId:user._id});

       res.clearCookie("refreshtoken" , {
            httpOnly: false,
            secure: false,
            sameSite: "none",
        });
        await AuditLogFunction(user._id , "LOGOUT_ALL_SESSIONS" , req);
        res.status(201).json({massage:"logged out successfully"});

    }catch(err){
        return handleError(res , err);
    }

    


}

//setup mfa router
export const mfa = async (req, res) => {
    try{
        const user = req.user;
        if(user.MfaActive && user.twoFactorSecret){
            return res.status(400).json({massage:"mfa already setup reset it first"});
        }

        const secret = speakeasy.generateSecret({
            issuer:"authentication-service",
            name:`${user.email}`,
            length:20
        })

        user.TwoFactorSecret = secret.base32;
        await user.save();

        const url = speakeasy.otpauthURL({
            secret: secret.base32,
            label: `${user.email}`,
            issuer: "authenticaterApp",
            encoding: "base32",
        });

        const qrImage = await qrCode.toDataURL(url);

        await AuditLogFunction(user._id , "MFA_SETUP_INITIATED" , req);
        res.status(201).json({
            qrImage,
            massage:"mfa setup initiated"
        });        

    }catch(err){
        return handleError(res , err);
    }
  
 
};
export const resetmfa = async (req, res) => {
      
      const user = req.user;
        
        if (!user.MfaActive) {
            return res.status(400).json({ error: "2FA is not enabled" });
        }

        user.TwoFactorSecret = "";
        user.MfaActive = false;
        await user.save();

        await RefreshTokenModel.deleteMany({ userId: user._id });

        await AuditLogFunction(user._id, 'MFA_DISABLED', req);

        res.status(200).json({ 
            message: "2FA has been disabled. Please log in again." 
        });

    } 



export const userStatus = async (req, res) => {
    const user = req.user
    const activeSession = await RefreshTokenModel.countDocuments({
        userId:user._id,
        expiresAt: { $gt: Date.now() }
    
    });
    res.status(200).json({
        email: user.email,
        emailVerified: user.emailVerified,
        IsMfaActive: user.IsMfaActive,
        activeSession
    })
};
export const verifySetup = async (req, res) => {
    try{
        const {code} = mfaVerifySchema.parse(req.body);
        const user = req.user;

        if(!code){
            return res.status(400).json({massage:"code is required"});
        }

        if(!user.TwoFactorSecret){
            return res.status(400).json({massage:"mfa not setup please set it up first"});
        }

        const verify = speakeasy.totp.verify({
            secret: user.TwoFactorSecret,
            encoding: "base32",
            token: code,
        })

        if(!verify){
            return res.status(400).json({massage:"invalid code"});
        }

        user.MfaActive = true;
        await user.save();

        await AuditLogFunction(user._id , "MFA_ENABLED" , req);

    res.status(200).json({
        massage:"mfa verified successfully"
    })

}catch(err){
    return handleError(res , err);
}
};

export const verifyLogin = async (req, res) => {
    try{
        const user = mfaVerifySchema.parse(req.user);
        const {code} = req.body;

        if(!user.MfaActive){
            return res.status(400).json({massage:"mfa not setup please set it up first"});
        }

        const verify = speakeasy.totp.verify({
            secret: user.TwoFactorSecret,
            encoding: "base32",
            token: code,
        })

        if(!verify){
            return res.status(400).json({massage:"invalid code"});
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        //this only for testing cookie should httponly
        res.cookie("refreshtoken" , refreshToken , {
            httpOnly: false,
            secure: false,
            sameSite: "none",
            
        })

        await SaveRefreshToke(user._id , refreshToken , req);
        await AuditLogFunction(user._id , "LOGIN_MFA_VERIFIED" , req);

        res.status(200).json({
            massage:"login successful",
            accessToken
        })
    }catch(err){
        return handleError(res , err);
    }
}
//refresh token for new token
export const refresh = async (req, res) => {

 try{
    const refreshToken = req.cookies.refreshtoken;
    if (!refreshToken){
        return res.status(401).json({massage:"refresh token not found"});
    }

    const tokenDoc = await RefreshTokenModel.findOne({ token: refreshToken });
    if (!tokenDoc){
        return res.status(401).json({massage:"invalid refresh token"});
    } 
    if (tokenDoc.expiresAt < new Date()){
        await RefreshTokenModel.deleteOne({ _id: tokenDoc._id });
        return res.status(401).json({massage:"refresh token expired"});
    }

     jwt.verify(refreshToken , process.env.JWT_REFRESH_SECRET);
 
    const user = await User.findById(tokenDoc.userId);

    if (!user){
        return res.status(401).json({massage:"user not found"});
    }
    
    const newRefreshToken = generateRefreshToken(user);
    await SaveRefreshToke(user._id , newRefreshToken , req);
 

    await RefreshTokenModel.deleteOne({ _id: tokenDoc._id });

    await AuditLogFunction(user._id , "TOKEN_REFRESHED" , req);
    const accessToken = generateAccessToken(user);

     res.cookie("refreshtoken" , newRefreshToken , {
        httpOnly: false,
        secure: false,
        sameSite: "none",
    });
   
    res.status(200).json({
        accessToken,
        massage:"new token generated"
    });

}catch(err){
    return handleError(res , err);
}
}

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    const hashToken = crypto.createHash("sha256").update(token).digest("hex");
    
    const user = await User.findOne({
        emailVerificationToken: hashToken,
        emailVerificationTokenExpires: { $gt: Date.now() }
    })
    if (!user) {
      return res.status(400).json("Invalid or expired token");
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;

    await user.save();

    res.status(200).json({massage:"email verified successfully"});
    

  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};
export const forgotPassword = async (req, res) => {
    try{
    const {email} = req.body;

    const user = await User.findOne({email});

    if(!user){
         return res.status(400).json("user does not exist");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const hashToken = crypto.createHash("sha256").update(token).digest("hex");

    

    user.resetPasswordToken = hashToken;
    user.resetPasswordTokenExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    await AuditLogFunction(user._id , "PASSWORD_RESET_REQUESTED" , req);
    await sendEmailResetPassword(user.email, token);
    res.status(200).json("password reset email sent");
    }catch(err){
        console.log(err);
    }
    
}

export const resetPassword = async (req, res) => {
    try{
     const {token} = req.query;
     const {Newpassword , confirmPassword} = req.body;
 

     if(Newpassword !== confirmPassword){
        return res.status(400).json({massage:"password do not match"});
     }

     const hashedToken = crypto.createHash("sha256").update(token).digest("hex");


     const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpires: { $gt: Date.now() }
     });

     if(!user){
        return res.status(400).json({massage:"Invalid or expired token"});

     }

     user.password = await bcrypt.hash(Newpassword, 12);
     user.resetPasswordToken = undefined;
     user.resetPasswordTokenExpires = undefined;
     await user.save();

     await AuditLogFunction(user._id , "PASSWORD_RESET_COMPLETED" , req);
     res.status(200).json({massage:"password reset successfully"});


    }catch(err){
        console.log(err);
    }
}

export const changePassword = async (req, res) => {
    try{
        const user = req.user;
        const{currantPassword , newPassword , confirmPassword} = req.body;

     

        if(!currantPassword || !newPassword || !confirmPassword){
            return res.status(400).json({massage:"all fields are required"});
        }
        if(newPassword !== confirmPassword){
            res.status(400).json({massage:"password do not match"});
        }
        const validPassword = await bcrypt.compare(currantPassword , user.password);
        if(!validPassword){
            await AuditLogFunction(user._id , "PASSWORD_CHANGE_FAILED" , req);
            return res.status(400).json({massage:"invalid password"});
        }

        user.password = await bcrypt.hash(newPassword , 12);
        await user.save();

        await AuditLogFunction(user._id , "PASSWORD_CHANGED" , req);

        res.status(200).json({massage:"password changed successfully"});

    }catch(err){
        return handleError(res , err);
    }
}


