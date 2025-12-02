import jwt from "jsonwebtoken";

const generateAccessToken = (user) => {
    return jwt.sign(
        {id: user._id},
        process.env.JWT_SECRET,
        {expiresIn: "7m"}
    )
}

const generateRefreshToken = (user) =>{
    return jwt.sign(
        {id: user._id},
        process.env.JWT_REFRESH_SECRET,
        {expiresIn: "7d"}
    )
}

export {
    generateAccessToken,
    generateRefreshToken
}