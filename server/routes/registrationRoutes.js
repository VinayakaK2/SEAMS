const express = require('express');
const router = express.Router();
const { registerForEvent, verifyAttendance, verifyAttendanceSelf, getMyRegistrations } = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, registerForEvent);
router.get('/my', protect, getMyRegistrations);
router.post('/verify', protect, authorize('coordinator', 'faculty', 'admin'), verifyAttendance);
router.post('/verify-self', protect, verifyAttendanceSelf);

module.exports = router;
