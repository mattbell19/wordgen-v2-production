-- Migration: Add missing columns to various tables
-- Description: Adds missing columns to team_members and articles tables

-- Add status column to team_members table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'team_members' AND column_name = 'status'
    ) THEN
        ALTER TABLE "team_members" ADD COLUMN "status" TEXT DEFAULT 'active' NOT NULL;
    END IF;
END $$;

-- Add credits_used column to articles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'credits_used'
    ) THEN
        ALTER TABLE "articles" ADD COLUMN "credits_used" INTEGER DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Add primary_keyword column to articles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'primary_keyword'
    ) THEN
        ALTER TABLE "articles" ADD COLUMN "primary_keyword" TEXT;
    END IF;
END $$;

-- Add reading_time column to articles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'reading_time'
    ) THEN
        ALTER TABLE "articles" ADD COLUMN "reading_time" INTEGER NOT NULL DEFAULT 5;
    END IF;
END $$;

-- Add settings column to articles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'articles' AND column_name = 'settings'
    ) THEN
        ALTER TABLE "articles" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';
    END IF;
END $$;
