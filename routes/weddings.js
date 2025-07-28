const express = require('express');
const router = express.Router();

// Import controllers
const weddingController = require('../controllers/weddingController');
const mediaController = require('../controllers/mediaController');
const giftController = require('../controllers/giftController');

// Import middleware
const { authenticateApiKey, validateWeddingSlug, authenticateAdmin } = require('../middleware/auth');
const { validateRSVP, validateTimeline, validateWeddingConfig, validateGift } = require('../middleware/validation');
const { logControllerAction } = require('../middleware/logging');

// Public routes (no authentication required)
// GET /weddings/:slug/config - Get wedding configuration
router.get('/:slug/config',
    logControllerAction('WeddingController', 'getWeddingConfig'),
    validateWeddingSlug,
    weddingController.getWeddingConfig
);

// GET /weddings/:slug/timeline - Get wedding timeline
router.get('/:slug/timeline',
    logControllerAction('WeddingController', 'getTimeline'),
    validateWeddingSlug,
    weddingController.getTimeline
);

// POST /weddings/:slug/rsvp - Submit RSVP
router.post('/:slug/rsvp',
    logControllerAction('WeddingController', 'submitRSVP'),
    validateWeddingSlug,
    validateRSVP,
    weddingController.submitRSVP
);

// POST /weddings/:slug/upload-media - Guest upload media
router.post('/:slug/upload-media',
    logControllerAction('MediaController', 'uploadMedia'),
    validateWeddingSlug,
    mediaController.upload.single('media'),
    mediaController.uploadMedia
);

// GET /weddings/:slug/media - Get public media (approved only)
router.get('/:slug/media',
    logControllerAction('WeddingController', 'getMediaList'),
    validateWeddingSlug,
    (req, res, next) => {
        req.query.isApproved = true; // Only show approved media for public
        console.log(`[${req.requestId}] Public media access - forcing isApproved=true filter`);
        next();
    },
    weddingController.getMediaList
);

// GET /weddings/:slug/gifts - Get wedding gift registry
router.get('/:slug/gifts',
    logControllerAction('GiftController', 'getGifts'),
    validateWeddingSlug,
    giftController.getGifts
);

// POST /weddings/:slug/check-passcode - Check passcode for private weddings
router.post('/:slug/check-passcode',
    logControllerAction('WeddingController', 'checkPasscode'),
    validateWeddingSlug,
    weddingController.checkPasscode
);

// GET /weddings/:slug/qr-code - Generate QR code (public for sharing)
router.get('/:slug/qr-code',
    logControllerAction('WeddingController', 'generateQRCode'),
    validateWeddingSlug,
    weddingController.generateQRCode
);

// Protected routes (require API key authentication)
// GET /weddings/:slug/guests - Get RSVP list (admin only)
router.get('/:slug/guests',
    logControllerAction('WeddingController', 'getRSVPList'),
    authenticateApiKey,
    validateWeddingSlug,
    weddingController.getRSVPList
);

// GET /weddings/:slug/media/all - Get all media including pending approval (admin only)
router.get('/:slug/media/all',
    logControllerAction('WeddingController', 'getMediaList'),
    authenticateApiKey,
    validateWeddingSlug,
    (req, res, next) => {
        console.log(`[${req.requestId}] Admin media access - showing all media including pending approval`);
        next();
    },
    weddingController.getMediaList
);

// POST /weddings/:slug/timeline - Add timeline event (admin only)
router.post('/:slug/timeline',
    logControllerAction('WeddingController', 'addTimelineEvent'),
    authenticateApiKey,
    validateWeddingSlug,
    validateTimeline,
    weddingController.addTimelineEvent
);

// PUT /weddings/:slug/timeline/:eventId - Update timeline event (admin only)
router.put('/:slug/timeline/:eventId',
    logControllerAction('WeddingController', 'updateTimelineEvent'),
    authenticateApiKey,
    validateWeddingSlug,
    validateTimeline,
    weddingController.updateTimelineEvent
);

// DELETE /weddings/:slug/timeline/:eventId - Delete timeline event (admin only)
router.delete('/:slug/timeline/:eventId',
    logControllerAction('WeddingController', 'deleteTimelineEvent'),
    authenticateApiKey,
    validateWeddingSlug,
    weddingController.deleteTimelineEvent
);

// POST /weddings/:slug/upload-official - Upload official media (admin only)
router.post('/:slug/upload-official',
    logControllerAction('MediaController', 'uploadOfficialMedia'),
    authenticateApiKey,
    validateWeddingSlug,
    mediaController.upload.single('media'),
    mediaController.uploadOfficialMedia
);

// PUT /weddings/:slug/media/:mediaId/moderate - Approve/reject media (admin only)
router.put('/:slug/media/:mediaId/moderate',
    logControllerAction('MediaController', 'moderateMedia'),
    authenticateApiKey,
    validateWeddingSlug,
    mediaController.moderateMedia
);

// DELETE /weddings/:slug/media/:mediaId - Delete media (admin only)
router.delete('/:slug/media/:mediaId',
    logControllerAction('WeddingController', 'deleteMedia'),
    authenticateApiKey,
    validateWeddingSlug,
    weddingController.deleteMedia
);

// Gift management routes (admin only)
// POST /weddings/:slug/gifts - Add gift to registry (admin only)
router.post('/:slug/gifts',
    logControllerAction('GiftController', 'addGift'),
    authenticateApiKey,
    validateWeddingSlug,
    validateGift,
    giftController.addGift
);

// PUT /weddings/:slug/gifts/:giftId - Update gift (admin only)
router.put('/:slug/gifts/:giftId',
    logControllerAction('GiftController', 'updateGift'),
    authenticateApiKey,
    validateWeddingSlug,
    validateGift,
    giftController.updateGift
);

// DELETE /weddings/:slug/gifts/:giftId - Delete gift (admin only)
router.delete('/:slug/gifts/:giftId',
    logControllerAction('GiftController', 'deleteGift'),
    authenticateApiKey,
    validateWeddingSlug,
    giftController.deleteGift
);

// PUT /weddings/:slug/gifts/:giftId/received - Mark gift as received (admin only)
router.put('/:slug/gifts/:giftId/received',
    logControllerAction('GiftController', 'markGiftReceived'),
    authenticateApiKey,
    validateWeddingSlug,
    giftController.markGiftReceived
);

// GET /weddings/:slug/gifts/stats - Get gift statistics (admin only)
router.get('/:slug/gifts/stats',
    logControllerAction('GiftController', 'getGiftStats'),
    authenticateApiKey,
    validateWeddingSlug,
    giftController.getGiftStats
);

// PUT /weddings/:slug/config - Update wedding configuration (admin only)
router.put('/:slug/config',
    logControllerAction('WeddingController', 'updateWeddingConfig'),
    authenticateApiKey,
    validateWeddingSlug,
    validateWeddingConfig,
    weddingController.updateWeddingConfig
);

// Super admin routes (require admin secret)
// POST /weddings - Create new wedding (super admin only)
router.post('/',
    logControllerAction('WeddingController', 'createWedding'),
    authenticateAdmin,
    weddingController.createWedding
);

// GET /weddings - List all weddings (super admin only) - for management purposes
router.get('/',
    logControllerAction('WeddingController', 'listAllWeddings'),
    authenticateAdmin,
    async (req, res) => {
        try {
            const requestId = req.requestId;
            console.log(`[${requestId}] Listing all weddings for super admin`);

            const Wedding = require('../models/Wedding');
            const weddings = await Wedding.find({})
                .select('-apiKey') // Don't expose API keys
                .sort({ createdAt: -1 });

            console.log(`[${requestId}] Found ${weddings.length} weddings`);
            weddings.forEach((wedding, index) => {
                console.log(`[${requestId}] Wedding ${index + 1}: ${wedding.slug} (${wedding.coupleNames.bride} & ${wedding.coupleNames.groom})`);
            });

            res.json(weddings);
        } catch (error) {
            console.error(`[${req.requestId}] List weddings error:`, error);
            res.status(500).json({ error: 'Failed to list weddings' });
        }
    }
);

// GET /weddings/:slug/stats - Get wedding statistics (super admin only)
router.get('/:slug/stats',
    logControllerAction('WeddingController', 'getWeddingStats'),
    authenticateAdmin,
    validateWeddingSlug,
    async (req, res) => {
        try {
            const { slug } = req.params;
            const requestId = req.requestId;

            console.log(`[${requestId}] Generating comprehensive statistics for wedding: ${slug}`);

            const Guest = require('../models/Guest');
            const Timeline = require('../models/Timeline');
            const Media = require('../models/Media');
            const Gift = require('../models/Gift');

            const [guestStats, timelineCount, mediaStats, giftStats] = await Promise.all([
                Guest.aggregate([
                    { $match: { weddingSlug: slug } },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            attending: { $sum: { $cond: ['$attending', 1, 0] } },
                            notAttending: { $sum: { $cond: ['$attending', 0, 1] } },
                            withPlusOne: { $sum: { $cond: ['$plusOne', 1, 0] } }
                        }
                    }
                ]),
                Timeline.countDocuments({ weddingSlug: slug }),
                Media.aggregate([
                    { $match: { weddingSlug: slug } },
                    {
                        $group: {
                            _id: '$category',
                            count: { $sum: 1 },
                            totalSize: { $sum: '$size' }
                        }
                    }
                ]),
                Gift.aggregate([
                    { $match: { weddingSlug: slug } },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            received: { $sum: { $cond: ['$isReceived', 1, 0] } }
                        }
                    }
                ])
            ]);

            const result = {
                guests: guestStats[0] || { total: 0, attending: 0, notAttending: 0, withPlusOne: 0 },
                timelineEvents: timelineCount,
                media: mediaStats.reduce((acc, item) => {
                    acc[item._id] = { count: item.count, totalSize: item.totalSize };
                    return acc;
                }, {}),
                gifts: giftStats[0] || { total: 0, received: 0 }
            };

            console.log(`[${requestId}] Wedding statistics:`, result);

            res.json(result);
        } catch (error) {
            console.error(`[${req.requestId}] Get wedding stats error:`, error);
            res.status(500).json({ error: 'Failed to get wedding statistics' });
        }
    }
);

// Error handling for multer
router.use((error, req, res, next) => {
    const requestId = req.requestId;

    if (error instanceof multer.MulterError) {
        console.error(`[${requestId}] Multer error:`, error);
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
        }
    }

    if (error.message.includes('Invalid file type')) {
        console.error(`[${requestId}] Invalid file type error:`, error.message);
        return res.status(400).json({ error: error.message });
    }

    console.error(`[${requestId}] Unhandled route error:`, error);
    next(error);
});

module.exports = router; 