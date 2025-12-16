import jwt from "jsonwebtoken";

const generateAccessToken = (user) => {
    const playload ={
        UserId:user._id.toString(),
        email:user.email,
        IsMfaActive:user.IsMfaActive,
        isemailVerified:user.isemailVerified,
    }
    return jwt.sign(playload , process.env.JWT_SECRET,{
        expiresIn: process.env.JWT_EXPIRY,
        issuer:"authentication.com",
        audience:"user.com"
    }
     
    )
}

const generateRefreshToken = (user) =>{
    const playload = {
        UserId:user._id.toString(),
        tyoe:"refresh",
       
    }
    return jwt.sign(playload , process.env.JWT_REFRESH_SECRET,{
        expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",
        issuer:"authentication.com",
        audience:"user.com"
    }
    )

}
const genarateTemporaryToken = (user) => {
    return jwt.sign(
        {id: user._id},
        process.env.JWT_TEMPOROY,
        {expiresIn: "10m"}
    )
}

export {
    generateAccessToken,
    generateRefreshToken,
    genarateTemporaryToken

}