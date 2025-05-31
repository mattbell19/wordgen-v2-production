-- Migration: Add missing user columns and user_usage table
-- Description: Adds missing columns to users table and creates user_usage table

-- Add missing columns to users table
DO $$
BEGIN
    -- Add total_articles_generated column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'total_articles_generated'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "total_articles_generated" INTEGER DEFAULT 0 NOT NULL;
    END IF;

    -- Add active_team_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'active_team_id'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "active_team_id" INTEGER;
    END IF;
END $$;

-- Create user_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS "user_usage" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "total_articles_generated" INTEGER DEFAULT 0 NOT NULL,
  "free_articles_used" INTEGER DEFAULT 0 NOT NULL,
  "free_keyword_reports_used" INTEGER DEFAULT 0 NOT NULL,
  "total_keywords_analyzed" INTEGER DEFAULT 0 NOT NULL,
  "total_word_count" INTEGER DEFAULT 0 NOT NULL,
  "articles_used" INTEGER DEFAULT 0 NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for user_usage table
CREATE INDEX IF NOT EXISTS "user_usage_user_id_idx" ON "user_usage" ("user_id");

-- Create teams table if it doesn't exist (referenced by active_team_id)
CREATE TABLE IF NOT EXISTS "teams" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "owner_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for teams table
CREATE INDEX IF NOT EXISTS "teams_owner_id_idx" ON "teams" ("owner_id");

-- Create team_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS "team_members" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "team_id" INTEGER NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" TEXT DEFAULT 'member' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE("team_id", "user_id")
);

-- Create indexes for team_members table
CREATE INDEX IF NOT EXISTS "team_members_team_id_idx" ON "team_members" ("team_id");
CREATE INDEX IF NOT EXISTS "team_members_user_id_idx" ON "team_members" ("user_id");

-- Add foreign key constraint for active_team_id if teams table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'users_active_team_id_fkey'
        ) THEN
            ALTER TABLE "users" ADD CONSTRAINT "users_active_team_id_fkey" 
            FOREIGN KEY ("active_team_id") REFERENCES "teams"("id") ON DELETE SET NULL;
        END IF;
    END IF;
END $$;
