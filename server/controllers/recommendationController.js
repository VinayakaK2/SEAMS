/**
 * Recommendation Controller — controllers/recommendationController.js
 * 
 * Thin controller — all logic lives in recommendationService.js.
 * Returns personalised event list ranked by relevance score.
 */
const { getRecommendations } = require('../services/recommendationService');

// @desc    Get personalised event recommendations for the logged-in user
// @route   GET /api/events/recommended
// @access  Private (Student, Coordinator, Faculty)
const getRecommendedEvents = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await getRecommendations(userId, page, limit);

        res.json(result);
    } catch (error) {
        console.error('getRecommendedEvents error:', error);
        res.status(500).json({ message: 'Could not fetch recommendations' });
    }
};

module.exports = { getRecommendedEvents };
