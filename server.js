import express, { urlencoded } from "express";
import dotenv from "dotenv";
import passport from "passport";
import dbConnection from "./config/dbConnection.js";
import AuthRoutes from "./routes/Authroutes.js";

dotenv.config();
dbConnection();

const app = express();

// middleware
app.use(express.json({ limit: "100mb" }));
app.use(urlencoded({ limit: "100mb", extended: true }));
app.use(passport.initialize());

// routes
app.use("/api/auth", AuthRoutes);

// port
const PORT = process.env.PORT;


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
