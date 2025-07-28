const crypto = require('crypto');

// Helper function to sanitize sensitive data from objects
const sanitizeData = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitive = ['password', 'apikey', 'api_key', 'token', 'secret', 'passcode'];
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitive.some(s => lowerKey.includes(s))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeData(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

// Generate request ID for tracking
const generateRequestId = () => {
    return crypto.randomBytes(8).toString('hex');
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();

    // Add request ID to request object for use in controllers
    req.requestId = requestId;

    // Get client info
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Log request start
    console.log('\n=== REQUEST START ===');
    console.log(`[${timestamp}] [${requestId}] ${req.method} ${req.originalUrl}`);
    console.log(`Client IP: ${clientIp}`);
    console.log(`User Agent: ${userAgent}`);

    // Log request parameters
    if (Object.keys(req.params).length > 0) {
        console.log('Request Params:', sanitizeData(req.params));
    }

    // Log query parameters
    if (Object.keys(req.query).length > 0) {
        console.log('Query Params:', sanitizeData(req.query));
    }

    // Log request body (sanitized)
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request Body:', sanitizeData(req.body));
    }

    // Log file upload info
    if (req.file) {
        console.log('File Upload:', {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            fieldName: req.file.fieldname
        });
    }

    // Override res.json to capture response
    const originalJson = res.json;
    res.json = function (body) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Log response
        console.log('Response Status:', res.statusCode);
        console.log('Response Time:', `${duration}ms`);

        // Log response body (sanitized and truncated if too long)
        if (body) {
            const sanitizedBody = sanitizeData(body);
            const bodyStr = JSON.stringify(sanitizedBody);
            if (bodyStr.length > 500) {
                console.log('Response Body:', bodyStr.substring(0, 500) + '... [TRUNCATED]');
            } else {
                console.log('Response Body:', sanitizedBody);
            }
        }

        console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
        console.log('=== REQUEST END ===\n');

        return originalJson.call(this, body);
    };

    // Override res.status to capture error responses
    const originalStatus = res.status;
    res.status = function (code) {
        if (code >= 400) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(`[ERROR] [${requestId}] ${req.method} ${req.originalUrl} - Status: ${code} (${duration}ms)`);
        }
        return originalStatus.call(this, code);
    };

    next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const requestId = req.requestId || 'unknown';

    console.log('\n=== ERROR OCCURRED ===');
    console.log(`[${timestamp}] [${requestId}] ERROR in ${req.method} ${req.originalUrl}`);
    console.log('Error Message:', err.message);
    console.log('Error Stack:', err.stack);

    if (err.code) {
        console.log('Error Code:', err.code);
    }

    if (err.name) {
        console.log('Error Type:', err.name);
    }

    console.log('=== ERROR END ===\n');

    next(err);
};

// Controller method wrapper for additional logging
const logControllerAction = (controllerName, actionName) => {
    return (req, res, next) => {
        const requestId = req.requestId || 'unknown';
        console.log(`[${requestId}] Executing: ${controllerName}.${actionName}`);
        next();
    };
};

module.exports = {
    requestLogger,
    errorLogger,
    logControllerAction,
    sanitizeData
}; 