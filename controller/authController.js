import dotenv from "dotenv";
dotenv.config();
import User from "../models/user.js"
import refreshToken from "../models/token.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateAccessToken , generateRefreshToken } from "../utils/token.js";







export const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        const hashPassword = await bcrypt.hash(password, 10);

        let newUser = new User({
            username,
            password: hashPassword,
            IsMfaActive: false,
        });

        await newUser.save();
        res.status(200).json({ message: "User created" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Server error" });
    }
};
//authentication
export const login = async (req, res) => {

    const user = req.user;
    const daysToexpire = 7;
    const expirationDate = new Date(Date.now() + daysToexpire * 24 * 60 * 60 * 1000);
    const ip = req.ip || req.connection.remoteAddress;
    const device = req.headers["user-agent"];

   

    const AccessToken = generateAccessToken(user);
    const newtoken = generateRefreshToken(user);


    const RefreshToken = new refreshToken({
        userId: user._id,
        token: newtoken,
        expiresAt: expirationDate,
        device:device,
        ip_address:ip,
    })

    try{
        await RefreshToken.save();

    }catch(err){
        console.log("Refresh token not saved" , err);
    }


    res.cookie("refreshToken", newtoken ,{
        httpOnly: true,
        secure: true,
        sameSite: "none",
    })


    res.status(200).json({
        massage: "User logged in",
        id: user._id,
        username: user.username,
        IsMfaActive: user.IsMfaActive,
        AccessToken,
        newtoken
    })
  
};
export const logout = async (req, res) => {
    
   const refreshtokenValue = req.cookies.refreshToken;
   if(!refreshtokenValue) return res.sendStatus(204);

    try{

    const result = await refreshToken.deleteOne({token:refreshtokenValue});

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
export const mfa = async (req, res) => {};
export const resetmfa = async (req, res) => {};
export const userStatus = async (req, res) => {
    const user = req.user
    res.status(200).json({
        username: user.username,
        IsMfaActive: user.IsMfaActive
    })
};
export const verify = async (req, res) => {};

export const refresh = async (req, res) => {

    const RefreshToken = req.cookies.RefreshToken;
    if(!RefreshToken) return res.sendStatus(401);

    const user = await user.findOne({RefreshToken});
    if(!user) return res.sendStatus(403);

    jwt.verify(RefreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
        if(err) return res.sendStatus(403);

        const AccessToken = jwt.sign(
            {id: user._id},
            process.env.JWT_SECRET,
            {expiresIn: "7m"}
        );

        res.json({
            AccessToken
        })

    });



 

};
