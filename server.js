import express, { urlencoded } from 'express'
import dotenv from 'dotenv'
import passport from 'passport'
import dbConnection from './config/dbConnection.js'




dotenv.config();
dbConnection();
const app = express();


//middleware
app.use(express.json({limit: '100mb'}));
app.use(urlencoded({limit: '100mb', extended: true}));
app.use(passport.initialize())





const PORT = process.env.PORT || 3000;


app.listen(PORT , () => {
    console.log(`the server live in ${PORT}`);
});