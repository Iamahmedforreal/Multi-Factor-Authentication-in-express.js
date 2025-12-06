import dotenv from "dotenv";
dotenv.config();
import User from "../models/user.js"
import RefreshTokenModel from "../models/token.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrCode from "qrcode";
import { generateAccessToken , generateRefreshToken , genarateTemporaryToken } from "../utils/token.js";


export const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        const hashPassword = await bcrypt.hash(password, 10);

        let newUser = new User({
            username,
            password: hashPassword,
            IsMfaActive: false,
            twoFactorSecret: "",
        });

        await newUser.save();
        res.status(200).json({ message: "User created successfully"});

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
        httpOnly: false,
        secure: false,
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
            httpOnly: false,
            secure: false,
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


