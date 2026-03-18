const db = require('../db');
const logActivity = require('../utils/logger');
const { updateUserTagProfile } = require('../utils/tagProfileUpdater');

/**
 * Record user activity for recommendation engine
 */
const recordActivity = async (userId, eventId, action) => {
    try {
        if (!userId || !eventId) return;
        await db('user_activity').insert({
            user_id: userId,
            event_id: eventId,
            action,
            timestamp: db.fn.now()
        });

        // V3: Incrementally update user's semantic learning profile
        await updateUserTagProfile(userId, eventId, action);
        
    } catch (error) {
        console.error('recordActivity error:', error.message);
    }
};

// @desc    Register for an event
// @route   POST /api/registrations
// @access  Private (Student)
const registerForEvent = async (req, res) => {
    try {
        const { eventId } = req.body;
        const studentId = req.user.id || req.user._id;

        const registration = await db.transaction(async trx => {
            const event = await trx('events').where({ id: eventId }).first();
            
            if (!event) {
                throw new Error('Event not found');
            }

            if (event.maxParticipants && event.registeredCount >= event.maxParticipants) {
                throw new Error('Event is full');
            }

            const existingReg = await trx('registrations').where({ student_id: studentId, event_id: eventId }).first();
            if (existingReg) {
                throw new Error('Already registered');
            }

            const [reg] = await trx('registrations').insert({
                student_id: studentId,
                event_id: eventId,
                status: 'registered'
            }).returning('*');

            // Increment registered count
            await trx('events').where({ id: eventId }).increment('registeredCount', 1);
            
            reg._id = reg.id;
            return { reg, event };
        });

        await logActivity('REGISTER_EVENT', studentId, registration.reg.id.toString(), 'Registration', { event: registration.event.title }, req);

        // Record Activity for Recommendation Engine
        await recordActivity(studentId, eventId, 'register');

        // Emit socket event to event organizer and admins
        if (req.io) {
            const student = await db('users').where({ id: studentId }).select('id as _id', 'name', 'email', 'usn').first();
            const populatedReg = { ...registration.reg, student };

            const updatePayload = {
                event: {
                    _id: registration.event.id,
                    title: registration.event.title,
                    registeredCount: registration.event.registeredCount + 1
                },
                registration: populatedReg,
                participantCount: registration.event.registeredCount + 1
            };

            req.io.to(`event:${eventId}:organizer`).emit('registration_created', updatePayload);
            req.io.to('room:admin').emit('registration_created', updatePayload);
        }

        res.status(201).json(registration.reg);
    } catch (error) {
        if (['Event not found', 'Event is full', 'Already registered'].includes(error.message)) {
            return res.status(error.message === 'Event not found' ? 404 : 400).json({ message: error.message });
        }
        res.status(400).json({ message: 'Registration failed', error: error.message });
    }
};

// @desc    Verify attendance (Coordinator Scans Student)
// @route   POST /api/registrations/verify
// @access  Private (Coordinator, Faculty)
const verifyAttendance = async (req, res) => {
    try {
        const { qrToken, studentId } = req.body;
        const eventId = qrToken.split('-')[0];
        const verifierId = req.user.id || req.user._id;

        const result = await db.transaction(async trx => {
            const event = await trx('events').where({ id: eventId }).first();

            if (!event) throw new Error('Invalid QR Code');
            if (!event.qrActive) throw new Error('QR Code is not active');
            if (new Date() > new Date(event.qrExpiresAt)) throw new Error('QR Code expired');

            const registration = await trx('registrations').where({ student_id: studentId, event_id: eventId }).first();
            if (!registration) throw new Error('Student not registered');
            if (registration.status === 'verified') throw new Error('Already verified');

            const [updatedReg] = await trx('registrations').where({ id: registration.id }).update({
                status: 'verified',
                attendedAt: trx.fn.now(),
                verifiedBy: verifierId
            }).returning('*');

            await trx('users').where({ id: studentId }).increment('credits', event.points);

            const student = await trx('users').where({ id: studentId }).select('name').first();

            return { event, updatedReg, student };
        });

        await logActivity('VERIFY_ATTENDANCE', verifierId, result.updatedReg.id.toString(), 'Registration', { student: result.student.name, event: result.event.title }, req);

        res.json({ message: 'Verified', student: result.student.name, credits: result.event.points });
    } catch (error) {
        if (['Invalid QR Code', 'Student not registered'].includes(error.message)) {
            return res.status(404).json({ message: error.message });
        } else if (['QR Code is not active', 'QR Code expired', 'Already verified'].includes(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

// @desc    Verify self attendance (Student scans Event QR)
// @route   POST /api/registrations/verify-self
// @access  Private (Student)
const verifyAttendanceSelf = async (req, res) => {
    try {
        const { qrToken } = req.body;
        const studentId = req.user.id || req.user._id;
        const eventId = qrToken.split('-')[0];

        const event = await db.transaction(async trx => {
            const ev = await trx('events').where({ id: eventId }).first();

            if (!ev) throw new Error('Invalid QR Code');
            if (!ev.qrActive) throw new Error('QR Code is not active');
            if (new Date() > new Date(ev.qrExpiresAt)) throw new Error('QR Code expired');
            if (ev.qrCode !== qrToken) throw new Error('Invalid QR Token');

            const registration = await trx('registrations').where({ student_id: studentId, event_id: eventId }).first();
            if (!registration) throw new Error('Not registered for this event');
            if (registration.status === 'attended' || registration.status === 'verified') throw new Error('Already verified');

            await trx('registrations').where({ id: registration.id }).update({
                status: 'verified',
                attendedAt: trx.fn.now(),
                verifiedBy: studentId // Self verified
            });

            await trx('users').where({ id: studentId }).increment('credits', ev.points);

            return ev;
        });

        // We assume we have the event context to log
        const registration = await db('registrations').where({ student_id: studentId, event_id: eventId }).first();
        await logActivity('VERIFY_SELF', studentId, registration.id.toString(), 'Registration', { event: event.title }, req);

        res.json({ message: 'Attendance verified successfully', credits: event.points });
    } catch (error) {
        if (['Invalid QR Code', 'Not registered for this event'].includes(error.message)) {
            return res.status(404).json({ message: error.message });
        } else if (['QR Code is not active', 'QR Code expired', 'Invalid QR Token', 'Already verified'].includes(error.message)) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};

// @desc    Get my registrations
// @route   GET /api/registrations/my
// @access  Private (Student)
const getMyRegistrations = async (req, res) => {
    try {
        const studentId = req.user.id || req.user._id;

        const rows = await db('registrations')
            .join('events', 'registrations.event_id', '=', 'events.id')
            .where('registrations.student_id', studentId)
            .select(
                'registrations.id as r_id',
                'registrations.status as r_status',
                'registrations.attendedAt as r_attendedAt',
                'registrations.created_at as r_created_at',
                'events.id as e_id',
                'events.title as e_title',
                'events.date as e_date',
                'events.venue as e_venue',
                'events.points as e_points',
                'events.status as e_status'
            )
            .orderBy('registrations.created_at', 'desc');

        const registrations = rows.map(row => ({
            _id: row.r_id,
            id: row.r_id,
            status: row.r_status,
            attendedAt: row.r_attendedAt,
            createdAt: row.r_created_at,
            event: {
                _id: row.e_id,
                title: row.e_title,
                date: row.e_date,
                venue: row.e_venue,
                points: row.e_points,
                status: row.e_status
            }
        }));

        res.json(registrations);
    } catch (error) {
        console.error('getMyRegistrations error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get registrations for a specific event
// @route   GET /api/registrations?eventId=xxx
// @access  Private (Coordinator, Faculty, Admin)
const getEventRegistrations = async (req, res) => {
    try {
        const { eventId } = req.query;

        if (!eventId) {
            return res.status(400).json({ message: 'Event ID is required' });
        }

        const rows = await db('registrations')
            .join('users', 'registrations.student_id', '=', 'users.id')
            .where('registrations.event_id', eventId)
            .select(
                'registrations.id as r_id',
                'registrations.status as r_status',
                'registrations.attendedAt as r_attendedAt',
                'registrations.created_at as r_created_at',
                'users.id as u_id',
                'users.name as u_name',
                'users.email as u_email',
                'users.usn as u_usn'
            )
            .orderBy('registrations.created_at', 'desc');

        const registrations = rows.map(row => ({
            _id: row.r_id,
            id: row.r_id,
            status: row.r_status,
            attendedAt: row.r_attendedAt,
            createdAt: row.r_created_at,
            student: {
                _id: row.u_id,
                name: row.u_name,
                email: row.u_email,
                usn: row.u_usn
            }
        }));

        res.json(registrations);
    } catch (error) {
        console.error('getEventRegistrations error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { registerForEvent, verifyAttendance, verifyAttendanceSelf, getMyRegistrations, getEventRegistrations };
