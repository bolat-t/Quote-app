-- ============================================================
-- Migration: Security hardening
-- 1. api_usage table with RLS (rate-limit tracking for edge functions)
-- 2. Lock analytics views down — revoke from public roles
-- 3. Tighten shared_reflections UPDATE policy
-- ============================================================

-- -------------------------------------------------------
-- 1. api_usage: create if missing + RLS
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS api_usage (
    user_id        UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date           DATE    NOT NULL DEFAULT CURRENT_DATE,
    endpoint       TEXT    NOT NULL,
    request_count  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, date, endpoint)
);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own quota (useful if you want to show "X/20 used today")
DROP POLICY IF EXISTS "usage_select" ON api_usage;
CREATE POLICY "usage_select" ON api_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Edge functions run as the calling user, so they need insert + update
DROP POLICY IF EXISTS "usage_insert" ON api_usage;
CREATE POLICY "usage_insert" ON api_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_update" ON api_usage;
CREATE POLICY "usage_update" ON api_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- No DELETE policy = deny by default — prevents users zeroing their own count to bypass rate limits

-- -------------------------------------------------------
-- 2. Analytics views: revoke from anon + authenticated roles
--    These views aggregate all users' data — they should only
--    be queried by you via the Supabase dashboard (service_role).
-- -------------------------------------------------------

REVOKE SELECT ON v_daily_active_users   FROM anon, authenticated;
REVOKE SELECT ON v_mood_by_weekday      FROM anon, authenticated;
REVOKE SELECT ON v_ai_analysis_stats    FROM anon, authenticated;
REVOKE SELECT ON v_top_sentiment_tags   FROM anon, authenticated;
REVOKE SELECT ON v_community_engagement FROM anon, authenticated;
REVOKE SELECT ON v_user_retention       FROM anon, authenticated;

-- -------------------------------------------------------
-- 3. Tighten shared_reflections UPDATE policy
--    Current policy: USING (true) — lets any authenticated user update
--    any reflection row (including content, not just likes_count).
--    The trigger that updates likes_count runs as SECURITY DEFINER,
--    so it doesn't need a permissive UPDATE policy on the table.
--    Restrict UPDATE to the reflection owner only.
-- -------------------------------------------------------

DROP POLICY IF EXISTS "reflections_update_likes" ON shared_reflections;
CREATE POLICY "reflections_update_own" ON shared_reflections
    FOR UPDATE USING (auth.uid() = user_id);
