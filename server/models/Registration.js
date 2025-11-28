const mongoose = require('mongoose');

const registrationSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    status: {
        type: String,
        enum: ['registered', 'attended', 'verified', 'rejected'],
        default: 'registered'
    },
    attendedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    certificateUrl: { type: String },
}, { timestamps: true });

// Prevent duplicate registration
registrationSchema.index({ student: 1, event: 1 }, { unique: true });

const Registration = mongoose.model('Registration', registrationSchema);
module.exports = Registration;
