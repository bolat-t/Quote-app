-- ============================================================
-- Migration: vision_board_items improvements
-- 1. Formalize text_color / font_family / bg_style columns
--    (were added ad-hoc via ALTER TABLE in code comments)
-- 2. Add created_at for ordering and analytics
-- 3. Enable RLS
-- ============================================================

ALTER TABLE vision_board_items
    ADD COLUMN IF NOT EXISTS text_color  TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS bg_style    TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now();

ALTER TABLE vision_board_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vision_all" ON vision_board_items;
CREATE POLICY "vision_all" ON vision_board_items
    FOR ALL USING (auth.uid() = user_id);
