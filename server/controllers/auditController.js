const db = require('../db');

// @desc    Get all audit logs
// @route   GET /api/audit
// @access  Private/Admin
const getAuditLogs = async (req, res) => {
    try {
        const logs = await db('audit_logs')
            .leftJoin('users', 'audit_logs.performedBy', 'users.id')
            .select(
                'audit_logs.*',
                'users.name as user_name',
                'users.email as user_email',
                'users.role as user_role'
            )
            .orderBy('audit_logs.timestamp', 'desc');

        // Restructure to match populate() format for frontend
        const formattedLogs = logs.map(log => ({
            ...log,
            _id: log.id,
            performedBy: log.performedBy ? {
                _id: log.performedBy,
                name: log.user_name,
                email: log.user_email,
                role: log.user_role
            } : null
        }));

        res.json(formattedLogs);
    } catch (error) {
        console.error('getAuditLogs error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getAuditLogs };
