const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema({
    action: { type: String, required: true }, // e.g., 'CREATE_EVENT', 'APPROVE_PARTICIPATION'
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: String }, // ID of the object being affected (Event ID, User ID, etc.)
    targetType: { type: String }, // 'Event', 'User', 'Registration'
    details: { type: Object }, // Changed fields, previous values, etc.
    timestamp: { type: Date, default: Date.now },
    ipAddress: { type: String },
}, { timestamps: true });

// Prevent deletion or modification of logs
auditLogSchema.pre('remove', function (next) {
    next(new Error('Audit logs cannot be deleted.'));
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
