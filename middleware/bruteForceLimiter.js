import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
    windowMs:15 * 60 * 1000,
    max: 5,
    message:"too many login attempt try again later"
});

export default loginLimiter;