const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const Media = require('../models/Media');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WebP, HEIC, MP4, MOV, and AVI files are allowed.'), false);
        }
    }
});

// Bunny.net upload utility
const uploadToBunny = async (buffer, filename, slug, category = 'guest-uploads') => {
    try {
        // Validate environment variables
        if (!process.env.BUNNY_STORAGE_URL || !process.env.BUNNY_API_KEY || !process.env.CDN_BASE_URL) {
            throw new Error('Missing BunnyCDN configuration. Please check your environment variables.');
        }

        const bunnyUrl = `${process.env.BUNNY_STORAGE_URL}/${slug}/${category}/${filename}`;

        console.log('📤 Uploading to BunnyCDN:', {
            url: bunnyUrl,
            category,
            filename,
            bufferSize: buffer.length,
            hasApiKey: !!process.env.BUNNY_API_KEY
        });

        const response = await axios.put(bunnyUrl, buffer, {
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY,
                'Content-Type': 'application/octet-stream'
            },
            timeout: 30000 // 30 second timeout
        });

        if (response.status === 201 || response.status === 200) {
            const cdnUrl = `${process.env.CDN_BASE_URL}/${slug}/${category}/${filename}`;
            console.log('✅ Successfully uploaded to BunnyCDN:', cdnUrl);
            return cdnUrl;
        } else {
            throw new Error(`Unexpected response status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ BunnyCDN upload error:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url
        });

        // Provide more specific error messages
        if (error.response?.status === 401) {
            throw new Error('BunnyCDN authentication failed. Please check your API key and storage zone permissions.');
        } else if (error.response?.status === 404) {
            throw new Error('BunnyCDN storage zone not found. Please check your storage zone name.');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('BunnyCDN upload timeout. The file might be too large or network is slow.');
        }

        throw new Error(`BunnyCDN upload failed: ${error.message}`);
    }
};

// Process image (resize and compress)
const processImage = async (buffer, mimeType) => {
    try {
        let processedBuffer = buffer;
        let metadata = {};

        if (mimeType.startsWith('image/')) {
            console.log('🖼️ Processing image:', { mimeType, originalSize: buffer.length });

            const image = sharp(buffer);
            const imageMetadata = await image.metadata();

            metadata = {
                width: imageMetadata.width,
                height: imageMetadata.height
            };

            console.log('📏 Image metadata:', metadata);

            // Resize if larger than 1920px width
            if (imageMetadata.width > 1920) {
                console.log('📐 Resizing image from', imageMetadata.width, 'to 1920px width');
                processedBuffer = await image
                    .resize(1920, null, { withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toBuffer();
            } else {
                // Just compress
                console.log('🗜️ Compressing image without resize');
                processedBuffer = await image
                    .jpeg({ quality: 85 })
                    .toBuffer();
            }

            console.log('📦 Image processed:', {
                originalSize: buffer.length,
                processedSize: processedBuffer.length,
                compressionRatio: ((buffer.length - processedBuffer.length) / buffer.length * 100).toFixed(1) + '%'
            });

            // Create thumbnail
            console.log('🖼️ Creating thumbnail (300x300)');
            const thumbnailBuffer = await sharp(buffer)
                .resize(300, 300, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer();

            console.log('✅ Thumbnail created:', { size: thumbnailBuffer.length });

            return { processedBuffer, thumbnailBuffer, metadata };
        }

        console.log('🎥 Non-image file, skipping processing');
        return { processedBuffer, thumbnailBuffer: null, metadata };
    } catch (error) {
        console.error('❌ Image processing error:', error);
        throw error;
    }
};

// Upload media (guest uploads)
const uploadMedia = async (req, res) => {
    try {
        const { slug } = req.params;
        const { uploaderName, category = 'guest-upload' } = req.body;
        const requestId = req.requestId;

        console.log(`[${requestId}] MediaController.uploadMedia - Processing upload for wedding: ${slug}`);
        console.log(`[${requestId}] Uploader: ${uploaderName}, Category: ${category}`);

        if (!req.file) {
            console.log(`[${requestId}] No file uploaded in request`);
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!uploaderName) {
            console.log(`[${requestId}] Missing uploader name`);
            return res.status(400).json({ error: 'Uploader name is required' });
        }

        const file = req.file;
        const fileExtension = path.extname(file.originalname);
        const filename = `${uuidv4()}${fileExtension}`;
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');

        console.log(`[${requestId}] File details:`, {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            isImage,
            isVideo,
            newFilename: filename
        });

        let processedBuffer = file.buffer;
        let metadata = {};
        let thumbnailUrl = null;

        // Process images
        if (isImage) {
            console.log(`[${requestId}] Processing image file`);
            const { processedBuffer: processed, thumbnailBuffer, metadata: imgMetadata } = await processImage(file.buffer, file.mimetype);
            processedBuffer = processed;
            metadata = imgMetadata;

            // Upload thumbnail if exists
            if (thumbnailBuffer) {
                const thumbnailFilename = `thumb_${filename}`;
                console.log(`[${requestId}] Uploading thumbnail: ${thumbnailFilename}`);
                thumbnailUrl = await uploadToBunny(thumbnailBuffer, thumbnailFilename, slug, category);
                console.log(`[${requestId}] Thumbnail uploaded successfully: ${thumbnailUrl}`);
            }
        }

        // Upload main file to Bunny.net
        console.log(`[${requestId}] Uploading main file: ${filename}`);
        const fileUrl = await uploadToBunny(processedBuffer, filename, slug, category);
        console.log(`[${requestId}] Main file uploaded successfully: ${fileUrl}`);

        // Determine approval status based on category
        // Admin/official uploads are auto-approved, guest uploads need approval
        const isApproved = category === 'official' || category === 'admin';

        // Save to database
        const media = new Media({
            weddingSlug: slug,
            uploaderName,
            type: isImage ? 'image' : 'video',
            url: fileUrl,
            thumbnailUrl,
            filename,
            originalName: file.originalname,
            size: processedBuffer.length,
            mimeType: file.mimetype,
            category,
            isApproved,
            metadata
        });

        await media.save();

        console.log(`[${requestId}] Media record saved to database with ID: ${media._id}`);
        console.log(`[${requestId}] Upload completed successfully for: ${file.originalname}`);

        res.status(201).json({
            message: 'Media uploaded successfully',
            media
        });

    } catch (error) {
        console.error(`[${req.requestId}] MediaController.uploadMedia ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            uploaderName: req.body.uploaderName,
            fileInfo: req.file ? {
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype
            } : 'No file',
            message: error.message
        });
        res.status(500).json({ error: 'Failed to upload media' });
    }
};

// Upload official media (admin only)
const uploadOfficialMedia = async (req, res) => {
    try {
        const { slug } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] MediaController.uploadOfficialMedia - Processing official upload for wedding: ${slug}`);

        if (!req.file) {
            console.log(`[${requestId}] No file uploaded in official media request`);
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const fileExtension = path.extname(file.originalname);
        const filename = `${uuidv4()}${fileExtension}`;
        const isImage = file.mimetype.startsWith('image/');

        console.log(`[${requestId}] Official file details:`, {
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            isImage,
            newFilename: filename
        });

        let processedBuffer = file.buffer;
        let metadata = {};
        let thumbnailUrl = null;

        // Process images
        if (isImage) {
            console.log(`[${requestId}] Processing official image file`);
            const { processedBuffer: processed, thumbnailBuffer, metadata: imgMetadata } = await processImage(file.buffer, file.mimetype);
            processedBuffer = processed;
            metadata = imgMetadata;

            // Upload thumbnail
            if (thumbnailBuffer) {
                const thumbnailFilename = `thumb_${filename}`;
                console.log(`[${requestId}] Uploading official thumbnail: ${thumbnailFilename}`);
                thumbnailUrl = await uploadToBunny(thumbnailBuffer, thumbnailFilename, slug, 'official');
                console.log(`[${requestId}] Official thumbnail uploaded: ${thumbnailUrl}`);
            }
        }

        // Upload main file
        console.log(`[${requestId}] Uploading official file: ${filename}`);
        const fileUrl = await uploadToBunny(processedBuffer, filename, slug, 'official');
        console.log(`[${requestId}] Official file uploaded: ${fileUrl}`);

        // Save to database (official uploads are auto-approved)
        const media = new Media({
            weddingSlug: slug,
            uploaderName: 'Admin',
            type: isImage ? 'image' : 'video',
            url: fileUrl,
            thumbnailUrl,
            filename,
            originalName: file.originalname,
            size: processedBuffer.length,
            mimeType: file.mimetype,
            category: 'official',
            isApproved: true,
            metadata
        });

        await media.save();

        console.log(`[${requestId}] Official media record saved with ID: ${media._id}`);
        console.log(`[${requestId}] Official upload completed for: ${file.originalname}`);

        res.status(201).json({
            message: 'Official media uploaded successfully',
            media
        });

    } catch (error) {
        console.error(`[${req.requestId}] MediaController.uploadOfficialMedia ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            fileInfo: req.file ? {
                originalName: req.file.originalname,
                size: req.file.size,
                mimeType: req.file.mimetype
            } : 'No file',
            message: error.message
        });
        res.status(500).json({ error: 'Failed to upload official media' });
    }
};

// Delete media from Bunny.net
const deleteFromBunny = async (filename, slug, category) => {
    try {
        const bunnyUrl = `${process.env.BUNNY_STORAGE_URL}/${slug}/${category}/${filename}`;

        console.log('🗑️ Deleting from BunnyCDN:', bunnyUrl);

        await axios.delete(bunnyUrl, {
            headers: {
                'AccessKey': process.env.BUNNY_API_KEY
            }
        });

        console.log('✅ Successfully deleted from BunnyCDN');
        return true;
    } catch (error) {
        console.error('❌ Bunny.net delete error:', error);
        return false;
    }
};

// Approve/reject guest media
const moderateMedia = async (req, res) => {
    try {
        const { slug, mediaId } = req.params;
        const { isApproved } = req.body;
        const requestId = req.requestId;

        console.log(`[${requestId}] MediaController.moderateMedia - Moderating media ${mediaId} for wedding: ${slug}`);
        console.log(`[${requestId}] Moderation action: ${isApproved ? 'APPROVE' : 'REJECT'}`);

        const media = await Media.findOneAndUpdate(
            { _id: mediaId, weddingSlug: slug },
            { isApproved },
            { new: true }
        );

        if (!media) {
            console.log(`[${requestId}] Media not found for moderation: ${mediaId}`);
            return res.status(404).json({ error: 'Media not found' });
        }

        console.log(`[${requestId}] Media moderation completed:`, {
            filename: media.filename,
            uploader: media.uploaderName,
            type: media.type,
            approved: media.isApproved
        });

        res.json({
            message: `Media ${isApproved ? 'approved' : 'rejected'} successfully`,
            media
        });

    } catch (error) {
        console.error(`[${req.requestId}] MediaController.moderateMedia ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            mediaId: req.params.mediaId,
            isApproved: req.body.isApproved,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to moderate media' });
    }
};

module.exports = {
    upload,
    uploadMedia,
    uploadOfficialMedia,
    moderateMedia,
    deleteFromBunny
}; 