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

        // Emit socket event
        if (req.io) {
            req.io.emit('event_created', createdEvent);
        }

        res.status(201).json(createdEvent);
    } catch (error) {
        res.status(400).json({ message: 'Invalid event data', error: error.message });
    }
};

// @desc    Update event status (Approve/Reject)
// @route   PUT /api/events/:id/status
// @access  Private (Admin)
const updateEventStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        const event = await Event.findById(req.params.id).populate('organizer', 'name email');

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        event.status = status;
        const updatedEvent = await event.save();

        await logActivity('UPDATE_EVENT_STATUS', req.user._id, event._id, 'Event', { status }, req);

        // Emit socket events to specific rooms
        if (req.io) {
            // Notify admins that event was processed
            req.io.to('room:admin').emit('event_status_updated', updatedEvent);

            // If approved, notify all students about new event
            if (status === 'approved') {
                req.io.to('room:student').emit('event_approved', updatedEvent);
            }
        }

        res.json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
    try {
        const { category, status, showAll } = req.query;
        const query = {};

        if (category) query.category = category;

        if (showAll === 'true') {
            // Do not filter by status
            if (status) query.status = status;
        } else {
            if (status) query.status = status;
            else query.status = 'approved'; // Default to showing only approved events to public
        }

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

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Coordinator/Faculty - own events, Admin - all)
const updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is authorized (owner or admin)
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this event' });
        }

        // Update fields
        const { title, description, date, time, venue, category, points, maxParticipants, startDate, startTime, endDate, endTime, coordinators } = req.body;

        if (title) event.title = title;
        if (description) event.description = description;
        if (date) event.date = date;
        if (time) event.time = time;
        if (venue) event.venue = venue;
        if (category) event.category = category;
        if (points !== undefined) event.points = points;
        if (maxParticipants !== undefined) event.maxParticipants = maxParticipants;
        if (startDate) event.startDate = startDate;
        if (startTime) event.startTime = startTime;
        if (endDate) event.endDate = endDate;
        if (endTime) event.endTime = endTime;
        if (coordinators) event.coordinators = coordinators;

        const updatedEvent = await event.save();
        await updatedEvent.populate('organizer', 'name email');

        await logActivity('UPDATE_EVENT', req.user._id, event._id, 'Event', { title }, req);

        // Emit socket event for real-time updates
        if (req.io) {
            // Notify all students if event is approved
            if (event.status === 'approved') {
                req.io.to('room:student').emit('event_updated', updatedEvent);
            }
            // Notify admins
            req.io.to('room:admin').emit('event_updated', updatedEvent);
            // Notify event organizer
            req.io.to(`event:${event._id}:organizer`).emit('event_updated', updatedEvent);
        }

        res.json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Coordinator/Faculty - own events, Admin - all)
const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is authorized (owner or admin)
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this event' });
        }

        await Event.findByIdAndDelete(req.params.id);

        await logActivity('DELETE_EVENT', req.user._id, event._id, 'Event', { title: event.title }, req);

        // Emit socket event for real-time updates
        if (req.io) {
            // Notify all students if event was approved
            if (event.status === 'approved') {
                req.io.to('room:student').emit('event_deleted', { _id: event._id });
            }
            // Notify admins
            req.io.to('room:admin').emit('event_deleted', { _id: event._id });
            // Notify event organizer
            req.io.to(`event:${event._id}:organizer`).emit('event_deleted', { _id: event._id });
        }

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get coordinator stats (Events + Participants) using Aggregation
// @route   GET /api/events/coordinator/stats
// @access  Private (Coordinator/Faculty)
const getCoordinatorStats = async (req, res) => {
    try {
        const stats = await Event.aggregate([
            // 1. Match events organized by the user
            {
                $match: {
                    organizer: req.user._id
                }
            },
            // 2. Lookup registrations for each event
            {
                $lookup: {
                    from: 'registrations',
                    localField: '_id',
                    foreignField: 'event',
                    as: 'registrations'
                }
            },
            // 3. Unwind registrations to lookup student details (optional, but good for details)
            // Note: If we just want count, we can skip this. But for "Manage Participants", we need details.
            // However, unwinding empty arrays removes the event. So use preserveNullAndEmptyArrays.
            {
                $unwind: {
                    path: '$registrations',
                    preserveNullAndEmptyArrays: true
                }
            },
            // 4. Lookup student details for each registration
            {
                $lookup: {
                    from: 'users',
                    localField: 'registrations.student',
                    foreignField: '_id',
                    as: 'registrations.studentDetails'
                }
            },
            // 5. Unwind student details (since lookup returns an array)
            {
                $unwind: {
                    path: '$registrations.studentDetails',
                    preserveNullAndEmptyArrays: true
                }
            },
            // 6. Group back to event level
            {
                $group: {
                    _id: '$_id',
                    title: { $first: '$title' },
                    date: { $first: '$date' },
                    time: { $first: '$time' },
                    venue: { $first: '$venue' },
                    category: { $first: '$category' },
                    status: { $first: '$status' },
                    description: { $first: '$description' },
                    points: { $first: '$points' },
                    maxParticipants: { $first: '$maxParticipants' },
                    coordinators: { $first: '$coordinators' },
                    endTime: { $first: '$endTime' },
                    endDate: { $first: '$endDate' },
                    registeredCount: { $first: '$registeredCount' },
                    participants: {
                        $push: {
                            $cond: [
                                { $ifNull: ['$registrations._id', false] },
                                {
                                    _id: '$registrations._id',
                                    status: '$registrations.status',
                                    registeredAt: '$registrations.registeredAt',
                                    student: {
                                        _id: '$registrations.studentDetails._id',
                                        name: '$registrations.studentDetails.name',
                                        email: '$registrations.studentDetails.email',
                                        usn: '$registrations.studentDetails.usn'
                                    }
                                },
                                '$$REMOVE'
                            ]
                        }
                    }
                }
            },
            // 7. Sort by date descending
            { $sort: { date: -1 } }
        ]);

        res.json(stats);
    } catch (error) {
        console.error('Aggregation Error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createEvent, getEvents, getEventById, generateEventQR, updateEventStatus, updateEvent, deleteEvent, getCoordinatorStats };
