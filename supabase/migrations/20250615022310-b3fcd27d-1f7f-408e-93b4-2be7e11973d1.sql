
-- Add missing indexes on foreign keys for better query performance
-- This will resolve the remaining Supabase linter warnings

-- Index for saved_outfits.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_saved_outfits_user_id ON saved_outfits(user_id);

-- Index for user_achievements.user_id foreign key  
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Additional performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_style_analyses_user_id ON style_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_style_analyses_created_at ON style_analyses(created_at DESC);
