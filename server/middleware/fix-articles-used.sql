-- Add articles_used column if it doesn't exist 
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_usage' AND column_name = 'articles_used'
    ) THEN
        ALTER TABLE user_usage ADD COLUMN articles_used INTEGER DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_usage' AND column_name = 'credits_used'
    ) THEN
        ALTER TABLE user_usage ADD COLUMN credits_used INTEGER DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_usage' AND column_name = 'payg_credits'
    ) THEN
        ALTER TABLE user_usage ADD COLUMN payg_credits INTEGER DEFAULT 0 NOT NULL;
    END IF;
END
$$;

-- Update any NULL values to 0
UPDATE user_usage SET articles_used = 0 WHERE articles_used IS NULL;
UPDATE user_usage SET credits_used = 0 WHERE credits_used IS NULL;
UPDATE user_usage SET payg_credits = 0 WHERE payg_credits IS NULL; 