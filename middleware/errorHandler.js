/**
 * Centralized Error Handling Middleware
 * Handles all errors and maps them to appropriate HTTP responses
 */

// Error response codes mapping
export const ERROR_CODES = {
    // Authentication Errors
    'USER_ALREADY_EXISTS': { status: 409, message: 'User already exists' },
    'USER_NOT_FOUND': { status: 404, message: 'User not found' },
    'INVALID_CREDENTIALS': { status: 401, message: 'Invalid email or password' },
    'EMAIL_NOT_VERIFIED': { status: 403, message: 'Please verify your email before logging in' },
    'EMAIL_ALREADY_VERIFIED': { status: 400, message: 'Email is already verified' },

    // Account Security
    'ACCOUNT_LOCKED': { status: 429, message: 'Account temporarily locked due to multiple failed attempts' },
    'INVALID_OR_EXPIRED_TOKEN': { status: 400, message: 'Invalid or expired token' },

    // MFA Errors
    'MFA_ALREADY_SETUP': { status: 400, message: 'MFA is already set up. Reset it first if you want to reconfigure' },
    'MFA_NOT_SETUP': { status: 400, message: 'MFA has not been set up yet' },
    'MFA_NOT_ENABLED': { status: 400, message: 'MFA is not enabled for this account' },
    'INVALID_MFA_CODE': { status: 403, message: 'Invalid MFA code. Please try again' },

    // Token Errors
    'ACCESS_TOKEN_EXPIRED': { status: 401, message: 'Access token has expired' },
    'REFRESH_TOKEN_EXPIRED': { status: 401, message: 'Refresh token has expired. Please log in again' },
    'TEMPORARY_TOKEN_EXPIRED': { status: 401, message: 'Temporary token has expired. Please restart the process' },
    'INVALID_ACCESS_TOKEN': { status: 401, message: 'Invalid access token' },
    'INVALID_REFRESH_TOKEN': { status: 401, message: 'Invalid refresh token' },
    'INVALID_TEMPORARY_TOKEN': { status: 401, message: 'Invalid temporary token' },

    // Password Errors
    'PASSWORDS_DO_NOT_MATCH': { status: 400, message: 'Passwords do not match' },
    'INVALID_CURRENT_PASSWORD': { status: 401, message: 'Current password is incorrect' },
    'ALL_FIELDS_REQUIRED': { status: 400, message: 'All fields are required' },

    // General Errors
    'VALIDATION_ERROR': { status: 400, message: 'Invalid input data' },
    'UNAUTHORIZED': { status: 401, message: 'Unauthorized access' },
    'FORBIDDEN': { status: 403, message: 'Access forbidden' },
    'NOT_FOUND': { status: 404, message: 'Resource not found' },
};

/**
 * Parse account locked error with minutes
 */
const parseAccountLocked = (errorMessage) => {
    if (errorMessage.startsWith('ACCOUNT_LOCKED:')) {
        const minutes = errorMessage.split(':')[1];
        return {
            status: 429,
            message: `Account locked for ${minutes} minutes due to multiple failed login attempts`
        };
    }
    return null;
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
};

/**
 * Centralized Error Handler
 */
export const errorHandler = (err, req, res, next) => {
    // Log error for debugging (in production, send to logging service)
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    // Check for special locked account format
    const lockedError = parseAccountLocked(err.message);
    if (lockedError) {
        return res.status(lockedError.status).json({
            success: false,
            error: lockedError.message
        });
    }

    // Check if error is in our error codes map
    const mappedError = ERROR_CODES[err.message];
    if (mappedError) {
        return res.status(mappedError.status).json({
            success: false,
            error: mappedError.message
        });
    }

    // Handle Zod validation errors
    if (err.name === 'ZodError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }

    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({
            success: false,
            error: `${field} already exists`
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token has expired'
        });
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }

    // Handle CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'CORS policy violation'
        });
    }

    // Generic server error
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'An error occurred. Please try again later'
            : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => {...}))
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
