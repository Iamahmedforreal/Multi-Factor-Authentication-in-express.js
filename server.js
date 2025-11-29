import express, { urlencoded } from 'express'
import dotenv from 'dotenv'



dotenv.config()
const app = express();

//middleware
app.use(express.json({limit: '100mb'}));
app.use(urlencoded({limit: '100mb', extended: true}));





const PORT = process.env.PORT || 3000;


app.listen(PORT , () => {
    console.log(`the server live in ${PORT}`);
});