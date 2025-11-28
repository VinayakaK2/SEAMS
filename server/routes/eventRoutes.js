const express = require('express');
const router = express.Router();
const { createEvent, getEvents, getEventById, generateEventQR } = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(getEvents)
    .post(protect, authorize('coordinator', 'faculty', 'admin'), createEvent);

router.route('/:id')
    .get(getEventById);

router.route('/:id/qr')
    .post(protect, authorize('coordinator', 'faculty', 'admin'), generateEventQR);

module.exports = router;
