const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
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
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    category: {
        type: String,
        enum: ['kitchen', 'home', 'bedroom', 'bathroom', 'experience', 'other'],
        default: 'other'
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    estimatedPrice: {
        type: String,
        trim: true
    },
    isReceived: {
        type: Boolean,
        default: false
    },
    receivedFrom: {
        type: String,
        trim: true
    },
    receivedDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 200
    },
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient queries
giftSchema.index({ weddingSlug: 1 });
giftSchema.index({ weddingSlug: 1, category: 1 });
giftSchema.index({ weddingSlug: 1, order: 1 });
giftSchema.index({ weddingSlug: 1, isReceived: 1 });

module.exports = mongoose.model('Gift', giftSchema); 