const Wedding = require('../models/Wedding');
const Guest = require('../models/Guest');
const Timeline = require('../models/Timeline');
const Media = require('../models/Media');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Get wedding configuration for frontend
const getWeddingConfig = async (req, res) => {
    try {
        const { slug } = req.params;
        const wedding = req.wedding;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.getWeddingConfig - Fetching config for wedding: ${slug}`);
        console.log(`[${requestId}] Wedding found: ${wedding.coupleNames.bride} & ${wedding.coupleNames.groom}`);
        console.log(`[${requestId}] Wedding status: ${wedding.isActive ? 'Active' : 'Inactive'}`);
        console.log(`[${requestId}] Wedding date: ${wedding.weddingDate}`);
        console.log(`[${requestId}] Privacy setting: ${wedding.config?.isPrivate ? 'Private' : 'Public'}`);

        const config = {
            slug: wedding.slug,
            coupleNames: wedding.coupleNames,
            weddingDate: wedding.weddingDate,
            config: wedding.config,
            isActive: wedding.isActive
        };

        console.log(`[${requestId}] Successfully retrieved wedding config`);
        res.json(config);
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.getWeddingConfig ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { slug: req.params.slug, message: error.message });
        res.status(500).json({ error: 'Failed to get wedding configuration' });
    }
};

// Get wedding timeline
const getTimeline = async (req, res) => {
    try {
        const { slug } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.getTimeline - Fetching timeline for wedding: ${slug}`);

        const timeline = await Timeline.find({ weddingSlug: slug })
            .sort({ time: 1, order: 1 });

        console.log(`[${requestId}] Timeline events found: ${timeline.length}`);
        timeline.forEach((event, index) => {
            console.log(`[${requestId}] Event ${index + 1}: ${event.title} at ${event.time} (${event.category})`);
        });

        res.json(timeline);
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.getTimeline ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { slug: req.params.slug, message: error.message });
        res.status(500).json({ error: 'Failed to get timeline' });
    }
};

// Add timeline event
const addTimelineEvent = async (req, res) => {
    try {
        const { slug } = req.params;
        const timelineData = { ...req.body, weddingSlug: slug };
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.addTimelineEvent - Adding event for wedding: ${slug}`);
        console.log(`[${requestId}] Event details:`, {
            title: timelineData.title,
            time: timelineData.time,
            category: timelineData.category,
            description: timelineData.description
        });

        const timeline = new Timeline(timelineData);
        await timeline.save();

        console.log(`[${requestId}] Timeline event created successfully with ID: ${timeline._id}`);
        res.status(201).json(timeline);
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.addTimelineEvent ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            eventData: req.body,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to add timeline event' });
    }
};

// Update timeline event
const updateTimelineEvent = async (req, res) => {
    try {
        const { slug, eventId } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.updateTimelineEvent - Updating event ${eventId} for wedding: ${slug}`);
        console.log(`[${requestId}] Update data:`, req.body);

        const timeline = await Timeline.findOneAndUpdate(
            { _id: eventId, weddingSlug: slug },
            req.body,
            { new: true, runValidators: true }
        );

        if (!timeline) {
            console.log(`[${requestId}] Timeline event not found: ${eventId}`);
            return res.status(404).json({ error: 'Timeline event not found' });
        }

        console.log(`[${requestId}] Timeline event updated successfully`);
        res.json(timeline);
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.updateTimelineEvent ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            eventId: req.params.eventId,
            updateData: req.body,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to update timeline event' });
    }
};

// Delete timeline event
const deleteTimelineEvent = async (req, res) => {
    try {
        const { slug, eventId } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.deleteTimelineEvent - Deleting event ${eventId} for wedding: ${slug}`);

        const timeline = await Timeline.findOneAndDelete({
            _id: eventId,
            weddingSlug: slug
        });

        if (!timeline) {
            console.log(`[${requestId}] Timeline event not found for deletion: ${eventId}`);
            return res.status(404).json({ error: 'Timeline event not found' });
        }

        console.log(`[${requestId}] Timeline event deleted successfully: ${timeline.title}`);
        res.json({ message: 'Timeline event deleted successfully' });
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.deleteTimelineEvent ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            eventId: req.params.eventId,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to delete timeline event' });
    }
};

// Submit RSVP
const submitRSVP = async (req, res) => {
    try {
        const { slug } = req.params;
        const guestData = { ...req.body, weddingSlug: slug };
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.submitRSVP - Processing RSVP for wedding: ${slug}`);
        console.log(`[${requestId}] Guest details:`, {
            name: guestData.name,
            attending: guestData.attending,
            plusOne: guestData.plusOne,
            email: guestData.email
        });

        // Check if guest already exists
        const existingGuest = await Guest.findOne({
            weddingSlug: slug,
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') }
        });

        if (existingGuest) {
            console.log(`[${requestId}] Updating existing RSVP for guest: ${existingGuest.name}`);
            console.log(`[${requestId}] Previous status: attending=${existingGuest.attending}, plusOne=${existingGuest.plusOne}`);

            // Update existing RSVP
            Object.assign(existingGuest, guestData);
            await existingGuest.save();

            console.log(`[${requestId}] RSVP updated successfully`);
            res.json({ message: 'RSVP updated successfully', guest: existingGuest });
        } else {
            console.log(`[${requestId}] Creating new RSVP entry`);

            // Create new RSVP
            const guest = new Guest(guestData);
            await guest.save();

            console.log(`[${requestId}] New RSVP created with ID: ${guest._id}`);
            res.status(201).json({ message: 'RSVP submitted successfully', guest });
        }
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.submitRSVP ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            guestData: req.body,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to submit RSVP' });
    }
};

// Get RSVP list (admin only)
const getRSVPList = async (req, res) => {
    try {
        const { slug } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.getRSVPList - Fetching RSVP list for wedding: ${slug}`);

        const guests = await Guest.find({ weddingSlug: slug })
            .sort({ submittedAt: -1 });

        const stats = {
            total: guests.length,
            attending: guests.filter(g => g.attending).length,
            notAttending: guests.filter(g => !g.attending).length,
            withPlusOne: guests.filter(g => g.plusOne).length
        };

        console.log(`[${requestId}] RSVP Statistics:`, stats);
        console.log(`[${requestId}] Guests breakdown:`);
        guests.forEach((guest, index) => {
            console.log(`[${requestId}] Guest ${index + 1}: ${guest.name} - ${guest.attending ? 'Attending' : 'Not Attending'}${guest.plusOne ? ' (+1)' : ''}`);
        });

        res.json({ guests, stats });
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.getRSVPList ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { slug: req.params.slug, message: error.message });
        res.status(500).json({ error: 'Failed to get RSVP list' });
    }
};

// Get media list
const getMediaList = async (req, res) => {
    try {
        const { slug } = req.params;
        const { category = 'all', isApproved } = req.query;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.getMediaList - Fetching media for wedding: ${slug}`);
        console.log(`[${requestId}] Filter - Category: ${category}, IsApproved: ${isApproved}`);

        let filter = { weddingSlug: slug };

        if (category !== 'all') {
            filter.category = category;
        }

        // Filter by approval status if specified (public endpoint sets this to true)
        if (isApproved !== undefined) {
            filter.isApproved = isApproved === 'true' || isApproved === true;
        }

        const media = await Media.find(filter)
            .sort({ uploadedAt: -1 });

        console.log(`[${requestId}] Media items found: ${media.length}`);
        const mediaStats = media.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {});
        console.log(`[${requestId}] Media by category:`, mediaStats);

        res.json(media);
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.getMediaList ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            category: req.query.category,
            isApproved: req.query.isApproved,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to get media list' });
    }
};

// Delete media
const deleteMedia = async (req, res) => {
    try {
        const { slug, mediaId } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.deleteMedia - Deleting media ${mediaId} for wedding: ${slug}`);

        const media = await Media.findOneAndDelete({
            _id: mediaId,
            weddingSlug: slug
        });

        if (!media) {
            console.log(`[${requestId}] Media not found for deletion: ${mediaId}`);
            return res.status(404).json({ error: 'Media not found' });
        }

        console.log(`[${requestId}] Media deleted successfully:`, {
            filename: media.filename,
            type: media.type,
            uploader: media.uploaderName
        });

        // TODO: Delete from Bunny.net CDN

        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.deleteMedia ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            mediaId: req.params.mediaId,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to delete media' });
    }
};

// Update wedding configuration
const updateWeddingConfig = async (req, res) => {
    try {
        const { slug } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.updateWeddingConfig - Updating config for wedding: ${slug}`);
        console.log(`[${requestId}] Config updates:`, req.body);

        const wedding = await Wedding.findOneAndUpdate(
            { slug: slug },
            req.body,
            { new: true, runValidators: true }
        );

        if (!wedding) {
            console.log(`[${requestId}] Wedding not found for config update: ${slug}`);
            return res.status(404).json({ error: 'Wedding not found' });
        }

        console.log(`[${requestId}] Wedding configuration updated successfully`);
        res.json(wedding);
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.updateWeddingConfig ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            updateData: req.body,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to update wedding configuration' });
    }
};

// Generate QR code for wedding website
const generateQRCode = async (req, res) => {
    try {
        const { slug } = req.params;
        const wedding = req.wedding;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.generateQRCode - Generating QR code for wedding: ${slug}`);

        const websiteUrl = wedding.config.customDomain
            ? `https://${wedding.config.customDomain}`
            : `https://${slug}.weddingservice.com`;

        console.log(`[${requestId}] Target URL: ${websiteUrl}`);
        console.log(`[${requestId}] QR code color: ${wedding.config.primaryColor || '#000000'}`);

        const qrCodeDataURL = await QRCode.toDataURL(websiteUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: wedding.config.primaryColor || '#000000',
                light: '#FFFFFF'
            },
            width: 256
        });

        console.log(`[${requestId}] QR code generated successfully`);

        res.json({
            qrCode: qrCodeDataURL,
            url: websiteUrl
        });
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.generateQRCode ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { slug: req.params.slug, message: error.message });
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
};

// Create new wedding (admin only)
const createWedding = async (req, res) => {
    try {
        const {
            slug,
            coupleNames,
            weddingDate,
            config = {},
            expirationYears = 1
        } = req.body;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.createWedding - Creating new wedding: ${slug}`);
        console.log(`[${requestId}] Couple: ${coupleNames?.bride} & ${coupleNames?.groom}`);
        console.log(`[${requestId}] Wedding date: ${weddingDate}`);
        console.log(`[${requestId}] Expiration years: ${expirationYears}`);

        // Check if slug already exists
        const existingWedding = await Wedding.findOne({ slug });
        if (existingWedding) {
            console.log(`[${requestId}] Wedding slug already exists: ${slug}`);
            return res.status(400).json({ error: 'Wedding slug already exists' });
        }

        // Generate API key
        const apiKey = uuidv4();
        console.log(`[${requestId}] Generated API key for wedding: ${apiKey.substring(0, 8)}...`);

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + expirationYears);
        console.log(`[${requestId}] Wedding will expire at: ${expiresAt}`);

        const wedding = new Wedding({
            slug,
            coupleNames,
            weddingDate: new Date(weddingDate),
            config,
            apiKey,
            expiresAt
        });

        await wedding.save();

        console.log(`[${requestId}] Wedding created successfully with ID: ${wedding._id}`);

        res.status(201).json({
            message: 'Wedding created successfully',
            wedding: {
                ...wedding.toObject(),
                // Don't expose API key in response for security
                apiKey: undefined
            },
            apiKey // Send separately for initial setup
        });
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.createWedding ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            weddingData: req.body,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to create wedding' });
    }
};

// Check passcode for private weddings
const checkPasscode = async (req, res) => {
    try {
        const { slug } = req.params;
        const { passcode } = req.body;
        const wedding = req.wedding;
        const requestId = req.requestId;

        console.log(`[${requestId}] WeddingController.checkPasscode - Checking passcode for wedding: ${slug}`);
        console.log(`[${requestId}] Wedding privacy setting: ${wedding.config?.isPrivate ? 'Private' : 'Public'}`);

        if (!wedding.config.isPrivate) {
            console.log(`[${requestId}] Wedding is public, no passcode required`);
            return res.json({ valid: true, message: 'Wedding is public' });
        }

        if (!passcode) {
            console.log(`[${requestId}] No passcode provided for private wedding`);
            return res.status(400).json({ error: 'Passcode required' });
        }

        const isValid = passcode === wedding.config.passcode;
        console.log(`[${requestId}] Passcode validation result: ${isValid ? 'Valid' : 'Invalid'}`);

        res.json({
            valid: isValid,
            message: isValid ? 'Passcode valid' : 'Invalid passcode'
        });
    } catch (error) {
        console.error(`[${req.requestId}] WeddingController.checkPasscode ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, {
            slug: req.params.slug,
            hasPasscode: !!req.body.passcode,
            message: error.message
        });
        res.status(500).json({ error: 'Failed to check passcode' });
    }
};

module.exports = {
    getWeddingConfig,
    getTimeline,
    addTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    submitRSVP,
    getRSVPList,
    getMediaList,
    deleteMedia,
    updateWeddingConfig,
    generateQRCode,
    createWedding,
    checkPasscode
}; 