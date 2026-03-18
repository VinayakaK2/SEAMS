const express = require('express');
const router = express.Router();
const { getTopEvents, getABPerformance, getUserSegments, getMetricsOverview, getModelPerformance } = require('../controllers/adminMetricsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin metrics endpoints are protected and restricted to admins
router.get('/metrics/overview', protect, authorize('admin'), getMetricsOverview);
router.get('/metrics/top-events', protect, authorize('admin'), getTopEvents);
router.get('/metrics/ab-performance', protect, authorize('admin'), getABPerformance);
router.get('/metrics/user-segments', protect, authorize('admin'), getUserSegments);
router.get('/metrics/model-performance', protect, authorize('admin'), getModelPerformance);

module.exports = router;
