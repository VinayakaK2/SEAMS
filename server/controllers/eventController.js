const Event = require('../models/Event');
const QRCode = require('qrcode');
const logActivity = require('../utils/logger');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Coordinator, Faculty, Admin)
const createEvent = async (req, res) => {
    try {
        const { title, description, date, time, venue, category, points, maxParticipants, poster } = req.body;

        const event = new Event({
            title,
            description,
            date,
            time,
            venue,
            category,
            points,
            maxParticipants,
            poster,
            organizer: req.user._id,
            status: req.user.role === 'admin' || req.user.role === 'faculty' ? 'approved' : 'pending'
        });

        const createdEvent = await event.save();

        await logActivity('CREATE_EVENT', req.user._id, createdEvent._id, 'Event', { title }, req);

        res.status(201).json(createdEvent);
    } catch (error) {
        res.status(400).json({ message: 'Invalid event data', error: error.message });
    }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
    try {
        const { category, status } = req.query;
        const query = {};

        if (category) query.category = category;
        if (status) query.status = status;
        else query.status = 'approved'; // Default to showing only approved events to public

        const events = await Event.find(query).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('organizer', 'name email');
        if (event) {
            res.json(event);
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Generate QR Code for event
// @route   POST /api/events/:id/qr
// @access  Private (Organizer/Admin)
const generateEventQR = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check ownership
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Generate a unique token for the QR
        const qrToken = `${event._id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        event.qrCode = qrToken;
        event.qrActive = true;
        event.qrExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // Valid for 1 hour

        await event.save();

        // Generate Data URL
        const qrDataUrl = await QRCode.toDataURL(qrToken);

        await logActivity('GENERATE_QR', req.user._id, event._id, 'Event', { qrToken }, req);

        res.json({ qrCode: qrToken, qrDataUrl });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createEvent, getEvents, getEventById, generateEventQR };
