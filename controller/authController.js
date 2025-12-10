import dotenv from "dotenv";
dotenv.config();
import User from "../models/user.js"
import RefreshTokenModel from "../models/token.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrCode from "qrcode";
import crypto from "crypto";
import { z } from "zod";
import { registerSchema } from "../validators/registerValidation.js";
import {sendEmailResetPassword, sendEmailVerification} from "../utils/sendEmail.js";
import { generateAccessToken , generateRefreshToken , genarateTemporaryToken } from "../utils/token.js";



export const register = async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);
        const { email, password } = data;


        const hashPassword = await bcrypt.hash(password, 10);
       
        const token = crypto.randomBytes(32).toString("hex");


        let newUser = new User({
            email,
            password: hashPassword,
            IsMfaActive: false,
            emailVerificationToken: token,
            emailVerificationTokenExpires: Date.now() + 3600000,
            twoFactorSecret: "",
        });

        await newUser.save();

        await sendEmailVerification(newUser.email , token);

        res.status(200).json({ message: "User created successfully please verify your email"});

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Server error" });
    }
};
//authentication
export const login = async (req, res) => {

    try{
    const user = req.user;

    if(user.IsMfaActive == true ){
        const temp = genarateTemporaryToken(user);
        return res.status(200).json({
            massage: "verify your user",
            temp: temp
    });    
    }
    const AccessToken = generateAccessToken(user)
    const RefreshToken = generateRefreshToken(user)
    
    
    const EXPIRES_AT = 7;
    const expirestion = new Date(Date.now() + EXPIRES_AT * 24 * 60 * 60 * 1000);
    const ip = req.headers["x-forwarded-for"] || req.ip;
    const Userdevice = req.headers["user-agent"];

    const TokenDoment = new RefreshTokenModel({
        userId: user._id,
        token: RefreshToken,
        expiresAt: expirestion,
        device: Userdevice,
        ip_address:ip
    })

    await TokenDoment.save();

    res.cookie("refreshToken", RefreshToken,{
        httpOnly: true,
        secure: true,
        sameSite: "none",
    });

    return res.status(202).json({
        massage:"user logged in ",
        AccessToken: AccessToken,
    })

    
   
    }catch(err){
        console.log(err);
    }
};


//logout router for revoking and deleting refresh from db
export const logout = async (req, res) => {
    
   const refreshToken = req.cookies.refreshToken;
   if(!refreshToken) return res.sendStatus(204);
    try{

    
    const result = await RefreshTokenModel.deleteOne({token: refreshToken });

    if(result.deletedCount === 0){
        console.log("Logout: Token not found in DB, proceeding to clear cookie")
    }

    res.clearCookie("refreshToken" ,
        {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        }
    );
    res.sendStatus(204);
    }catch(err){
        console.log(err);
    }   
};
//setup router
export const mfa = async (req, res) => {
  
 
 
try{
    const user = req.user;
    

    const secret = speakeasy.generateSecret();
    console.log(secret);

    
    user.TwoFactorSecret = secret.base32;
    user.IsMfaActive = true;
    await user.save();


    const url = speakeasy.otpauthURL({
        secret: secret.base32,
        label: `${req.user.username}`,
        issuer:"authentication.com",
        encoding:"base32"
    });

    const qrimage = await qrCode.toDataURL(url);

    res.status(200).json({
        secret: secret.base32,
        qrimage,
    })


}catch(err){
    console.log(err);
}
};
export const resetmfa = async (req, res) => {
    try{
    const user = req.user;
    user.twoFactorSecret = "";
    user.IsMfaActive = false;
    await user.save();
    res.status(202).json("MFA reset successfully");
    }catch(err){
        console.log(err);
    }

};

export const userStatus = async (req, res) => {
    const user = req.user
    res.status(200).json({
        username: user.username,
        IsMfaActive: user.IsMfaActive
    })
};
export const verify = async (req, res) => {
    try{
    const {token} = req.body;
    const user = req.user;

    const verfied = speakeasy.totp.verify({
        secret: user.TwoFactorSecret,
        encoding: "base32",
        token
    });

    if(!verfied) {
        return res.status(403).json({massage:"code not correct"} );
    }
    const AceessToken = generateAccessToken(user);
    const newRefrshToken = generateRefreshToken(user);

    const EXPIRES_AT = 7;
    const experation = new Date(Date.now() + EXPIRES_AT * 24 * 60 * 60 * 1000);
    const ip = req.headers["x-forwarded-for"] || req.ip;
    const Userdevice = req.headers["user-agent"];

    const refreshTokenDocument = new RefreshTokenModel({
        userId: user._id,
        token: newRefrshToken,
        expiresAt: experation,
        device: Userdevice,
        ip_address:ip
    }
    );    

    await refreshTokenDocument.save();

    res.cookie("refreshToken", newRefrshToken,{
        httpOnly: false,
        secure: false,
        sameSite: "none",
    });

   

    res.status(200).json({
        AceessToken: AceessToken

    })

}catch(err){
    console.log(err);
}
};

//refresh token for new token
export const refresh = async (req, res) => {

 
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401);

    
    const tokenDoc = await RefreshTokenModel.findOne({ token: refreshToken });
    if (!tokenDoc) return res.sendStatus(403);

    
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
        if (err) return res.sendStatus(403);

       
        const user = await User.findById(tokenDoc.userId);
        if (!user) return res.sendStatus(404);

        
        const accessToken = generateAccessToken(user);

        res.json({ accessToken });
    });
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;   

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).send("Invalid or expired token");
    }

    user.isemailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpires = undefined;

    await user.save();

    res.send("Email verified successfully");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
};
export const forgotPassword = async (req, res) => {
    try{
    const {email} = req.body;

    const user = await User.findOne({email});

    if(!user) return res.status(400).json("user does not exist");

    const token = crypto.randomBytes(32).toString("hex");

    

    user.resetPasswordToken = token;
    user.resetPasswordTokenExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    await sendEmailResetPassword(user.email, token);
    res.status(200).json("password reset email sent");
    }catch(err){
        console.log(err);
    }
    
}

export const resetPassword = async (req, res) => {
    try{
     const {token} = req.query;
     const {Newpassword} = req.body;



     const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordTokenExpires: { $gt: Date.now() }
     });

     if(!user){
        return res.status(400).json("Invalid or expired token");

     }

     user.password = await bcrypt.hash(Newpassword, 12);
     user.resetPasswordToken = undefined;
     user.resetPasswordTokenExpires = undefined;
     await user.save();
     res.status(200).json("password reset successfully");


    }catch(err){
        console.log(err);
    }
}


