const Wedding = require('../models/Wedding');

// API Key authentication middleware
const authenticateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        // Find wedding by API key
        const wedding = await Wedding.findOne({
            apiKey: apiKey,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!wedding) {
            return res.status(401).json({ error: 'Invalid or expired API key' });
        }

        // Add wedding info to request object
        req.wedding = wedding;
        req.weddingSlug = wedding.slug;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Validate wedding slug middleware
const validateWeddingSlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        if (!slug) {
            return res.status(400).json({ error: 'Wedding slug is required' });
        }

        // Check if slug matches the authenticated wedding
        if (req.wedding && req.wedding.slug !== slug) {
            return res.status(403).json({ error: 'Slug does not match API key' });
        }

        // If no authenticated wedding, find by slug (for public endpoints)
        if (!req.wedding) {
            const wedding = await Wedding.findOne({
                slug: slug,
                isActive: true,
                expiresAt: { $gt: new Date() }
            });

            if (!wedding) {
                return res.status(404).json({ error: 'Wedding not found or expired' });
            }

            req.wedding = wedding;
            req.weddingSlug = slug;
        }

        next();
    } catch (error) {
        console.error('Slug validation error:', error);
        res.status(500).json({ error: 'Validation failed' });
    }
};

// Admin authentication middleware (for admin panel)
const authenticateAdmin = async (req, res, next) => {
    try {
        const adminSecret = req.headers['x-admin-secret'];

        if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }

        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({ error: 'Admin authentication failed' });
    }
};

module.exports = {
    authenticateApiKey,
    validateWeddingSlug,
    authenticateAdmin
}; 