const express = require('express');
const router = express.Router();
const { registerForEvent, verifyAttendance, verifyAttendanceSelf, getMyRegistrations, getEventRegistrations } = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { qrScanLimiter } = require('../middleware/limiter');

router.get('/', protect, authorize('coordinator', 'faculty', 'admin'), getEventRegistrations);
router.post('/', protect, registerForEvent);
router.get('/my', protect, getMyRegistrations);
router.post('/verify', protect, authorize('coordinator', 'faculty', 'admin'), qrScanLimiter, verifyAttendance);
router.post('/verify-self', protect, qrScanLimiter, verifyAttendanceSelf);


module.exports = router;
