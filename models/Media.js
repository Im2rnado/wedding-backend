const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    weddingSlug: {
        type: String,
        required: true,
        ref: 'Wedding'
    },
    uploaderName: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['image', 'video'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    thumbnailUrl: {
        type: String
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['guest-upload', 'official', 'admin'],
        default: 'guest-upload'
    },
    isApproved: {
        type: Boolean,
        default: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        width: Number,
        height: Number,
        duration: Number, // for videos
        exif: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for efficient queries
mediaSchema.index({ weddingSlug: 1 });
mediaSchema.index({ weddingSlug: 1, category: 1 });
mediaSchema.index({ weddingSlug: 1, uploadedAt: -1 });
mediaSchema.index({ weddingSlug: 1, isApproved: 1 });

module.exports = mongoose.model('Media', mediaSchema); 