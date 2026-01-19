/**
 * Request Logging Middleware
 * Logs all incoming requests with timing information
 */

export const requestLogger = (req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    // Log request
    console.log(`[${timestamp}] ${req.method} ${req.path}`);

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
      

        console.log(
            ` ${req.method} ${req.path} - ${status} - ${duration}ms - ${req.ip}`
        );
    });

    next();
};
