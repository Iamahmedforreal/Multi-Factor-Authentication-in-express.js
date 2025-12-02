import User from "../models/user.js"
import bcrypt from "bcrypt";
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

export const login = async (req, res) => {

    const user = req.user;

    const AccessToken = generateAccessToken(user);
    const RefreshToken = generateRefreshToken(user);

    res.status(200).json({
        massage: "User logged in",
        id: user._id,
        username: user.username,
        IsMfaActive: user.IsMfaActive,
        AccessToken,
        RefreshToken
    })
  
};
export const logout = async (req, res) => {};
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
