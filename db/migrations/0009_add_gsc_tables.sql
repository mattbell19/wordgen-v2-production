-- Migration: Add Google Search Console tables
-- Description: Creates tables for storing GSC connections, sites, and keyword tracking data

-- Create GSC connections table
CREATE TABLE IF NOT EXISTS gsc_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  email TEXT,
  profile_picture TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gsc_connections_user_id_idx ON gsc_connections(user_id);

-- Create GSC sites table
CREATE TABLE IF NOT EXISTS gsc_sites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_url TEXT NOT NULL,
  permission_level TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gsc_sites_user_id_idx ON gsc_sites(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS gsc_sites_user_id_site_url_idx ON gsc_sites(user_id, site_url);

-- Create GSC keyword tracking table
CREATE TABLE IF NOT EXISTS gsc_keyword_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id INTEGER NOT NULL REFERENCES gsc_sites(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  is_tracking BOOLEAN NOT NULL DEFAULT TRUE,
  initial_position INTEGER,
  initial_impressions INTEGER,
  initial_clicks INTEGER,
  initial_ctr TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gsc_keyword_tracking_user_id_idx ON gsc_keyword_tracking(user_id);
CREATE INDEX IF NOT EXISTS gsc_keyword_tracking_site_id_idx ON gsc_keyword_tracking(site_id);
CREATE INDEX IF NOT EXISTS gsc_keyword_tracking_article_id_idx ON gsc_keyword_tracking(article_id);
CREATE INDEX IF NOT EXISTS gsc_keyword_tracking_keyword_idx ON gsc_keyword_tracking(keyword);

-- Create GSC performance cache table
CREATE TABLE IF NOT EXISTS gsc_performance_cache (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES gsc_sites(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL,
  query_params TEXT NOT NULL,
  response_data TEXT NOT NULL, -- JSON data stored as text
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gsc_performance_cache_site_id_idx ON gsc_performance_cache(site_id);
CREATE INDEX IF NOT EXISTS gsc_performance_cache_query_type_idx ON gsc_performance_cache(query_type);
CREATE INDEX IF NOT EXISTS gsc_performance_cache_expires_at_idx ON gsc_performance_cache(expires_at);
