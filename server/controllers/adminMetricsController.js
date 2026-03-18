const db = require('../db');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Get top performing events by engagement score
 * @route   GET /api/admin/metrics/top-events
 * @access  Private (Admin)
 */
const getTopEvents = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const events = await db('events')
            .select(
                'id', 'title', 'category', 'date',
                'total_impressions', 'total_clicks', 'total_likes', 'total_registrations'
            )
            .where('status', 'approved')
            .limit(limit)
            .orderBy('global_event_score', 'desc');

        const enriched = events.map(ev => {
            const impressions = ev.total_impressions || 0;
            const clicks = ev.total_clicks || 0;
            const likes = ev.total_likes || 0;
            const registrations = ev.total_registrations || 0;

            return {
                ...ev,
                _id: ev.id,
                ctr: impressions > 0 ? (clicks / impressions).toFixed(3) : '0.000',
                like_rate: impressions > 0 ? (likes / impressions).toFixed(3) : '0.000',
                conversion_rate: impressions > 0 ? (registrations / impressions).toFixed(3) : '0.000',
            };
        });

        res.json({ topEvents: enriched });
    } catch (error) {
        console.error('getTopEvents error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get overall recommendation algorithm performance (Group A vs B)
 * @route   GET /api/admin/metrics/ab-performance
 * @access  Private (Admin)
 */
const getABPerformance = async (req, res) => {
    try {
        // For each group, compute aggregate metrics
        // Group A = even userId, Group B = odd userId
        const logs = await db('recommendation_logs')
            .join('users', 'recommendation_logs.user_id', 'users.id')
            .select(
                db.raw("CASE WHEN (recommendation_logs.user_id % 2 = 0) THEN 'A' ELSE 'B' END as ab_group"),
                db.raw("COUNT(*) FILTER (WHERE recommendation_logs.action = 'shown') as shown"),
                db.raw("COUNT(*) FILTER (WHERE recommendation_logs.action = 'clicked') as clicked"),
                db.raw("COUNT(*) FILTER (WHERE recommendation_logs.action = 'skipped') as skipped")
            )
            .groupByRaw("CASE WHEN (recommendation_logs.user_id % 2 = 0) THEN 'A' ELSE 'B' END");

        const result = logs.map(row => ({
            group: row.ab_group,
            shown: parseInt(row.shown || 0),
            clicked: parseInt(row.clicked || 0),
            skipped: parseInt(row.skipped || 0),
            ctr: parseInt(row.shown || 0) > 0
                ? (parseInt(row.clicked) / parseInt(row.shown)).toFixed(3)
                : '0.000',
        }));

        res.json({ abGroups: result });
    } catch (error) {
        console.error('getABPerformance error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get active vs inactive user segments
 * @route   GET /api/admin/metrics/user-segments
 * @access  Private (Admin)
 */
const getUserSegments = async (req, res) => {
    try {
        const users = await db('users')
            .leftJoin(db('user_activity').select('user_id').count('id as count').groupBy('user_id').as('ua'), 'users.id', 'ua.user_id')
            .select('users.id', 'users.name', 'users.email', db.raw('COALESCE(ua.count, 0) as interaction_count'))
            .where('users.role', 'student');

        const segments = { new: [], casual: [], power: [] };
        users.forEach(u => {
            const count = parseInt(u.interaction_count || 0);
            if (count < 5) segments.new.push(u);
            else if (count <= 20) segments.casual.push(u);
            else segments.power.push(u);
        });

        res.json({
            summary: {
                new: segments.new.length,
                casual: segments.casual.length,
                power: segments.power.length,
                total: users.length,
            },
            segments
        });
    } catch (error) {
        console.error('getUserSegments error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get overall recommendation performance summary
 * @route   GET /api/admin/metrics/overview
 * @access  Private (Admin)
 */
const getMetricsOverview = async (req, res) => {
    try {
        const [logCounts] = await db('recommendation_logs')
            .select(
                db.raw("COUNT(*) FILTER (WHERE action = 'shown') as total_shown"),
                db.raw("COUNT(*) FILTER (WHERE action = 'clicked') as total_clicked"),
                db.raw("COUNT(*) FILTER (WHERE action = 'skipped') as total_skipped")
            );

        const [eventTotals] = await db('events')
            .sum('total_impressions as impressions')
            .sum('total_clicks as clicks')
            .sum('total_likes as likes')
            .sum('total_registrations as registrations');

        const shown = parseInt(logCounts.total_shown || 0);
        const clicked = parseInt(logCounts.total_clicked || 0);
        const skipped = parseInt(logCounts.total_skipped || 0);

        res.json({
            recommendation: {
                total_shown: shown,
                total_clicked: clicked,
                total_skipped: skipped,
                overall_ctr: shown > 0 ? (clicked / shown).toFixed(3) : '0.000',
                skip_rate: shown > 0 ? (skipped / shown).toFixed(3) : '0.000',
            },
            events: {
                total_impressions: parseInt(eventTotals.impressions || 0),
                total_clicks: parseInt(eventTotals.clicks || 0),
                total_likes: parseInt(eventTotals.likes || 0),
                total_registrations: parseInt(eventTotals.registrations || 0),
            }
        });
    } catch (error) {
        console.error('getMetricsOverview error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get V6 Ranking Model Performance Metrics
 * @route   GET /api/admin/metrics/model-performance
 * @access  Private (Admin)
 */
const getModelPerformance = async (req, res) => {
    try {
        const metricsPath = path.join(__dirname, '../../ml/ml_metrics.json');
        if (fs.existsSync(metricsPath)) {
            const data = fs.readFileSync(metricsPath, 'utf8');
            return res.json({ status: 'success', data: JSON.parse(data) });
        } else {
            return res.json({ status: 'success', data: { message: 'Model metrics not available yet. Training may not have run.' } });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch model performance metrics' });
    }
};

module.exports = {
    getTopEvents,
    getABPerformance,
    getUserSegments,
    getMetricsOverview,
    getModelPerformance
};
