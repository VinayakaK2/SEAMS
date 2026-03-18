const jwt = require('jsonwebtoken');
const db = require('../db');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id || decoded._id;
            const fullUser = await db('users').where({ id: userId }).first();

            if (!fullUser) {
                console.error('Auth Error: User not found for token ID:', userId);
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Strip sensitive fields — password_hash must never be on req.user
            const { password_hash, emailVerificationToken, emailVerificationExpire, resetPasswordToken, resetPasswordExpire, ...safeUser } = fullUser;
            req.user = safeUser;

            next();
        } catch (error) {
            console.error('Auth Error:', error.message);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
