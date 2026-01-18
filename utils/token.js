import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
    const payload = {
        id: user._id,
        type: "access-token"
    }

    return jwt.sign(payload, process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE,
            issuer:'authentication-service',
            audience:'api-access'
        }
    )
}

export const generateRefreshToken = (user) => {
    const playload = {
        id: user._id,
        type: "refresh-token"        
    }

    return jwt.sign(playload, process.env.JWT_REFRESH_SECRET ,{
        expiresIn: process.env.JWT_REFRESH_EXPIRE,
        issuer:'authentication-service',
        audience:'refresh-token'
    })
}

export const genarateTemporaryToken = (user) => {
    const playload = {
        userId: user._id.toString(),
        type: "maf-pending",
        requiredmfa: true

    }
    return jwt.sign(playload, process.env.JWT_TEMPOROY_EXPIRES ,{
        expiresIn: process.env.JWT_TEMPOROY_EXPIRES_IN,
        issuer:'authentication-service',
        audience:'mfa-verification'
    })
}
    
