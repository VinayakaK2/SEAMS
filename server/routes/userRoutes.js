const express = require('express');
const router = express.Router();
const { getUserProfile, getUserHistory, getUsers, createUser, updateUser, deleteUser, updateProfile } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, authorize('admin'), getUsers)
    .post(protect, authorize('admin'), createUser);

router.route('/:id')
    .put(protect, authorize('admin'), updateUser)
    .delete(protect, authorize('admin'), deleteUser);

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateProfile);

router.get('/history', protect, getUserHistory);

module.exports = router;
