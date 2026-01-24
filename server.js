import express from "express";
import dotenv from "dotenv";
import passport from "passport";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import dbConnection from "./config/dbConnection.js";
import AuthRoutes from "./route/Authroutes.js";
import "./config/passportConfig.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/logger.js";
import { redis } from "./utils/radis.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';


// SECURITY MIDDLEWARE

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' }
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


// REQUEST PARSING MIDDLEWARE


// Body parsers with size limits (prevent DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));
app.use(cookieParser());




// LOGGING MIDDLEWARE


if (NODE_ENV !== 'test') {
    app.use(requestLogger);
}


// AUTHENTICATION MIDDLEWARE


app.use(passport.initialize());


// HEALTH CHECK & ROOT ROUTES


app.get('/', (req, res) => {
    res.json({
        service: 'Multi-Factor Authentication API',
        version: '2.0.0',
        status: 'running',
        environment: NODE_ENV
    });
});

app.get('/health', async (req, res) => {
    try {
        // Check database connection
        const dbStatus = await dbConnection.checkConnection();

        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbStatus ? 'connected' : 'disconnected',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'Service unavailable'
        });
    }
});


// API ROUTES

app.use("/api/auth", AuthRoutes);


// ERROR HANDLING MIDDLEWARE


// 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);
// SERVER STARTUP
const startServer = async () => {
    try {

        // redis test connection
        const redisTest = await redis.ping();
        // Validate critical environment variables
        const requiredEnvVars = [
            'MONGODB_URI',
            'JWT_SECRET',
            'JWT_REFRESH_SECRET',
            'JWT_TEMPOROY',
            'EMAIL_USER',
            'EMAIL_PASS',
            'BASE_URL'
        ];

        const missing = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }

        // Connect to database
        await dbConnection();
        console.log("Database connected successfully");

        // Start server
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`✓ Server running on http://localhost:${PORT}`);
            console.log(`✓ Environment: ${NODE_ENV}`);
            
        });

        // Graceful shutdown handlers
        const gracefulShutdown = async (signal) => {
            console.log(`\n${signal} received. Starting graceful shutdown...`);

            server.close(async () => {
                console.log('✓ HTTP server closed');

                try {
                    await dbConnection.close();
                    console.log('✓ Database connection closed');
                    process.exit(0);
                } catch (error) {
                    console.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

    } catch (error) {
        console.error("✗ Error starting server:", error);
        process.exit(1);
    }
};

// Only start server if not in test mode
if (NODE_ENV !== 'test') {
    startServer();
}

export default app;
