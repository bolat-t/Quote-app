-- ============================================================
-- Migration: Analytics views
-- Useful for product insights without complex runtime queries
-- ============================================================

-- DAU/WAU: daily unique active writers
CREATE OR REPLACE VIEW v_daily_active_users AS
SELECT
    date_trunc('day', created_at)::date AS day,
    COUNT(DISTINCT user_id)             AS active_users,
    COUNT(*)                            AS entries_written,
    ROUND(AVG(mood_score), 2)           AS avg_mood
FROM journal_entries
GROUP BY 1
ORDER BY 1 DESC;

-- Mood by day-of-week (find when users feel best/worst)
CREATE OR REPLACE VIEW v_mood_by_weekday AS
SELECT
    to_char(date::date, 'Dy')  AS weekday,
    EXTRACT(DOW FROM date::date)::int AS dow_order,
    ROUND(AVG(mood_score), 2)  AS avg_mood,
    COUNT(*)                   AS entry_count
FROM journal_entries
WHERE mood_score IS NOT NULL
GROUP BY 1, 2
ORDER BY 2;

-- AI analysis coverage rate
CREATE OR REPLACE VIEW v_ai_analysis_stats AS
SELECT
    COUNT(*)                                          AS total_entries,
    COUNT(*) FILTER (WHERE spirit_reply IS NOT NULL)  AS analyzed,
    COUNT(*) FILTER (WHERE spirit_reply IS NULL
                    AND LENGTH(response) > 5)         AS pending_analysis,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE spirit_reply IS NOT NULL)
        / NULLIF(COUNT(*), 0), 1
    )                                                 AS pct_analyzed
FROM journal_entries
WHERE response IS NOT NULL;

-- Top sentiment tags
CREATE OR REPLACE VIEW v_top_sentiment_tags AS
SELECT
    tag,
    COUNT(*) AS frequency
FROM journal_entries,
    LATERAL unnest(sentiment_tags) AS tag
GROUP BY 1
ORDER BY 2 DESC;

-- Community engagement summary
CREATE OR REPLACE VIEW v_community_engagement AS
SELECT
    COUNT(*)                                            AS total_reflections,
    ROUND(AVG(likes_count), 2)                          AS avg_likes,
    MAX(likes_count)                                    AS top_likes,
    COUNT(*) FILTER (WHERE likes_count = 0)             AS zero_like_posts,
    COUNT(DISTINCT user_id)                             AS unique_posters
FROM shared_reflections;

-- User retention: entries per user per week
CREATE OR REPLACE VIEW v_user_retention AS
SELECT
    user_id,
    COUNT(DISTINCT date_trunc('week', created_at)) AS active_weeks,
    COUNT(*)                                        AS total_entries,
    MIN(created_at::date)                           AS first_entry_date,
    MAX(created_at::date)                           AS last_entry_date
FROM journal_entries
GROUP BY user_id
ORDER BY active_weeks DESC;
