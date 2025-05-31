-- Migration: Add article queue tables
-- Description: Creates tables for article queue processing functionality

-- Create article_queues table
CREATE TABLE IF NOT EXISTS "article_queues" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "batch_name" TEXT,
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "progress" INTEGER DEFAULT 0 NOT NULL,
  "total_items" INTEGER NOT NULL,
  "completed_items" INTEGER DEFAULT 0 NOT NULL,
  "failed_items" INTEGER DEFAULT 0 NOT NULL,
  "error" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "completed_at" TIMESTAMP
);

-- Create article_queue_items table
CREATE TABLE IF NOT EXISTS "article_queue_items" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "queue_id" INTEGER NOT NULL REFERENCES "article_queues"("id") ON DELETE CASCADE,
  "keyword" TEXT NOT NULL,
  "settings" JSONB NOT NULL,
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "error" TEXT,
  "article_id" INTEGER REFERENCES "articles"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "article_queues_user_id_idx" ON "article_queues" ("user_id");
CREATE INDEX IF NOT EXISTS "article_queues_status_idx" ON "article_queues" ("status");
CREATE INDEX IF NOT EXISTS "article_queues_created_at_idx" ON "article_queues" ("created_at");

CREATE INDEX IF NOT EXISTS "article_queue_items_queue_id_idx" ON "article_queue_items" ("queue_id");
CREATE INDEX IF NOT EXISTS "article_queue_items_status_idx" ON "article_queue_items" ("status");
CREATE INDEX IF NOT EXISTS "article_queue_items_article_id_idx" ON "article_queue_items" ("article_id");
