import { connect } from "mongoose";

//Db connection
const dbConnection = async () =>{
    try{
        const MONGO_URL = process.env.MONGO_URL;

        if(!MONGO_URL){
            console.log("cant find mongo url")

        }

        const MongoUrl = await connect(process.env.MONGO_URL,);
        console.log(`database connected to ${MongoUrl.connection.host}`);

    }catch(error){
        console.log(error);
        process.exit(1);
    
    }

}

export default dbConnection;