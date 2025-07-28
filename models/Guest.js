const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
    weddingSlug: {
        type: String,
        required: true,
        ref: 'Wedding'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    attending: {
        type: Boolean,
        required: true
    },
    plusOne: {
        type: Boolean,
        default: false
    },
    plusOneName: {
        type: String,
        trim: true
    },
    message: {
        type: String,
        trim: true,
        maxlength: 500
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient queries
guestSchema.index({ weddingSlug: 1 });
guestSchema.index({ weddingSlug: 1, name: 1 });

module.exports = mongoose.model('Guest', guestSchema); 