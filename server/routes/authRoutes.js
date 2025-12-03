const express = require('express');
const router = express.Router();
const { loginUser, registerUser, forgotPassword, resetPassword, verifyEmail } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resetToken', resetPassword);
router.get('/verifyemail/:verificationToken', verifyEmail);

// Temporary setup endpoint - DELETE after creating admin
router.get('/setup-admin', async (req, res) => {
    try {
        const User = require('../models/User');
        const bcrypt = require('bcryptjs');

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: 'admin@seams.edu' });
        if (existingAdmin) {
            return res.json({ message: 'Admin already exists!', email: 'admin@seams.edu' });
        }

        // Create admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const admin = new User({
            name: 'System Administrator',
            email: 'admin@seams.edu',
            password: hashedPassword,
            role: 'admin',
            isEmailVerified: true,
            usn: 'ADMIN001',
            branch: 'Administration',
            semester: 'N/A'
        });

        await admin.save();

        res.json({
            success: true,
            message: 'Admin created successfully!',
            credentials: {
                email: 'admin@seams.edu',
                password: 'admin123'
            },
            warning: 'Please change password after login and DELETE this endpoint!'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
