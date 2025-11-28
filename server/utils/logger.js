const AuditLog = require('../models/AuditLog');

const logActivity = async (action, performedBy, targetId, targetType, details, req) => {
    try {
        await AuditLog.create({
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
