import { connect } from "mongoose";

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// monngodb connection function
const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Database connection successful");
    } catch (error) {
        console.error("Database connection failed:", error);
        throw error;
    }
};

// Check connection status
dbConnection.checkConnection = () => {
    return mongoose.connection.readyState === 1; // 1 = connected
};

// Close connection gracefully
dbConnection.close = async () => {
    await mongoose.connection.close();
};

export default dbConnection;