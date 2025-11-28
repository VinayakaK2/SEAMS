const express = require('express');
const router = express.Router();
const { getUserProfile, getUserHistory, getUsers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin'), getUsers);
router.get('/profile', protect, getUserProfile);
router.get('/history', protect, getUserHistory);

module.exports = router;
