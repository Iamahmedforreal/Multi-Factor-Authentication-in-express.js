import express, { urlencoded } from "express";
import dotenv from "dotenv";
dotenv.config();
import passport from "passport";
import cookieParser from "cookie-parser";
import dbConnection from "./config/dbConnection.js";
import AuthRoutes from "./route/Authroutes.js";
import "./config/passportConfig.js";



const app = express();



dotenv.config();

// Middleware
app.use(express.json({ limit: "100mb" }));
app.use(urlencoded({ limit: "100mb", extended: true }));
app.use(passport.initialize()); 
app.use(cookieParser());

// Routes
app.use("/api/auth",  AuthRoutes);

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  console.log("Root route hit!");
  res.send('Hello World!')
});


const startserver = async () => {
    try {
        await dbConnection();
        console.log("Database connected successfully");
        
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on http://localhost:${PORT}`);

        });

        server.on('error', (error) => {
            console.error("Server error:", error);
        });
    } catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
};

startserver();

