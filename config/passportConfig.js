import bcrypy from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import User from "../models/user.js";



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