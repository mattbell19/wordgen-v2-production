-- Create a new migration that aligns with how Drizzle ORM expects the database structure
-- Drizzle is looking for snake_case column names in the database but using camelCase in the code

-- First, make sure all the expected columns exist with the correct names
DO $$
BEGIN
    -- Check if the articles_used column doesn't exist yet
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'articles_used'
    ) THEN
        -- Add the snake_case column that the ORM expects
        ALTER TABLE "user_usage" 
        ADD COLUMN "articles_used" integer DEFAULT 0 NOT NULL;
    END IF;
    
    -- Check if the credits_used column doesn't exist yet
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'credits_used'
    ) THEN
        -- Add the snake_case column that the ORM expects
        ALTER TABLE "user_usage" 
        ADD COLUMN "credits_used" integer DEFAULT 0 NOT NULL;
    END IF;
    
    -- Check if the payg_credits column doesn't exist yet
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'payg_credits'
    ) THEN
        -- Add the snake_case column that the ORM expects
        ALTER TABLE "user_usage" 
        ADD COLUMN "payg_credits" integer DEFAULT 0 NOT NULL;
    END IF;
    
    -- If we have camelCase columns, copy data to snake_case columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'articlesUsed'
    ) THEN
        -- Copy data from camelCase to snake_case
        UPDATE "user_usage" SET "articles_used" = "articlesUsed";
        -- Drop the camelCase column as we don't need it
        ALTER TABLE "user_usage" DROP COLUMN IF EXISTS "articlesUsed";
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'creditsUsed'
    ) THEN
        -- Copy data from camelCase to snake_case
        UPDATE "user_usage" SET "credits_used" = "creditsUsed";
        -- Drop the camelCase column as we don't need it
        ALTER TABLE "user_usage" DROP COLUMN IF EXISTS "creditsUsed";
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'paygCredits'
    ) THEN
        -- Copy data from camelCase to snake_case
        UPDATE "user_usage" SET "payg_credits" = "paygCredits";
        -- Drop the camelCase column as we don't need it
        ALTER TABLE "user_usage" DROP COLUMN IF EXISTS "paygCredits";
    END IF;
END
$$; 