const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const logActivity = require('../utils/logger');

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Private (Student)
const registerForEvent = async (req, res) => {
    try {
        const { eventId } = req.body;
        const studentId = req.user._id;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.maxParticipants && event.registeredCount >= event.maxParticipants) {
            return res.status(400).json({ message: 'Event is full' });
        }

        const existingReg = await Registration.findOne({ student: studentId, event: eventId });
        if (existingReg) {
            return res.status(400).json({ message: 'Already registered' });
        }

        const registration = await Registration.create({
            student: studentId,
            event: eventId,
        });

        event.registeredCount += 1;
        await event.save();

        await logActivity('REGISTER_EVENT', studentId, registration._id, 'Registration', { event: event.title }, req);

        res.status(201).json(registration);
    } catch (error) {
        res.status(400).json({ message: 'Registration failed', error: error.message });
    }
};

// @desc    Verify attendance (Coordinator Scans Student)
// @route   POST /api/registrations/verify
// @access  Private (Coordinator, Faculty)
const verifyAttendance = async (req, res) => {
    try {
        const { qrToken, studentId } = req.body;
        // This logic assumes Coordinator scans Student QR or something similar.
        // But for now, let's keep it consistent with previous implementation if needed.
        // However, the new requirement is Student scans Event QR.
        // So this endpoint might be for manual verification or different flow.
        // I'll keep it as is.

        const eventId = qrToken.split('-')[0];
        const event = await Event.findById(eventId);

        if (!event) return res.status(404).json({ message: 'Invalid QR Code' });
        if (!event.qrActive) return res.status(400).json({ message: 'QR Code is not active' });
        if (new Date() > event.qrExpiresAt) return res.status(400).json({ message: 'QR Code expired' });

        const registration = await Registration.findOne({ student: studentId, event: eventId });
        if (!registration) return res.status(404).json({ message: 'Student not registered' });
        if (registration.status === 'verified') return res.status(400).json({ message: 'Already verified' });

        registration.status = 'verified';
        registration.attendedAt = Date.now();
        registration.verifiedBy = req.user._id;
        await registration.save();

        const student = await User.findById(studentId);
        student.credits += event.points;
        await student.save();

        await logActivity('VERIFY_ATTENDANCE', req.user._id, registration._id, 'Registration', { student: student.name, event: event.title }, req);

        res.json({ message: 'Verified', student: student.name, credits: event.points });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

// @desc    Verify self attendance (Student scans Event QR)
// @route   POST /api/registrations/verify-self
// @access  Private (Student)
const verifyAttendanceSelf = async (req, res) => {
    try {
        const { qrToken } = req.body;
        const studentId = req.user._id;

        const eventId = qrToken.split('-')[0];
        const event = await Event.findById(eventId);

        if (!event) return res.status(404).json({ message: 'Invalid QR Code' });
        if (!event.qrActive) return res.status(400).json({ message: 'QR Code is not active' });
        if (new Date() > event.qrExpiresAt) return res.status(400).json({ message: 'QR Code expired' });
        if (event.qrCode !== qrToken) return res.status(400).json({ message: 'Invalid QR Token' });

        const registration = await Registration.findOne({ student: studentId, event: eventId });
        if (!registration) return res.status(404).json({ message: 'Not registered for this event' });
        if (registration.status === 'attended' || registration.status === 'verified') return res.status(400).json({ message: 'Already verified' });

        registration.status = 'verified';
        registration.attendedAt = Date.now();
        registration.verifiedBy = studentId; // Self verified
        await registration.save();

        const student = await User.findById(studentId);
        student.credits += event.points;
        await student.save();

        await logActivity('VERIFY_SELF', studentId, registration._id, 'Registration', { event: event.title }, req);

        res.json({ message: 'Attendance verified successfully', credits: event.points });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

// @desc    Get my registrations
// @route   GET /api/registrations/my
// @access  Private (Student)
const getMyRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ student: req.user._id })
            .populate('event', 'title date venue points status')
            .sort({ createdAt: -1 });
        res.json(registrations);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { registerForEvent, verifyAttendance, verifyAttendanceSelf, getMyRegistrations };
