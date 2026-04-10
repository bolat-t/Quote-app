-- ============================================================
-- Migration: User progression table (server-side XP/level sync)
-- Previously XP lived only in AsyncStorage — lost on reinstall,
-- no cross-device sync, client-manipulable. This fixes all three.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_progression (
    user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp        INTEGER NOT NULL DEFAULT 0,
    level           INTEGER NOT NULL DEFAULT 1,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    longest_streak  INTEGER NOT NULL DEFAULT 0,
    last_journal_date DATE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_progression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progression_select" ON user_progression;
CREATE POLICY "progression_select" ON user_progression
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "progression_insert" ON user_progression;
CREATE POLICY "progression_insert" ON user_progression
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progression_update" ON user_progression;
CREATE POLICY "progression_update" ON user_progression
    FOR UPDATE USING (auth.uid() = user_id);
