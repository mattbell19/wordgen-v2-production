CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  article_credits_remaining INTEGER NOT NULL DEFAULT 0,
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_date TIMESTAMP,
  total_articles_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_usage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_articles_generated INTEGER NOT NULL DEFAULT 0,
  free_articles_used INTEGER NOT NULL DEFAULT 0,
  free_keyword_reports_used INTEGER NOT NULL DEFAULT 0,
  total_keywords_analyzed INTEGER NOT NULL DEFAULT 0,
  total_word_count INTEGER NOT NULL DEFAULT 0,
  last_article_date TIMESTAMP,
  last_keyword_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'Wordgen',
  max_articles_per_user INTEGER NOT NULL DEFAULT 10,
  allow_new_registrations BOOLEAN DEFAULT TRUE,
  require_email_verification BOOLEAN DEFAULT TRUE,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (site_name, max_articles_per_user, allow_new_registrations, require_email_verification, maintenance_mode)
VALUES ('Wordgen', 10, TRUE, TRUE, FALSE)
ON CONFLICT DO NOTHING; 