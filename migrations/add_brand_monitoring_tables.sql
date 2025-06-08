-- Brand Monitoring Feature Database Migration
-- This migration adds all necessary tables for the brand monitoring system

-- Brand monitoring configurations table
CREATE TABLE IF NOT EXISTS brand_monitoring (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  brand_name VARCHAR(100) NOT NULL,
  description TEXT,
  tracking_queries TEXT[] NOT NULL DEFAULT '{}',
  competitors TEXT[] DEFAULT '{}',
  monitoring_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM mentions and responses table
CREATE TABLE IF NOT EXISTS llm_mentions (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  brand_mentioned VARCHAR(100),
  mention_type VARCHAR(20) DEFAULT 'direct',
  ranking_position INTEGER,
  sentiment VARCHAR(20) DEFAULT 'neutral',
  confidence_score INTEGER DEFAULT 0,
  context_snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monitoring jobs queue table
CREATE TABLE IF NOT EXISTS monitoring_jobs (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'normal',
  progress INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  results JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimization recommendations table
CREATE TABLE IF NOT EXISTS optimization_recommendations (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  action_items TEXT[] NOT NULL DEFAULT '{}',
  expected_impact TEXT,
  timeframe VARCHAR(50),
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Competitor mentions tracking table
CREATE TABLE IF NOT EXISTS competitor_mentions (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
  competitor_name VARCHAR(100) NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  ranking_position INTEGER,
  sentiment VARCHAR(20) DEFAULT 'neutral',
  confidence_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily analytics aggregation table
CREATE TABLE IF NOT EXISTS llm_analytics_daily (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_mentions INTEGER DEFAULT 0,
  positive_mentions INTEGER DEFAULT 0,
  neutral_mentions INTEGER DEFAULT 0,
  negative_mentions INTEGER DEFAULT 0,
  average_ranking_position DECIMAL(4,2),
  platform_breakdown JSONB DEFAULT '{}',
  top_queries TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_monitoring_user_id ON brand_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_monitoring_team_id ON brand_monitoring(team_id);
CREATE INDEX IF NOT EXISTS idx_brand_monitoring_active ON brand_monitoring(is_active);

CREATE INDEX IF NOT EXISTS idx_llm_mentions_brand_id ON llm_mentions(brand_id);
CREATE INDEX IF NOT EXISTS idx_llm_mentions_platform ON llm_mentions(platform);
CREATE INDEX IF NOT EXISTS idx_llm_mentions_sentiment ON llm_mentions(sentiment);
CREATE INDEX IF NOT EXISTS idx_llm_mentions_created_at ON llm_mentions(created_at);
CREATE INDEX IF NOT EXISTS idx_llm_mentions_brand_created ON llm_mentions(brand_id, created_at);

CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_brand_id ON monitoring_jobs(brand_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_status ON monitoring_jobs(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_scheduled_at ON monitoring_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_status_scheduled ON monitoring_jobs(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_brand_id ON optimization_recommendations(brand_id);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_status ON optimization_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_optimization_recommendations_priority ON optimization_recommendations(priority);

CREATE INDEX IF NOT EXISTS idx_competitor_mentions_brand_id ON competitor_mentions(brand_id);
CREATE INDEX IF NOT EXISTS idx_competitor_mentions_competitor ON competitor_mentions(competitor_name);

CREATE INDEX IF NOT EXISTS idx_llm_analytics_daily_brand_id ON llm_analytics_daily(brand_id);
CREATE INDEX IF NOT EXISTS idx_llm_analytics_daily_date ON llm_analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_llm_analytics_daily_brand_date ON llm_analytics_daily(brand_id, date);

-- Add constraints for data integrity
ALTER TABLE brand_monitoring 
ADD CONSTRAINT chk_monitoring_frequency 
CHECK (monitoring_frequency IN ('hourly', 'daily', 'weekly', 'monthly'));

ALTER TABLE llm_mentions 
ADD CONSTRAINT chk_mention_type 
CHECK (mention_type IN ('direct', 'indirect', 'competitive'));

ALTER TABLE llm_mentions 
ADD CONSTRAINT chk_sentiment 
CHECK (sentiment IN ('positive', 'neutral', 'negative'));

ALTER TABLE monitoring_jobs 
ADD CONSTRAINT chk_job_status 
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

ALTER TABLE monitoring_jobs 
ADD CONSTRAINT chk_job_priority 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE optimization_recommendations 
ADD CONSTRAINT chk_recommendation_status 
CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed'));

ALTER TABLE optimization_recommendations 
ADD CONSTRAINT chk_recommendation_priority 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Add comments for documentation
COMMENT ON TABLE brand_monitoring IS 'Brand monitoring configurations for tracking brand mentions across LLM platforms';
COMMENT ON TABLE llm_mentions IS 'Individual brand mentions found in LLM responses with analysis data';
COMMENT ON TABLE monitoring_jobs IS 'Job queue for automated brand monitoring tasks';
COMMENT ON TABLE optimization_recommendations IS 'AI-generated recommendations for improving brand visibility';
COMMENT ON TABLE competitor_mentions IS 'Competitor mentions tracking for competitive analysis';
COMMENT ON TABLE llm_analytics_daily IS 'Daily aggregated analytics for brand monitoring performance';

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_brand_monitoring_updated_at 
    BEFORE UPDATE ON brand_monitoring 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_optimization_recommendations_updated_at 
    BEFORE UPDATE ON optimization_recommendations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust as needed for your setup)
-- These will be executed if the application database user is different from the migration user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON brand_monitoring TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON llm_mentions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_jobs TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON optimization_recommendations TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON competitor_mentions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON llm_analytics_daily TO your_app_user;

-- Grant sequence permissions
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Migration completion log
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('add_brand_monitoring_tables', NOW())
ON CONFLICT (migration_name) DO NOTHING;