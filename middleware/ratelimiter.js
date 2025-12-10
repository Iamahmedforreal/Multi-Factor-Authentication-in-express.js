import ratelimit from "express-rate-limit";


 const globalratelimiter = ratelimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message:"too many request try again later"

});

export default globalratelimiter;

