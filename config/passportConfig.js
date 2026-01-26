import dotenv from "dotenv";
dotenv.config();
import bcrypy from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "../models/user.js";


//local strategy
passport.use(new LocalStrategy(
   {usernameField:"email" , passwordField:"password"}, 
   
   async( email, password, done) => {

    try{
    let user = await User.findOne({email});
    if(!user) return done(null, false , {message: "User not found"});


    let isMatch = await bcrypy.compare(password, user.password);

    if(isMatch) return done(null , user);

    else return done(null, false, {message: "Incorrect password"});

   }catch(err){
    console.log(err);
   }
  }
   
  
));

passport.use( new JwtStrategy(
    {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET
    },
    async (payload, done) => {
        try {
            const user = await User.findById(payload.id);
            if (!user) return done(null, false);

            return done(null, user);
        } catch (err) {
            return done(err, false);
        }
    }
  
  
));

    
passport.use(
  "temp-jwt",
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
      secretOrKey: process.env.JWT_TEMPORARY_SECRET,                 
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.id);
        if (!user) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);
