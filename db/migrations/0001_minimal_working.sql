-- Minimal working migration for initial Heroku deployment
-- This creates only the essential tables needed to get the app running

-- Users table (core authentication)
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT,
  "last_name" TEXT,
  "status" TEXT DEFAULT 'active' NOT NULL,
  "subscription_tier" TEXT DEFAULT 'free' NOT NULL,
  "email_verified" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create basic indexes for users
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" ("status");

-- Projects table (core functionality)
CREATE TABLE IF NOT EXISTS "projects" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT DEFAULT 'active' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for projects
CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects" ("user_id");

-- Articles table (core functionality)
CREATE TABLE IF NOT EXISTS "articles" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" INTEGER REFERENCES "projects"("id") ON DELETE SET NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "status" TEXT DEFAULT 'draft' NOT NULL,
  "word_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for articles
CREATE INDEX IF NOT EXISTS "articles_user_id_idx" ON "articles" ("user_id");
CREATE INDEX IF NOT EXISTS "articles_project_id_idx" ON "articles" ("project_id");
CREATE INDEX IF NOT EXISTS "articles_status_idx" ON "articles" ("status");

-- Subscription plans table (basic billing)
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" INTEGER NOT NULL,
  "billing_period" TEXT NOT NULL,
  "article_limit" INTEGER,
  "keyword_limit" INTEGER,
  "features" JSONB DEFAULT '[]' NOT NULL,
  "stripe_product_id" TEXT,
  "stripe_price_id" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Subscriptions table (basic billing)
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_id" INTEGER NOT NULL REFERENCES "subscription_plans"("id"),
  "status" TEXT NOT NULL,
  "stripe_subscription_id" TEXT,
  "stripe_customer_id" TEXT,
  "current_period_start" TIMESTAMP,
  "current_period_end" TIMESTAMP,
  "cancel_at_period_end" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" ("status");

-- Insert basic subscription plans
INSERT INTO "subscription_plans" ("name", "description", "price", "billing_period", "article_limit", "keyword_limit", "features")
VALUES 
  ('Free', 'Get started with basic features', 0, 'monthly', 5, 10, '["5 articles per month", "Basic templates", "Email support"]'),
  ('Pro', 'For growing businesses', 2999, 'monthly', 100, 200, '["100 articles per month", "Advanced templates", "Priority support"]'),
  ('Enterprise', 'For large organizations', 9999, 'monthly', -1, -1, '["Unlimited articles", "Custom templates", "Dedicated support"]')
ON CONFLICT DO NOTHING;

-- Create admin user
INSERT INTO "users" ("email", "password_hash", "first_name", "last_name", "status", "subscription_tier", "email_verified")
VALUES ('admin@wordgen.com', '$2b$10$dummy.hash.for.initial.deployment', 'Admin', 'User', 'active', 'enterprise', true)
ON CONFLICT (email) DO NOTHING;
