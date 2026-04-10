-- ============================================================
-- Migration: Performance indexes
-- ============================================================

-- journal_entries: most frequent query pattern is user + date
CREATE INDEX IF NOT EXISTS idx_journal_user_date
    ON journal_entries(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_created
    ON journal_entries(created_at DESC);

-- Partial index for mood analytics (only rows that have AI data)
CREATE INDEX IF NOT EXISTS idx_journal_mood
    ON journal_entries(mood_score)
    WHERE mood_score IS NOT NULL;

-- GIN index for tag queries (e.g. "find all entries tagged #WorkStress")
CREATE INDEX IF NOT EXISTS idx_journal_tags
    ON journal_entries USING GIN(sentiment_tags);

-- shared_reflections: community feed is ordered by created_at
CREATE INDEX IF NOT EXISTS idx_reflections_created
    ON shared_reflections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reflections_user
    ON shared_reflections(user_id);

-- reflection_likes: lookup both directions
CREATE INDEX IF NOT EXISTS idx_likes_user
    ON reflection_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_likes_reflection
    ON reflection_likes(reflection_id);

-- vision_board_items
CREATE INDEX IF NOT EXISTS idx_vision_user
    ON vision_board_items(user_id);

CREATE INDEX IF NOT EXISTS idx_vision_created
    ON vision_board_items(created_at DESC);

-- user_progression: leaderboard / analytics queries
CREATE INDEX IF NOT EXISTS idx_progression_xp
    ON user_progression(total_xp DESC);

CREATE INDEX IF NOT EXISTS idx_progression_streak
    ON user_progression(current_streak DESC);
