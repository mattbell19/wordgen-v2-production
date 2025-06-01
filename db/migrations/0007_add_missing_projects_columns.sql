-- Migration: Add missing columns to projects table
-- Created: 2025-06-01

-- Add total_keywords column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'total_keywords'
    ) THEN
        ALTER TABLE projects ADD COLUMN total_keywords INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Add completed_keywords column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'completed_keywords'
    ) THEN
        ALTER TABLE projects ADD COLUMN completed_keywords INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Add settings column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'settings'
    ) THEN
        ALTER TABLE projects ADD COLUMN settings JSONB DEFAULT '{}' NOT NULL;
    END IF;
END $$;

-- Update any existing projects to have default values
UPDATE projects 
SET 
    total_keywords = COALESCE(total_keywords, 0),
    completed_keywords = COALESCE(completed_keywords, 0),
    settings = COALESCE(settings, '{}'::jsonb)
WHERE 
    total_keywords IS NULL 
    OR completed_keywords IS NULL 
    OR settings IS NULL;
