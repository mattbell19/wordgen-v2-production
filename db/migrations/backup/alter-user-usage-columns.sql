-- Drop the snake_case columns and rename the camelCase columns to be the primary ones
DO $$
BEGIN
    -- First make sure we have both columns and the data is synchronized
    -- Check if articles_used exists but articlesUsed doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'articles_used'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'articlesUsed'
    ) THEN
        -- Add the camelCase column and copy data
        ALTER TABLE "user_usage" 
        ADD COLUMN "articlesUsed" integer DEFAULT 0 NOT NULL;
        
        UPDATE "user_usage" SET "articlesUsed" = "articles_used";
    END IF;
    
    -- Check if credits_used exists but creditsUsed doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'credits_used'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'creditsUsed'
    ) THEN
        -- Add the camelCase column and copy data
        ALTER TABLE "user_usage" 
        ADD COLUMN "creditsUsed" integer DEFAULT 0 NOT NULL;
        
        UPDATE "user_usage" SET "creditsUsed" = "credits_used";
    END IF;
    
    -- Check if payg_credits exists but paygCredits doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'payg_credits'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'paygCredits'
    ) THEN
        -- Add the camelCase column and copy data
        ALTER TABLE "user_usage" 
        ADD COLUMN "paygCredits" integer DEFAULT 0 NOT NULL;
        
        UPDATE "user_usage" SET "paygCredits" = "payg_credits";
    END IF;
    
    -- Now check if we should drop the snake_case columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'articles_used'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'articlesUsed'
    ) THEN
        -- Drop the snake_case column as we now have the camelCase one
        ALTER TABLE "user_usage" DROP COLUMN IF EXISTS "articles_used";
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'credits_used'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'creditsUsed'
    ) THEN
        -- Drop the snake_case column
        ALTER TABLE "user_usage" DROP COLUMN IF EXISTS "credits_used";
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'payg_credits'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'paygCredits'
    ) THEN
        -- Drop the snake_case column
        ALTER TABLE "user_usage" DROP COLUMN IF EXISTS "payg_credits";
    END IF;
END
$$; 