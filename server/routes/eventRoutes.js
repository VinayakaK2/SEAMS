const express = require('express');
const router = express.Router();
const { 
    createEvent, getEvents, getEventById, generateEventQR, 
    updateEventStatus, updateEvent, deleteEvent, getCoordinatorStats, 
    likeEvent, skipEvent, dislikeEvent, recordImpression 
} = require('../controllers/eventController');
const { getRecommendedEvents } = require('../controllers/recommendationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(getEvents)
    .post(protect, authorize('coordinator', 'faculty', 'admin'), createEvent);

router.get('/coordinator/stats', protect, authorize('coordinator', 'faculty', 'admin'), getCoordinatorStats);

// Recommendations — MUST be before /:id or Express will treat 'recommended' as an ID
router.get('/recommended', protect, getRecommendedEvents);

router.route('/:id')
    .get(getEventById)
    .put(protect, authorize('coordinator', 'faculty', 'admin'), updateEvent)
    .delete(protect, authorize('coordinator', 'faculty', 'admin'), deleteEvent);

router.route('/:id/status')
    .put(protect, authorize('admin'), updateEventStatus);

router.route('/:id/qr')
    .post(protect, authorize('coordinator', 'faculty', 'admin'), generateEventQR);

router.route('/:id/like')
    .post(protect, likeEvent);

router.route('/:id/skip')
    .post(protect, skipEvent);

router.route('/:id/dislike')
    .post(protect, dislikeEvent);

router.route('/:id/impression')
    .post(protect, recordImpression);

module.exports = router;

