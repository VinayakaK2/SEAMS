-- =============================================================
-- SEAMS Performance Indexes
-- Run via: psql -U postgres -d seams_db -f scripts/add_perf_indexes.sql
-- =============================================================

-- 1. events.date – Most critical: WHERE date >= CURRENT_DATE is in every query
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- 2. events.status – Filtered in every query with WHERE status = 'approved'
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- 3. Composite index for the most common pattern: approved + future date
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, date) WHERE status = 'approved';

-- 4. user_activity.user_id – getPersonalizedEvents queries by user_id constantly
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);

-- 5. user_activity.event_id – computeUserSegment + getTrendingEvents join by event_id
CREATE INDEX IF NOT EXISTS idx_user_activity_event_id ON user_activity(event_id);

-- 6. user_activity.timestamp – Needed for ordering / recency window queries
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp DESC);

-- 7. recommendation_logs.user_id – computeUserSegment queries logs by user_id
CREATE INDEX IF NOT EXISTS idx_rec_logs_user_id ON recommendation_logs(user_id);

-- 8. recommendation_logs.action – Used in CTR auto-tune filtering
CREATE INDEX IF NOT EXISTS idx_rec_logs_action ON recommendation_logs(action);

-- VERIFY
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('events', 'user_activity', 'recommendation_logs')
ORDER BY tablename, indexname;
