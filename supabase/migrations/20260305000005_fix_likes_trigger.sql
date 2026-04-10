-- ============================================================
-- Migration: Replace RPC-based likes_count with a DB trigger
-- Problem: increment_likes / decrement_likes RPCs have race
-- conditions under concurrent writes. A trigger is atomic.
-- ============================================================

-- Trigger function: recalculates likes_count from the join table
CREATE OR REPLACE FUNCTION sync_reflection_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE shared_reflections
        SET likes_count = likes_count + 1
        WHERE id = NEW.reflection_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE shared_reflections
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.reflection_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reflection_likes_count ON reflection_likes;
CREATE TRIGGER trg_reflection_likes_count
    AFTER INSERT OR DELETE ON reflection_likes
    FOR EACH ROW EXECUTE FUNCTION sync_reflection_likes_count();

-- RLS for community tables

ALTER TABLE shared_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback           ENABLE ROW LEVEL SECURITY;

-- shared_reflections: public read, auth write
DROP POLICY IF EXISTS "reflections_select" ON shared_reflections;
CREATE POLICY "reflections_select" ON shared_reflections
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "reflections_insert" ON shared_reflections;
CREATE POLICY "reflections_insert" ON shared_reflections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reflections_delete" ON shared_reflections;
CREATE POLICY "reflections_delete" ON shared_reflections
    FOR DELETE USING (auth.uid() = user_id);

-- Allow trigger to update likes_count without auth restriction
DROP POLICY IF EXISTS "reflections_update_likes" ON shared_reflections;
CREATE POLICY "reflections_update_likes" ON shared_reflections
    FOR UPDATE USING (true);

-- reflection_likes: public read, users manage own
DROP POLICY IF EXISTS "likes_select" ON reflection_likes;
CREATE POLICY "likes_select" ON reflection_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "likes_all" ON reflection_likes;
CREATE POLICY "likes_all" ON reflection_likes
    FOR ALL USING (auth.uid() = user_id);

-- feedback: users manage own
DROP POLICY IF EXISTS "feedback_insert" ON feedback;
CREATE POLICY "feedback_insert" ON feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedback_select" ON feedback;
CREATE POLICY "feedback_select" ON feedback
    FOR SELECT USING (auth.uid() = user_id);
