const express = require('express');
const router = express.Router();
const { loginUser, registerUser, forgotPassword, resetPassword, verifyEmail } = require('../controllers/authController');
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require('../middleware/limiter');

router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/forgotpassword', forgotPasswordLimiter, forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);
router.get('/verifyemail/:verificationToken', verifyEmail);


// Temporary setup endpoint - DELETE after creating admin
router.get('/setup-admin', async (req, res) => {
    try {
        const db = require('../db');
        const bcrypt = require('bcryptjs');

        // Check if admin exists
        const existingAdmin = await db('users').where({ email: 'admin@seams.edu' }).first();
        if (existingAdmin) {
            return res.json({ message: 'Admin already exists!', email: 'admin@seams.edu' });
        }

        // Create admin with securely hashed password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash('admin123', salt);

        await db('users').insert({
            name: 'System Administrator',
            email: 'admin@seams.edu',
            password_hash,
            role: 'admin',
            isEmailVerified: true,
            usn: 'ADMIN001',
            branch: 'Administration',
            semester: 'N/A'
        });

        res.json({
            success: true,
            message: 'Admin created successfully! Please change password after login and DELETE this endpoint.',
            email: 'admin@seams.edu'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
