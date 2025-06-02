-- Migration: Add keyword tables
-- Description: Creates keyword_lists and saved_keywords tables for keyword research functionality
-- Date: 2025-01-02

-- Keyword lists table
CREATE TABLE IF NOT EXISTS "keyword_lists" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Saved keywords table
CREATE TABLE IF NOT EXISTS "saved_keywords" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "list_id" INTEGER NOT NULL REFERENCES "keyword_lists"("id") ON DELETE CASCADE,
  "keyword" TEXT NOT NULL,
  "search_volume" INTEGER NOT NULL,
  "difficulty" INTEGER,
  "competition" INTEGER,
  "related_keywords" JSON,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "keyword_lists_user_id_idx" ON "keyword_lists" ("user_id");
CREATE INDEX IF NOT EXISTS "saved_keywords_list_id_idx" ON "saved_keywords" ("list_id");
CREATE INDEX IF NOT EXISTS "saved_keywords_keyword_idx" ON "saved_keywords" ("keyword");

-- Add missing columns to user_usage table if they don't exist
DO $$
BEGIN
    -- Add free_keyword_reports_used column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_usage' AND column_name = 'free_keyword_reports_used'
    ) THEN
        ALTER TABLE "user_usage" ADD COLUMN "free_keyword_reports_used" INTEGER DEFAULT 0 NOT NULL;
    END IF;

    -- Add total_keywords_analyzed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_usage' AND column_name = 'total_keywords_analyzed'
    ) THEN
        ALTER TABLE "user_usage" ADD COLUMN "total_keywords_analyzed" INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Add keyword_report_limit column to subscription_plans if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_plans' AND column_name = 'keyword_report_limit'
    ) THEN
        ALTER TABLE "subscription_plans" ADD COLUMN "keyword_report_limit" INTEGER;
    END IF;
END $$;

-- Update existing subscription plans with keyword limits if they don't have them
UPDATE "subscription_plans" 
SET "keyword_report_limit" = CASE 
    WHEN "name" = 'Pay-As-You-Go' THEN 1
    WHEN "name" = 'Starter Plan' THEN 10
    WHEN "name" = 'Growth Plan' THEN 25
    WHEN "name" = 'Agency Plan' THEN 100
    ELSE 5
END
WHERE "keyword_report_limit" IS NULL;
