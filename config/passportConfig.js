import dotenv from "dotenv";
dotenv.config();
import bcrypy from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy , ExtractJwt  } from "passport-jwt";
import User from "../models/user.js";


//local strategy
passport.use(new LocalStrategy(
  async (username, password, done) => {

    try{
    let user = await User.findOne({username});
    if(!user) return done(null, false , {message: "User not found"});


    let isMatch = await bcrypy.compare(password, user.password);

    if(isMatch) return done(null , user);

    else return done(null, false, {message: "Incorrect password"});

   }catch(err){
    console.log(err);
   }
  }
   
  
));
//jwt-stragy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (playload , done) => {
      try{

        const user = await findById(playload.id);
        if (user) return done(null , user);
        else return done(null , false , {massage: "User not found"});        
      }catch(err){
        console.log(err);
      }

    }
    
  )
)