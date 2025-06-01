-- Migration: Add missing columns to various tables
-- Description: Adds missing status column to team_members and credits_used column to articles

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
