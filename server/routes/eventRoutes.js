const express = require('express');
const router = express.Router();
const { createEvent, getEvents, getEventById, generateEventQR, updateEventStatus, updateEvent, deleteEvent, getCoordinatorStats } = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(getEvents)
    .post(protect, authorize('coordinator', 'faculty', 'admin'), createEvent);

router.get('/coordinator/stats', protect, authorize('coordinator', 'faculty', 'admin'), getCoordinatorStats);

router.route('/:id')
    .get(getEventById)
    .put(protect, authorize('coordinator', 'faculty', 'admin'), updateEvent)
    .delete(protect, authorize('coordinator', 'faculty', 'admin'), deleteEvent);

router.route('/:id/status')
    .put(protect, authorize('admin'), updateEventStatus);

router.route('/:id/qr')
    .post(protect, authorize('coordinator', 'faculty', 'admin'), generateEventQR);

module.exports = router;
