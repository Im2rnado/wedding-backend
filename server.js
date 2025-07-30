const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import logging middleware
const { requestLogger, errorLogger } = require('./middleware/logging');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
    console.log(`[${req.requestId}] Health check requested`);
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Import routes
const weddingRoutes = require('./routes/weddings');

// Use routes
app.use('/weddings', weddingRoutes);

// 404 handler
app.use('*', (req, res) => {
    console.log(`[${req.requestId}] 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Route not found' });
});

// Add error logging middleware
app.use(errorLogger);

// Error handler
app.use((err, req, res, next) => {
    console.error(`[${req.requestId || 'unknown'}] Global error handler:`, err.stack);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Something went wrong!'
            : err.message
    });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/wedding-service')
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📝 Comprehensive logging enabled for all endpoints`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

module.exports = app; 