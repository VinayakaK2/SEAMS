const db = require('../db');

/**
 * Incrementally updates a user's tag_profile based on an event they interacted with.
 * @param {string} userId - ID of the user
 * @param {string} eventId - ID of the event
 * @param {string} action - 'view', 'like', 'register'
 */
const updateUserTagProfile = async (userId, eventId, action) => {
    try {
        const weights = { view: 1, like: 2, register: 3, skip: -0.5, dislike: -1, impression: 0 };
        const weight = weights[action];
        if (weight === undefined) return;

        // Fetch event tags
        const event = await db('events').select('tags').where({ id: eventId }).first();
        if (!event || !event.tags) return;
        
        let tags = [];
        try {
            tags = typeof event.tags === 'string' ? JSON.parse(event.tags) : event.tags;
        } catch (e) {
            tags = [];
        }
        
        if (!Array.isArray(tags) || tags.length === 0) return;

        // Fetch user's current profile
        const user = await db('users').select('tag_profile').where({ id: userId }).first();
        if (!user) return;

        let profile = {};
        try {
            profile = typeof user.tag_profile === 'string' ? JSON.parse(user.tag_profile) : (user.tag_profile || {});
        } catch (e) {
            profile = {};
        }

        // Increment or decrement weights, ensuring it never goes below 0
        tags.forEach(tag => {
            let currentScore = profile[tag] || 0;
            let newScore = currentScore + weight;
            profile[tag] = Math.max(0, newScore); // Ensure it never goes < 0
        });

        // Save updated profile back to DB
        await db('users')
            .where({ id: userId })
            .update({ 
                tag_profile: JSON.stringify(profile),
                last_active_at: db.fn.now()
            });

        // Invalidate Redis profile cache
        try {
            const Redis = require('ioredis');
            const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
            await redis.del(`user:profile:${userId}`);
            // Fire and forget, close connection to avoid leak if creating new instance
            redis.quit();
        } catch (e) {
            console.error('Failed to invalidate user profile cache:', e.message);
        }

    } catch (error) {
        console.error('Error updating user tag profile:', error.message);
    }
};

module.exports = {
    updateUserTagProfile
};
