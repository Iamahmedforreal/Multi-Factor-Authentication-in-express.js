import express, { urlencoded } from "express";
import dotenv from "dotenv";
dotenv.config();
import passport from "passport";
import cookieParser from "cookie-parser";
import dbConnection from "./config/dbConnection.js";
import AuthRoutes from "./route/Authroutes.js";
import globalratelimiter from "./middleware/ratelimiter.js"
import MongoSanitize from "express-mongo-sanitize";
import "./config/passportConfig.js";



const app = express();



dotenv.config();

// Middleware
app.use(express.json({ limit: "100mb" }));
app.use(urlencoded({ limit: "100mb", extended: true }));

const mongoSanitizeInPlace = MongoSanitize.sanitize || (MongoSanitize && MongoSanitize.default && MongoSanitize.default.sanitize);
app.use((req, res, next) => {
    ['body', 'params', 'headers', 'query'].forEach((key) => {
        if (req[key]) {
            try {
                mongoSanitizeInPlace(req[key]);
            } catch (err) {
                console.error('express-mongo-sanitize failed for', key, err);
            }
        }
    });
    next();
});
app.use(passport.initialize()); 
app.use(cookieParser());
app.use(globalratelimiter);

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

