const Gift = require('../models/Gift');

// Get all gifts for a wedding
const getGifts = async (req, res) => {
    try {
        const { slug } = req.params;
        const { category, received } = req.query;
        const requestId = req.requestId;

        console.log(`[${requestId}] GiftController.getGifts - Fetching gifts for wedding: ${slug}`);
        console.log(`[${requestId}] Filters - Category: ${category || 'all'}, Received: ${received || 'all'}`);

        let filter = { weddingSlug: slug };

        if (category && category !== 'all') {
            filter.category = category;
            console.log(`[${requestId}] Applying category filter: ${category}`);
        }

        if (received !== undefined) {
            filter.isReceived = received === 'true';
            console.log(`[${requestId}] Applying received filter: ${received}`);
        }

        const gifts = await Gift.find(filter)
            .sort({ order: 1, createdAt: 1 });

        console.log(`[${requestId}] Gifts found: ${gifts.length}`);
        const giftStats = {
            total: gifts.length,
            received: gifts.filter(g => g.isReceived).length,
            pending: gifts.filter(g => !g.isReceived).length,
            byCategory: gifts.reduce((acc, gift) => {
                acc[gift.category] = (acc[gift.category] || 0) + 1;
                return acc;
            }, {}),
            byPriority: gifts.reduce((acc, gift) => {
                acc[gift.priority] = (acc[gift.priority] || 0) + 1;
                return acc;
            }, {})
        };
        console.log(`[${requestId}] Gift statistics:`, giftStats);

        res.json(gifts);
    } catch (error) {
        console.error(`[${req.requestId}] GiftController.getGifts ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { 
            slug: req.params.slug, 
            category: req.query.category, 
            received: req.query.received, 
            message: error.message 
        });
        res.status(500).json({ error: 'Failed to get gifts' });
    }
};

// Add new gift (admin only)
const addGift = async (req, res) => {
    try {
        const { slug } = req.params;
        const giftData = { ...req.body, weddingSlug: slug };
        const requestId = req.requestId;

        console.log(`[${requestId}] GiftController.addGift - Adding gift for wedding: ${slug}`);
        console.log(`[${requestId}] Gift details:`, { 
            name: giftData.name, 
            category: giftData.category, 
            priority: giftData.priority,
            estimatedPrice: giftData.estimatedPrice 
        });

        const gift = new Gift(giftData);
        await gift.save();

        console.log(`[${requestId}] Gift created successfully with ID: ${gift._id}`);
        console.log(`[${requestId}] Gift added: "${gift.name}" in ${gift.category} category`);
        
        res.status(201).json(gift);
    } catch (error) {
        console.error(`[${req.requestId}] GiftController.addGift ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { 
            slug: req.params.slug, 
            giftData: req.body, 
            message: error.message 
        });
        res.status(500).json({ error: 'Failed to add gift' });
    }
};

// Update gift (admin only)
const updateGift = async (req, res) => {
    try {
        const { slug, giftId } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] GiftController.updateGift - Updating gift ${giftId} for wedding: ${slug}`);
        console.log(`[${requestId}] Update data:`, req.body);

        const gift = await Gift.findOneAndUpdate(
            { _id: giftId, weddingSlug: slug },
            req.body,
            { new: true, runValidators: true }
        );

        if (!gift) {
            console.log(`[${requestId}] Gift not found: ${giftId}`);
            return res.status(404).json({ error: 'Gift not found' });
        }

        console.log(`[${requestId}] Gift updated successfully: "${gift.name}"`);
        console.log(`[${requestId}] Updated fields:`, Object.keys(req.body));

        res.json(gift);
    } catch (error) {
        console.error(`[${req.requestId}] GiftController.updateGift ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { 
            slug: req.params.slug, 
            giftId: req.params.giftId, 
            updateData: req.body, 
            message: error.message 
        });
        res.status(500).json({ error: 'Failed to update gift' });
    }
};

// Delete gift (admin only)
const deleteGift = async (req, res) => {
    try {
        const { slug, giftId } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] GiftController.deleteGift - Deleting gift ${giftId} for wedding: ${slug}`);

        const gift = await Gift.findOneAndDelete({
            _id: giftId,
            weddingSlug: slug
        });

        if (!gift) {
            console.log(`[${requestId}] Gift not found for deletion: ${giftId}`);
            return res.status(404).json({ error: 'Gift not found' });
        }

        console.log(`[${requestId}] Gift deleted successfully:`, { 
            name: gift.name, 
            category: gift.category, 
            wasReceived: gift.isReceived 
        });

        res.json({ message: 'Gift deleted successfully' });
    } catch (error) {
        console.error(`[${req.requestId}] GiftController.deleteGift ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { 
            slug: req.params.slug, 
            giftId: req.params.giftId, 
            message: error.message 
        });
        res.status(500).json({ error: 'Failed to delete gift' });
    }
};

// Mark gift as received (admin only)
const markGiftReceived = async (req, res) => {
    try {
        const { slug, giftId } = req.params;
        const { receivedFrom, notes } = req.body;
        const requestId = req.requestId;

        console.log(`[${requestId}] GiftController.markGiftReceived - Marking gift ${giftId} as received for wedding: ${slug}`);
        console.log(`[${requestId}] Received from: ${receivedFrom || 'Not specified'}`);
        console.log(`[${requestId}] Notes: ${notes || 'None'}`);

        const gift = await Gift.findOneAndUpdate(
            { _id: giftId, weddingSlug: slug },
            {
                isReceived: true,
                receivedFrom,
                receivedDate: new Date(),
                notes
            },
            { new: true, runValidators: true }
        );

        if (!gift) {
            console.log(`[${requestId}] Gift not found for marking as received: ${giftId}`);
            return res.status(404).json({ error: 'Gift not found' });
        }

        console.log(`[${requestId}] Gift marked as received successfully:`, { 
            name: gift.name, 
            receivedFrom: gift.receivedFrom, 
            receivedDate: gift.receivedDate 
        });

        res.json(gift);
    } catch (error) {
        console.error(`[${req.requestId}] GiftController.markGiftReceived ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { 
            slug: req.params.slug, 
            giftId: req.params.giftId, 
            receivedData: req.body, 
            message: error.message 
        });
        res.status(500).json({ error: 'Failed to mark gift as received' });
    }
};

// Get gift statistics
const getGiftStats = async (req, res) => {
    try {
        const { slug } = req.params;
        const requestId = req.requestId;

        console.log(`[${requestId}] GiftController.getGiftStats - Generating statistics for wedding: ${slug}`);

        const stats = await Gift.aggregate([
            { $match: { weddingSlug: slug } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    received: { $sum: { $cond: ['$isReceived', 1, 0] } },
                    pending: { $sum: { $cond: ['$isReceived', 0, 1] } },
                    byCategory: {
                        $push: {
                            category: '$category',
                            isReceived: '$isReceived'
                        }
                    }
                }
            }
        ]);

        const categoryStats = {};
        if (stats[0]) {
            stats[0].byCategory.forEach(item => {
                if (!categoryStats[item.category]) {
                    categoryStats[item.category] = { total: 0, received: 0 };
                }
                categoryStats[item.category].total++;
                if (item.isReceived) {
                    categoryStats[item.category].received++;
                }
            });
        }

        const result = {
            overview: stats[0] || { total: 0, received: 0, pending: 0 },
            categories: categoryStats
        };

        console.log(`[${requestId}] Gift statistics generated:`, result.overview);
        console.log(`[${requestId}] Category breakdown:`, Object.keys(categoryStats).length, 'categories');
        Object.entries(categoryStats).forEach(([category, data]) => {
            console.log(`[${requestId}] ${category}: ${data.received}/${data.total} received`);
        });

        res.json(result);
    } catch (error) {
        console.error(`[${req.requestId}] GiftController.getGiftStats ERROR:`, error);
        console.error(`[${req.requestId}] Error details:`, { slug: req.params.slug, message: error.message });
        res.status(500).json({ error: 'Failed to get gift statistics' });
    }
};

module.exports = {
    getGifts,
    addGift,
    updateGift,
    deleteGift,
    markGiftReceived,
    getGiftStats
}; 