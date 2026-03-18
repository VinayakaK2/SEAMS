const db = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            usn: user.usn,
            branch: user.branch,
            semester: user.semester
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '30d',
        }
    );
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
        const user = await db('users').where({ email: normalizedEmail }).first();

        if (user && (await bcrypt.compare(password, user.password_hash))) {
            // Check if email is verified
            if (!user.isEmailVerified) {
                return res.status(401).json({ message: 'Please verify your email before logging in' });
            }

            res.json({
                _id: user.id,
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                usn: user.usn,
                branch: user.branch,
                semester: user.semester,
                token: generateToken(user),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role, usn, branch, semester, department, phone } = req.body;

    // Input validation
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const allowedRoles = ['student', 'coordinator', 'faculty', 'admin'];
    if (role && !allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
        const userExists = await db('users').where({ email: normalizedEmail }).first();

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate email verification token
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');

        // Hash password securely
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const [newUser] = await db('users').insert({
            name,
            email: normalizedEmail,
            password_hash,
            role: role || 'student',
            usn,
            branch,
            semester,
            department,
            phone,
            isEmailVerified: false,
            emailVerificationToken: hashedToken,
            emailVerificationExpire: emailVerificationExpire,
        }).returning('*');

        if (newUser) {
            // Create verification URL
            const verificationUrl = `http://localhost:5173/verify-email/${verificationToken}`;

            const message = `Welcome to SEAMS! Please verify your email by clicking on the following link:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.`;

            console.log('----------------------------------------------------');
            console.log('EMAIL VERIFICATION LINK (Copy this if email fails):');
            console.log(verificationUrl);
            console.log('User Email:', newUser.email);
            console.log('----------------------------------------------------');

            try {
                await sendEmail({
                    email: newUser.email,
                    subject: 'SEAMS - Email Verification',
                    message,
                });

                res.status(201).json({
                    success: true,
                    message: 'Registration successful! Please check your email to verify your account.',
                });
            } catch (err) {
                // If email fails, delete the user
                await db('users').where({ id: newUser.id }).del();
                console.error('Email send error:', err);
                return res.status(500).json({ message: 'Could not send verification email. Please try again.' });
            }
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Registration server error' });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    console.log('Forgot Password Request for:', email);

    try {
        const isEmail = email.includes('@');
        let query;

        if (isEmail) {
            query = db('users').where({ email: email.toLowerCase() });
        } else {
            query = db('users').where({ usn: email });
        }

        const user = await query.first();
        console.log('User found:', user ? user.email : 'No user');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.email) {
            return res.status(400).json({ message: 'User has no email address linked' });
        }

        // Get reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire
        const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        console.log('About to save user with reset token...');
        try {
            await db('users').where({ id: user.id }).update({
                resetPasswordToken,
                resetPasswordExpire
            });
            console.log('User saved successfully with reset token');
        } catch (saveError) {
            console.error('Error saving user:', saveError);
            throw saveError;
        }

        // Create reset url
        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

        console.log('----------------------------------------------------');
        console.log('RESET PASSWORD LINK (Copy this if email fails):');
        console.log(resetUrl);
        console.log('----------------------------------------------------');

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Token',
                message,
            });

            res.status(200).json({ success: true, data: 'Email sent' });
        } catch (err) {
            console.log(err);
            await db('users').where({ id: user.id }).update({
                resetPasswordToken: null,
                resetPasswordExpire: null
            });

            return res.status(500).json({ message: 'Email could not be sent. Check server console for the link.' });
        }
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resetToken
// @access  Public
const resetPassword = async (req, res) => {
    console.log('HIT resetPassword endpoint');
    console.log('Params:', req.params);
    console.log('Body:', req.body);

    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resetToken)
            .digest('hex');

        console.log('Reset Password Request. Token:', req.params.resetToken);
        console.log('Hashed Token:', resetPasswordToken);

        const user = await db('users')
            .where({ resetPasswordToken })
            .andWhere('resetPasswordExpire', '>', new Date())
            .first();

        if (!user) {
            console.log('Invalid token or token expired');
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Hash new password securely and save
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(req.body.password, salt);

        await db('users').where({ id: user.id }).update({
            password_hash,
            resetPasswordToken: null,
            resetPasswordExpire: null
        });

        res.status(200).json({ success: true, data: 'Password updated' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Verify Email
// @route   GET /api/auth/verifyemail/:verificationToken
// @access  Public
const verifyEmail = async (req, res) => {
    try {
        // Get hashed token
        const emailVerificationToken = crypto
            .createHash('sha256')
            .update(req.params.verificationToken)
            .digest('hex');

        const user = await db('users')
            .where({ emailVerificationToken })
            .andWhere('emailVerificationExpire', '>', new Date())
            .first();

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        // Verify the email
        await db('users').where({ id: user.id }).update({
            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpire: null
        });

        res.status(200).json({ success: true, message: 'Email verified successfully! You can now login.' });
    } catch (error) {
        console.error('Email Verification Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { loginUser, registerUser, forgotPassword, resetPassword, verifyEmail };
