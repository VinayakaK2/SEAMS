const db = require('../db');
const axios = require('axios');
const QRCode = require('qrcode');
const logActivity = require('../utils/logger');
const { patchCandidatePool } = require('../services/recommendationService');
const rabbitmq = require('../utils/rabbitmq');

const redis = require('../utils/redisClient');

// ML Service base URL (internal)
const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

/**
 * V11: Enqueues a background job to generate and persist an event embedding.
 * Called after event creation and after title/description/tag updates.
 */
const triggerEventEmbedding = async (event) => {
    if (!event || !event.id) return;
    try {
        await rabbitmq.publishToQueue('queue:embedding_jobs', { id: event.id });
        console.log(`[RABBITMQ] Published durable embedding job for event ${event.id}`);
    } catch (err) {
        console.warn(`[QUEUE] Failed to dispatch embedding job for event ${event.id}: ${err.message}`);
    }
};

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

        // V5: Core Metrics and Logging
        if (action === 'impression') {
            await db('recommendation_logs').insert({ user_id: userId, event_id: eventId, action: 'shown', timestamp: db.fn.now() });
            await db('events').where({ id: eventId }).increment('total_impressions', 1);
        } else if (action === 'view') {
            await db('recommendation_logs').insert({ user_id: userId, event_id: eventId, action: 'clicked', timestamp: db.fn.now() });
            await db('events').where({ id: eventId }).increment('total_clicks', 1);
        } else if (action === 'skip') {
            await db('recommendation_logs').insert({ user_id: userId, event_id: eventId, action: 'skipped', timestamp: db.fn.now() });
        } else if (action === 'like') {
            await db('events').where({ id: eventId }).increment('total_likes', 1);
        } else if (action === 'register') {
            await db('events').where({ id: eventId }).increment('total_registrations', 1);
        }

        // V3: Incrementally update user's semantic learning profile
        await updateUserTagProfile(userId, eventId, action);
        
        // V11 Feature Store: Propagate stats explicitly
        try {
            const userKey = `user:features:${userId}`;
            await redis.hincrby(userKey, 'interactionsCount', 1);
            if (action === 'view' || action === 'like' || action === 'register' || action === 'impression') {
                await redis.hincrby(userKey, 'logStats_clicked', action === 'impression' ? 0 : 1);
                if (action === 'impression') await redis.hincrby(userKey, 'logStats_shown', 1);
            }
            await redis.expire(userKey, 1800);
            
            // V12 Durable RabbitMQ fallback real-time EMA embeddings map
            if (action === 'view' || action === 'like' || action === 'register') {
                await rabbitmq.publishToQueue('queue:user_embed_update', { userId, eventId, action });
            }
        } catch (e) {
            console.warn(`[REDIS] Feature Store realtime increment failed: ${e.message}`);
        }
        
    } catch (error) {
        console.error('recordActivity error:', error.message);
    }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Coordinator, Faculty, Admin)
const createEvent = async (req, res) => {
    try {
        const { title, description, date, time, venue, category, points, maxParticipants, poster, coordinators } = req.body;
        const userId = req.user.id || req.user._id;

        // Input validation
        if (!title || !description || !date || !time || !venue || !category || points === undefined) {
            return res.status(400).json({ message: 'Missing required event fields' });
        }
        if (typeof points !== 'number' || points < 0) {
            return res.status(400).json({ message: 'Points must be a non-negative number' });
        }

        // Use transaction to insert event and coordinators safely
        const createdEvent = await db.transaction(async trx => {
            const [event] = await trx('events').insert({
                title: title.trim(),
                description: description.trim(),
                date,
                time,
                venue: venue.trim(),
                category,
                points: parseInt(points, 10),
                maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
                poster,
                organizer_id: userId,
                status: req.user.role === 'admin' || req.user.role === 'faculty' ? 'approved' : 'pending',
                tags: JSON.stringify([]), // Will be updated by ML service async
                keywords: JSON.stringify([]) // Will be updated by ML service async
            }).returning('*');

            if (coordinators && Array.isArray(coordinators) && coordinators.length > 0) {
                const coordinatorInserts = coordinators.map(c => ({
                    event_id: event.id,
                    coordinator_name: c
                }));
                await trx('event_coordinators').insert(coordinatorInserts);
                event.coordinators = coordinators;
            } else {
                event.coordinators = [];
            }
            return event;
        });

        // Add _id for frontend compatibility
        createdEvent._id = createdEvent.id;

        // Invalidate event list cache so new event appears immediately
        await invalidateEventCaches();

        await logActivity('CREATE_EVENT', userId, createdEvent.id.toString(), 'Event', { title }, req);

        // Emit socket event
        if (req.io) {
            req.io.emit('event_created', createdEvent);
        }

        res.status(201).json(createdEvent);
        // Patch candidate pool asynchronously (fire-and-forget)
        if (createdEvent.status === 'approved') {
            patchCandidatePool('add', createdEvent).catch(() => {});
        }
        // V9: Generate and store event embedding (fire-and-forget)
        triggerEventEmbedding(createdEvent);
    } catch (error) {
        console.error('createEvent error:', error);
        res.status(400).json({ message: 'Invalid event data', error: error.message });
    }
};

// @desc    Update event status (Approve/Reject)
// @route   PUT /api/events/:id/status
// @access  Private (Admin)
const updateEventStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        const userId = req.user.id || req.user._id;

        const event = await db('events').where({ id: req.params.id }).first();

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const [updatedEvent] = await db('events')
            .where({ id: req.params.id })
            .update({ status, updated_at: db.fn.now() })
            .returning('*');

        updatedEvent._id = updatedEvent.id;

        // Fetch organizer details for frontend compatibility
        const organizer = await db('users').where({ id: updatedEvent.organizer_id }).select('id as _id', 'name', 'email').first();
        updatedEvent.organizer = organizer;

        await logActivity('UPDATE_EVENT_STATUS', userId, updatedEvent.id.toString(), 'Event', { status }, req);

        // Invalidate cache for this event and all event lists
        await invalidateEventCaches(updatedEvent.id);

        // Emit socket events
        if (req.io) {
            req.io.to('room:admin').emit('event_status_updated', updatedEvent);
            if (status === 'approved') {
                req.io.to('room:student').emit('event_approved', updatedEvent);
            }
        }

        res.json(updatedEvent);
    } catch (error) {
        console.error('updateEventStatus error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
    try {
        const { category, status, showAll } = req.query;
        let query = db('events').select('*').orderBy('date', 'asc');

        if (category) query = query.where('category', category);

        if (showAll === 'true') {
            if (status) query = query.where('status', status);
        } else {
            if (status) query = query.where('status', status);
            else query = query.where('status', 'approved');
            
            // Hide events older than 3 days from the main feeds
            query = query.whereRaw("date >= CURRENT_DATE - INTERVAL '3 days'");
        }

        const events = await query;

        // Fetch coordinators for each event
        const eventIds = events.map(e => e.id);
        const allCoordinators = eventIds.length > 0 ? await db('event_coordinators').whereIn('event_id', eventIds) : [];

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const formattedEvents = events.map(event => {
            const ev = { ...event, _id: event.id };
            ev.coordinators = allCoordinators
                .filter(c => c.event_id === event.id)
                .map(c => c.coordinator_name);
                
            // V5: Mark events in the past (within the 3 day window) as 'ended'
            const eventDate = new Date(event.date);
            if (eventDate < now && ev.status === 'approved') {
                ev.status = 'ended';
            }
                
            return ev;
        });

        res.json(formattedEvents);
    } catch (error) {
        console.error('getEvents error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
    try {
        // Single JOIN query — eliminates extra round-trips for organizer lookup
        const event = await db('events')
            .leftJoin('users as organizers', 'events.organizer_id', '=', 'organizers.id')
            .where('events.id', req.params.id)
            .select(
                'events.*',
                'organizers.id as org_id',
                'organizers.name as org_name',
                'organizers.email as org_email'
            )
            .first();

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Fetch coordinators separately (no N+1 since it is a single event)
        const coordinators = await db('event_coordinators')
            .where({ event_id: event.id })
            .pluck('coordinator_name');

        // Record View Activity for Recommendations
        const userId = req.user ? (req.user.id || req.user._id) : null;
        if (userId) {
            await recordActivity(userId, event.id, 'view');
        }

        res.json({
            ...event,
            _id: event.id,
            organizer: event.org_id ? { _id: event.org_id, name: event.org_name, email: event.org_email } : null,
            coordinators,
            // Remove flattened organizer columns from top-level response
            org_id: undefined,
            org_name: undefined,
            org_email: undefined
        });
    } catch (error) {
        console.error('getEventById error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Generate QR Code for event
// @route   POST /api/events/:id/qr
// @access  Private (Organizer/Admin)
const generateEventQR = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const event = await db('events').where({ id: req.params.id }).first();

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (Number(event.organizer_id) !== Number(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const qrToken = `${event.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const qrExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await db('events').where({ id: event.id }).update({
            qrCode: qrToken,
            qrActive: true,
            qrExpiresAt
        });

        const qrDataUrl = await QRCode.toDataURL(qrToken);

        await logActivity('GENERATE_QR', userId, event.id.toString(), 'Event', { qrToken }, req);

        res.json({ qrCode: qrToken, qrDataUrl });
    } catch (error) {
        console.error('generateEventQR error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Coordinator/Faculty - own events, Admin - all)
const updateEvent = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const event = await db('events').where({ id: req.params.id }).first();

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (Number(event.organizer_id) !== Number(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this event' });
        }

        const { title, description, date, time, venue, category, points, maxParticipants, startDate, startTime, endDate, endTime, coordinators } = req.body;

        const updateData = { updated_at: db.fn.now() };
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (date) updateData.date = date;
        if (time) updateData.time = time;
        if (venue) updateData.venue = venue;
        if (category) updateData.category = category;
        if (points !== undefined) updateData.points = points;
        if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
        if (startDate) updateData.startDate = startDate;
        if (startTime) updateData.startTime = startTime;
        if (endDate) updateData.endDate = endDate;
        if (endTime) updateData.endTime = endTime;

        const updatedEvent = await db.transaction(async trx => {
            const [ev] = await trx('events')
                .where({ id: event.id })
                .update(updateData)
                .returning('*');

            if (coordinators !== undefined) {
                await trx('event_coordinators').where({ event_id: ev.id }).del();
                if (coordinators.length > 0) {
                    const inserts = coordinators.map(c => ({ event_id: ev.id, coordinator_name: c }));
                    await trx('event_coordinators').insert(inserts);
                }
                ev.coordinators = coordinators;
            } else {
                const currentCoordinators = await trx('event_coordinators').where({ event_id: ev.id }).pluck('coordinator_name');
                ev.coordinators = currentCoordinators;
            }
            return ev;
        });

        updatedEvent._id = updatedEvent.id;
        const organizer = await db('users').where({ id: updatedEvent.organizer_id }).select('id as _id', 'name', 'email').first();
        updatedEvent.organizer = organizer;

        await logActivity('UPDATE_EVENT', userId, event.id.toString(), 'Event', { title }, req);

        // Invalidate cache for this event and all event lists
        await invalidateEventCaches(updatedEvent.id);

        if (req.io) {
            if (updatedEvent.status === 'approved') {
                req.io.to('room:student').emit('event_updated', updatedEvent);
            }
            req.io.to('room:admin').emit('event_updated', updatedEvent);
            req.io.to(`event:${updatedEvent.id}:organizer`).emit('event_updated', updatedEvent);
        }

        res.json(updatedEvent);
        // V9: Re-generate embedding if content-bearing fields changed (fire-and-forget)
        if (updateData.title || updateData.description) {
            triggerEventEmbedding(updatedEvent);
        }
    } catch (error) {
        console.error('updateEvent error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Coordinator/Faculty - own events, Admin - all)
const deleteEvent = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const event = await db('events').where({ id: req.params.id }).first();

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (Number(event.organizer_id) !== Number(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this event' });
        }

        await db('events').where({ id: req.params.id }).del(); // CASCADE deletes related records

        await logActivity('DELETE_EVENT', userId, event.id.toString(), 'Event', { title: event.title }, req);

        // Invalidate cache for this event and all event lists
        await invalidateEventCaches(event.id);

        if (req.io) {
            if (event.status === 'approved') {
                req.io.to('room:student').emit('event_deleted', { _id: event.id });
            }
            req.io.to('room:admin').emit('event_deleted', { _id: event.id });
            req.io.to(`event:${event.id}:organizer`).emit('event_deleted', { _id: event.id });
        }

        res.json({ message: 'Event deleted successfully' });
        
        // V11: Remove directly from Distributed FAISS Vector Service (fire-and-forget)
        const vectorUrl = process.env.VECTOR_SERVICE_URL || `http://127.0.0.1:${process.env.VECTOR_PORT || 5002}`;
        axios.post(`${vectorUrl}/vector/remove`, { id: event.id }, { timeout: 3000 }).catch(err => {
            console.warn(`[VECTOR] Failed to remove event ${event.id} from Sharded FAISS: ${err.message}`);
        });

    } catch (error) {
        console.error('deleteEvent error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get coordinator stats (Events + Participants)
// @route   GET /api/events/coordinator/stats
// @access  Private (Coordinator/Faculty)
const getCoordinatorStats = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        // Uses dbService: batches all queries with Promise.all + caches result
        const stats = await dbService.getCoordinatorStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('getCoordinatorStats error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Like an event
// @desc    Like an event
// @route   POST /api/events/:id/like
// @access  Private (Student)
const likeEvent = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const eventId = req.params.id;

        const event = await db('events').where({ id: eventId }).first();
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if already liked (to avoid duplication in activity, though not strictly prohibited)
        const recentLike = await db('user_activity')
            .where({ user_id: userId, event_id: eventId, action: 'like' })
            .first();

        if (recentLike) {
            return res.status(400).json({ message: 'Event already liked' });
        }

        await recordActivity(userId, eventId, 'like');

        res.json({ message: 'Event liked successfully' });
    } catch (error) {
        console.error('likeEvent error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Skip an event
// @route   POST /api/events/:id/skip
// @access  Private (Student)
const skipEvent = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const eventId = req.params.id;

        const event = await db('events').where({ id: eventId }).first();
        if (!event) return res.status(404).json({ message: 'Event not found' });

        await recordActivity(userId, eventId, 'skip');
        res.json({ message: 'Event skipped successfully' });
    } catch (error) {
        console.error('skipEvent error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Dislike an event
// @route   POST /api/events/:id/dislike
// @access  Private (Student)
const dislikeEvent = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const eventId = req.params.id;

        const event = await db('events').where({ id: eventId }).first();
        if (!event) return res.status(404).json({ message: 'Event not found' });

        await recordActivity(userId, eventId, 'dislike');
        res.json({ message: 'Event disliked successfully' });
    } catch (error) {
        console.error('dislikeEvent error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Record an event impression
// @route   POST /api/events/:id/impression
// @access  Private (Student)
const recordImpression = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const eventId = req.params.id;

        const event = await db('events').where({ id: eventId }).first();
        if (!event) return res.status(404).json({ message: 'Event not found' });

        await recordActivity(userId, eventId, 'impression');
        res.json({ message: 'Impression recorded' });
    } catch (error) {
        console.error('recordImpression error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { 
    createEvent, getEvents, getEventById, generateEventQR, 
    updateEventStatus, updateEvent, deleteEvent, getCoordinatorStats, 
    likeEvent, skipEvent, dislikeEvent, recordImpression 
};
