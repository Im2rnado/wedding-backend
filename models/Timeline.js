const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
    weddingSlug: {
        type: String,
        required: true,
        ref: 'Wedding'
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    time: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    eventType: {
        type: String,
        enum: ['ceremony', 'reception', 'engagement', 'henna', 'photos', 'other'],
        default: 'other'
    },
    googleMapsUrl: {
        type: String,
        trim: true
    },
    dressCode: {
        type: String,
        trim: true
    },
    isMainEvent: {
        type: Boolean,
        default: false
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for efficient queries
timelineSchema.index({ weddingSlug: 1 });
timelineSchema.index({ weddingSlug: 1, time: 1 });
timelineSchema.index({ weddingSlug: 1, order: 1 });

module.exports = mongoose.model('Timeline', timelineSchema); 