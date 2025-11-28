const express = require('express');
const router = express.Router();
const { loginUser, registerUser, forgotPassword, resetPassword, verifyEmail } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);
router.get('/verifyemail/:verificationToken', verifyEmail);

module.exports = router;
