const db = require('../db');

const logActivity = async (action, performedBy, targetId, targetType, details, req) => {
    try {
        await db('audit_logs').insert({
            action,
            performedBy,
            targetId,
            targetType,
            details,
            ipAddress: req?.ip || 'unknown'
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

module.exports = logActivity;
