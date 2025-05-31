-- Create scraping_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS "scraping_tasks" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "domain" TEXT NOT NULL,
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "last_run_at" TIMESTAMP,
  "sitemap_xml" TEXT,
  "metadata" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create scraped_urls table if it doesn't exist
CREATE TABLE IF NOT EXISTS "scraped_urls" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "task_id" INTEGER NOT NULL REFERENCES "scraping_tasks"("id") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "keywords" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "scraping_tasks_user_id_idx" ON "scraping_tasks"("user_id");
CREATE INDEX IF NOT EXISTS "scraped_urls_task_id_idx" ON "scraped_urls"("task_id");
