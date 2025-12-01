const mongoose = require('mongoose');

const eventSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    venue: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ['Technical', 'Cultural', 'Sports', 'NSS', 'Entrepreneurship', 'Placement', 'Life Skills']
    },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    poster: { type: String }, // URL to image
    points: { type: Number, required: true },
    maxParticipants: { type: Number },
    registeredCount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    },
    qrCode: { type: String }, // Unique string/token for QR
    qrActive: { type: Boolean, default: false },
    qrExpiresAt: { type: Date },
    startDate: { type: Date },
    startTime: { type: String },
    endDate: { type: Date },
    endTime: { type: String },
    coordinators: [{ type: String }] // Array of coordinator names
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
