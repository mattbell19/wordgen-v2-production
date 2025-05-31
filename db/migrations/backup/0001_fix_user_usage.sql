-- Fix user_usage table schema
ALTER TABLE user_usage
ADD COLUMN IF NOT EXISTS articles_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS payg_credits INTEGER NOT NULL DEFAULT 0;

-- Update existing records
UPDATE user_usage
SET articles_used = total_articles_generated,
    credits_used = total_articles_generated,
    payg_credits = 0
WHERE articles_used IS NULL;

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_articles_used ON user_usage(articles_used); 