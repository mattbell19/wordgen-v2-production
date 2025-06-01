-- Migration: Add missing columns to user_usage table
-- Description: Adds missing columns to user_usage table to match schema

-- Add credits_used column to user_usage table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'credits_used'
    ) THEN
        ALTER TABLE "user_usage" ADD COLUMN "credits_used" INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Add payg_credits column to user_usage table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'payg_credits'
    ) THEN
        ALTER TABLE "user_usage" ADD COLUMN "payg_credits" INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Add last_article_date column to user_usage table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'last_article_date'
    ) THEN
        ALTER TABLE "user_usage" ADD COLUMN "last_article_date" TIMESTAMP;
    END IF;
END $$;

-- Add last_keyword_date column to user_usage table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_usage' AND column_name = 'last_keyword_date'
    ) THEN
        ALTER TABLE "user_usage" ADD COLUMN "last_keyword_date" TIMESTAMP;
    END IF;
END $$;
