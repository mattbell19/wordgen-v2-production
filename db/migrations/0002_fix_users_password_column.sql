-- Migration: Fix users table password column name
-- Description: Rename password_hash to password to match application schema

-- Rename the password_hash column to password
ALTER TABLE "users" RENAME COLUMN "password_hash" TO "password";

-- Also add any missing columns that the application expects
-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add name column if it doesn't exist (application expects this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "name" TEXT;
    END IF;

    -- Add is_admin column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_admin'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN DEFAULT false NOT NULL;
    END IF;

    -- Add article_credits_remaining column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'article_credits_remaining'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "article_credits_remaining" INTEGER DEFAULT 3 NOT NULL;
    END IF;

    -- Add subscription_start_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'subscription_start_date'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "subscription_start_date" TIMESTAMP;
    END IF;

    -- Add subscription_end_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'subscription_end_date'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "subscription_end_date" TIMESTAMP;
    END IF;

    -- Add last_login_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'last_login_date'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "last_login_date" TIMESTAMP;
    END IF;
END $$;
