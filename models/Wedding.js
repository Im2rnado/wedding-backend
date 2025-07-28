const mongoose = require('mongoose');

const weddingSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[a-z0-9-]+$/
    },
    coupleNames: {
        groom: {
            type: String,
            required: true,
            trim: true
        },
        bride: {
            type: String,
            required: true,
            trim: true
        }
    },
    weddingDate: {
        type: Date,
        required: true
    },
    config: {
        theme: {
            type: String,
            default: 'gold',
            enum: ['gold', 'silver', 'rose', 'blue', 'green', 'purple']
        },
        bgMusicUrl: String,
        isPrivate: {
            type: Boolean,
            default: false
        },
        passcode: String,
        customDomain: String,
        primaryColor: {
            type: String,
            default: '#D4AF37'
        },
        secondaryColor: {
            type: String,
            default: '#F5F5DC'
        }
    },
    apiKey: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
weddingSchema.index({ slug: 1 });
weddingSchema.index({ apiKey: 1 });
weddingSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Wedding', weddingSchema); 