-- WordGen v2 Complete Database Schema
-- This migration creates the entire database schema from scratch
-- Run this on a fresh database for new deployments

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Settings table for platform configuration
CREATE TABLE IF NOT EXISTS "settings" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "site_name" TEXT NOT NULL DEFAULT 'Wordgen',
  "max_articles_per_user" INTEGER NOT NULL DEFAULT 10,
  "allow_new_registrations" BOOLEAN DEFAULT true,
  "require_email_verification" BOOLEAN DEFAULT true,
  "maintenance_mode" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Users table with proper constraints and indexes
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "is_admin" BOOLEAN DEFAULT false NOT NULL,
  "subscription_tier" TEXT DEFAULT 'free' NOT NULL,
  "article_credits_remaining" INTEGER DEFAULT 0 NOT NULL,
  "subscription_start_date" TIMESTAMP,
  "subscription_end_date" TIMESTAMP,
  "status" TEXT DEFAULT 'active' NOT NULL,
  "last_login_date" TIMESTAMP,
  "total_articles_generated" INTEGER DEFAULT 0 NOT NULL,
  "active_team_id" INTEGER,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for users table
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" ("status");
CREATE INDEX IF NOT EXISTS "users_subscription_tier_idx" ON "users" ("subscription_tier");
CREATE INDEX IF NOT EXISTS "users_active_team_idx" ON "users" ("active_team_id");

-- User usage tracking table
CREATE TABLE IF NOT EXISTS "user_usage" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "total_articles_generated" INTEGER DEFAULT 0 NOT NULL,
  "free_articles_used" INTEGER DEFAULT 0 NOT NULL,
  "free_keyword_reports_used" INTEGER DEFAULT 0 NOT NULL,
  "total_keywords_analyzed" INTEGER DEFAULT 0 NOT NULL,
  "total_word_count" INTEGER DEFAULT 0 NOT NULL,
  "articles_used" INTEGER DEFAULT 0 NOT NULL,
  "credits_used" INTEGER DEFAULT 0 NOT NULL,
  "payg_credits" INTEGER DEFAULT 0 NOT NULL,
  "last_article_date" TIMESTAMP,
  "last_keyword_date" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for user_usage table
CREATE INDEX IF NOT EXISTS "user_usage_user_id_idx" ON "user_usage" ("user_id");
CREATE INDEX IF NOT EXISTS "user_usage_articles_used_idx" ON "user_usage" ("articles_used");

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "used_at" TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS "teams" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "owner_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "description" TEXT,
  "settings" JSONB DEFAULT '{}' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add foreign key constraint for active_team_id after teams table is created
ALTER TABLE "users" ADD CONSTRAINT "users_active_team_id_fkey" 
  FOREIGN KEY ("active_team_id") REFERENCES "teams"("id") ON DELETE SET NULL;

-- Team roles table
CREATE TABLE IF NOT EXISTS "team_roles" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "team_id" INTEGER NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "permissions" JSONB NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Team members table
CREATE TABLE IF NOT EXISTS "team_members" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "team_id" INTEGER NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "email" TEXT,
  "role_id" INTEGER NOT NULL REFERENCES "team_roles"("id"),
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "invited_by" INTEGER REFERENCES "users"("id"),
  "invited_at" TIMESTAMP DEFAULT NOW(),
  "joined_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Projects table
CREATE TABLE IF NOT EXISTS "projects" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "total_keywords" INTEGER DEFAULT 0 NOT NULL,
  "completed_keywords" INTEGER DEFAULT 0 NOT NULL,
  "settings" JSONB DEFAULT '{}' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Articles table with indexes
CREATE TABLE IF NOT EXISTS "articles" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" INTEGER REFERENCES "projects"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "primary_keyword" TEXT,
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "word_count" INTEGER NOT NULL,
  "reading_time" INTEGER NOT NULL,
  "settings" JSON NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for articles table
CREATE INDEX IF NOT EXISTS "articles_user_id_idx" ON "articles" ("user_id");
CREATE INDEX IF NOT EXISTS "articles_project_id_idx" ON "articles" ("project_id");
CREATE INDEX IF NOT EXISTS "articles_status_idx" ON "articles" ("status");
CREATE INDEX IF NOT EXISTS "articles_primary_keyword_idx" ON "articles" ("primary_keyword");
CREATE INDEX IF NOT EXISTS "articles_created_at_idx" ON "articles" ("created_at");

-- Article usage tracking table
CREATE TABLE IF NOT EXISTS "article_usage" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "article_id" INTEGER NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "used_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

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

-- SEO audit tables
CREATE TABLE IF NOT EXISTS "seo_audit_tasks" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "domain" TEXT NOT NULL,
  "path" TEXT,
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "dataforseo_task_id" TEXT,
  "schedule" TEXT,
  "last_run_at" TIMESTAMP,
  "next_run_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "seo_audit_results" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "task_id" INTEGER NOT NULL REFERENCES "seo_audit_tasks"("id") ON DELETE CASCADE,
  "total_pages" INTEGER,
  "health_score" INTEGER,
  "critical_issues" INTEGER,
  "warnings" INTEGER,
  "passed" INTEGER,
  "on_page_data" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "seo_audit_issues" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "result_id" INTEGER NOT NULL REFERENCES "seo_audit_results"("id") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "how_to_fix" TEXT,
  "priority" INTEGER,
  "status" TEXT DEFAULT 'open' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "fixed_at" TIMESTAMP
);

-- Email logs table
CREATE TABLE IF NOT EXISTS "email_logs" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "metadata" JSONB DEFAULT '{}' NOT NULL,
  "error" TEXT,
  "sent_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- AI conversation tables
CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "context" JSONB DEFAULT '{}' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "conversation_id" INTEGER NOT NULL REFERENCES "ai_conversations"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB DEFAULT '{}' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_agent_preferences" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "preferred_tone" TEXT DEFAULT 'professional' NOT NULL,
  "default_context" JSONB DEFAULT '{}' NOT NULL,
  "notifications" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_seo_suggestions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "article_id" INTEGER REFERENCES "articles"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "suggestion" TEXT NOT NULL,
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "impact" TEXT NOT NULL,
  "metadata" JSONB DEFAULT '{}' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "implemented_at" TIMESTAMP
);

-- Scraping tables
CREATE TABLE IF NOT EXISTS "scraping_tasks" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "domain" TEXT NOT NULL,
  "status" TEXT DEFAULT 'pending' NOT NULL,
  "last_run_at" TIMESTAMP,
  "sitemap_xml" TEXT,
  "metadata" JSONB DEFAULT '{}' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS "scraped_urls" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "task_id" INTEGER NOT NULL REFERENCES "scraping_tasks"("id") ON DELETE CASCADE,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "keywords" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Insert default settings
INSERT INTO "settings" ("site_name", "max_articles_per_user", "allow_new_registrations", "require_email_verification", "maintenance_mode")
VALUES ('WordGen v2', 10, true, false, false)
ON CONFLICT DO NOTHING;

-- Create a default admin user (password should be changed immediately)
-- Password is 'admin123' - CHANGE THIS IMMEDIATELY IN PRODUCTION
INSERT INTO "users" ("email", "password", "name", "is_admin", "subscription_tier", "article_credits_remaining", "status")
VALUES ('admin@wordgen.com', '$2b$10$rOzJqQZJqQZJqQZJqQZJqOzJqQZJqQZJqQZJqQZJqQZJqQZJqQZJq', 'Admin User', true, 'unlimited', 999999, 'active')
ON CONFLICT (email) DO NOTHING;

-- Subscription plans table
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price_in_cents" INTEGER NOT NULL,
  "interval" TEXT NOT NULL,
  "article_limit" INTEGER,
  "keyword_report_limit" INTEGER,
  "features" JSONB,
  "stripe_product_id" TEXT NOT NULL,
  "stripe_price_id" TEXT NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_id" INTEGER NOT NULL REFERENCES "subscription_plans"("id"),
  "status" TEXT NOT NULL,
  "stripe_subscription_id" TEXT NOT NULL,
  "stripe_customer_id" TEXT NOT NULL,
  "current_period_start" TIMESTAMP NOT NULL,
  "current_period_end" TIMESTAMP NOT NULL,
  "cancel_at_period_end" BOOLEAN DEFAULT false,
  "articles_used" INTEGER DEFAULT 0 NOT NULL,
  "metadata" JSONB DEFAULT '{}' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Payment history table
CREATE TABLE IF NOT EXISTS "payment_history" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subscription_id" INTEGER NOT NULL REFERENCES "subscriptions"("id"),
  "stripe_payment_intent_id" TEXT NOT NULL,
  "amount_in_cents" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "metadata" JSONB DEFAULT '{}' NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Google Search Console tables
CREATE TABLE IF NOT EXISTS "gsc_connections" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "email" TEXT,
  "profile_picture" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "gsc_connections_user_id_idx" ON "gsc_connections" ("user_id");

CREATE TABLE IF NOT EXISTS "gsc_sites" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "site_url" TEXT NOT NULL,
  "permission_level" TEXT,
  "is_default" BOOLEAN DEFAULT false NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "gsc_sites_user_id_idx" ON "gsc_sites" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "gsc_sites_user_id_site_url_idx" ON "gsc_sites" ("user_id", "site_url");

CREATE TABLE IF NOT EXISTS "gsc_keyword_tracking" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "site_id" INTEGER NOT NULL REFERENCES "gsc_sites"("id") ON DELETE CASCADE,
  "keyword" TEXT NOT NULL,
  "article_id" INTEGER REFERENCES "articles"("id") ON DELETE SET NULL,
  "is_tracking" BOOLEAN DEFAULT true NOT NULL,
  "initial_position" INTEGER,
  "initial_impressions" INTEGER,
  "initial_clicks" INTEGER,
  "initial_ctr" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "gsc_keyword_tracking_user_id_idx" ON "gsc_keyword_tracking" ("user_id");
CREATE INDEX IF NOT EXISTS "gsc_keyword_tracking_site_id_idx" ON "gsc_keyword_tracking" ("site_id");
CREATE INDEX IF NOT EXISTS "gsc_keyword_tracking_article_id_idx" ON "gsc_keyword_tracking" ("article_id");
CREATE INDEX IF NOT EXISTS "gsc_keyword_tracking_keyword_idx" ON "gsc_keyword_tracking" ("keyword");

-- Insert default subscription plans
INSERT INTO "subscription_plans" ("name", "description", "price_in_cents", "interval", "article_limit", "keyword_report_limit", "features", "stripe_product_id", "stripe_price_id")
VALUES
  ('Free', 'Free plan with basic features', 0, 'monthly', 3, 5, '["Basic article generation", "Keyword research"]', 'prod_free', 'price_free'),
  ('Starter', 'Perfect for individuals', 999, 'monthly', 25, 50, '["Advanced article generation", "SEO optimization", "Keyword research"]', 'prod_starter', 'price_starter'),
  ('Pro', 'For growing businesses', 2999, 'monthly', 100, 200, '["Unlimited article generation", "Team collaboration", "Advanced SEO", "Priority support"]', 'prod_pro', 'price_pro'),
  ('Enterprise', 'For large organizations', 9999, 'monthly', -1, -1, '["Unlimited everything", "Custom integrations", "Dedicated support", "White-label options"]', 'prod_enterprise', 'price_enterprise')
ON CONFLICT DO NOTHING;

-- Create initial user usage record for admin
INSERT INTO "user_usage" ("user_id", "total_articles_generated", "free_articles_used", "articles_used", "credits_used", "payg_credits")
SELECT id, 0, 0, 0, 0, 999999 FROM "users" WHERE "email" = 'admin@wordgen.com'
ON CONFLICT DO NOTHING;
