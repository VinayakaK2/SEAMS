const db = require('../db');
const bcrypt = require('bcryptjs');

// Helper to remove sensitive fields
const sanitizeUser = (user) => {
    if (!user) return user;
    const { password_hash, resetPasswordToken, resetPasswordExpire, ...safeUser } = user;
    // ensure `_id` is available for frontend compatibility
    return { ...safeUser, _id: user.id };
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await db('users').where({ id: userId }).first();
        
        if (user) {
            res.json(sanitizeUser(user));
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('getUserProfile error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user participation history (detailed)
// @route   GET /api/users/history
// @access  Private
const getUserHistory = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        
        // Join registrations with events
        const rows = await db('registrations')
            .join('events', 'registrations.event_id', '=', 'events.id')
            .where('registrations.student_id', userId)
            .select(
                'registrations.id as r_id',
                'registrations.status as r_status',
                'registrations.attendedAt as r_attendedAt',
                'registrations.certificateUrl as r_certificateUrl',
                'registrations.created_at as r_created_at',
                'events.id as e_id',
                'events.title as e_title',
                'events.date as e_date',
                'events.time as e_time',
                'events.venue as e_venue',
                'events.points as e_points',
                'events.category as e_category'
            )
            .orderBy('registrations.created_at', 'desc');

        // Restructure to match Mongoose populate structure for frontend compatibility
        const history = rows.map(row => ({
            _id: row.r_id,
            id: row.r_id,
            status: row.r_status,
            attendedAt: row.r_attendedAt,
            certificateUrl: row.r_certificateUrl,
            createdAt: row.r_created_at,
            event: {
                _id: row.e_id,
                id: row.e_id,
                title: row.e_title,
                date: row.e_date,
                time: row.e_time,
                venue: row.e_venue,
                points: row.e_points,
                category: row.e_category
            }
        }));

        res.json(history);
    } catch (error) {
        console.error('getUserHistory error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all users (Admin)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const users = await db('users')
            .select('id', 'name', 'email', 'role', 'usn', 'department', 'branch', 'semester', 'credits')
            .orderBy('created_at', 'desc');

        // Add _id for frontend compatibility
        const formattedUsers = users.map(u => ({ ...u, _id: u.id }));
        res.json(formattedUsers);
    } catch (error) {
        console.error('getUsers error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new user (Admin)
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
    const { name, email, password, role, department, usn } = req.body;
    const normalizedEmail = email.toLowerCase();

    try {
        const userExists = await db('users').where({ email: normalizedEmail }).first();
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const [user] = await db('users').insert({
            name,
            email: normalizedEmail,
            password_hash,
            role: role || 'student',
            department,
            usn,
            isEmailVerified: true // Admin created users are verified by default
        }).returning('*');

        if (user) {
            res.status(201).json(sanitizeUser(user));
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('createUser error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const user = await db('users').where({ id: req.params.id }).first();

        if (user) {
            const updates = {
                name: req.body.name || user.name,
                email: req.body.email ? req.body.email.toLowerCase() : user.email,
                role: req.body.role || user.role,
                department: req.body.department || user.department,
                updated_at: db.fn.now()
            };

            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                updates.password_hash = await bcrypt.hash(req.body.password, salt);
            }

            const [updatedUser] = await db('users')
                .where({ id: req.params.id })
                .update(updates)
                .returning('*');

            res.json(sanitizeUser(updatedUser));
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('updateUser error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update current user profile (interests, skills)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { interests, skills } = req.body;

        const updates = {
            updated_at: db.fn.now()
        };

        if (Array.isArray(interests)) updates.interests = JSON.stringify(interests);
        if (Array.isArray(skills)) updates.skills = JSON.stringify(skills);

        const [updatedUser] = await db('users')
            .where({ id: userId })
            .update(updates)
            .returning('*');

        res.json(sanitizeUser(updatedUser));
    } catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await db('users').where({ id: req.params.id }).first();

        if (user) {
            await db('users').where({ id: req.params.id }).del();
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('deleteUser error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { getUserProfile, getUserHistory, getUsers, createUser, updateUser, deleteUser, updateProfile };
