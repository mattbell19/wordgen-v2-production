-- Migration: Add settings column to teams table
-- Description: Adds the missing settings JSONB column to teams table

-- Add settings column to teams table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'teams' AND column_name = 'settings'
    ) THEN
        ALTER TABLE "teams" ADD COLUMN "settings" JSONB DEFAULT '{}' NOT NULL;
    END IF;
END $$;
