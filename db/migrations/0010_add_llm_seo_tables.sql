-- LLM SEO Addon Migration
-- Add brand monitoring and LLM SEO tracking tables

-- Brand monitoring configuration table
CREATE TABLE IF NOT EXISTS brand_monitoring (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    description TEXT,
    tracking_queries JSONB NOT NULL DEFAULT '[]',
    competitors JSONB NOT NULL DEFAULT '[]',
    monitoring_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- LLM mentions and responses table
CREATE TABLE IF NOT EXISTS llm_mentions (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
    llm_platform VARCHAR(50) NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    mention_type VARCHAR(20) NOT NULL,
    brand_mentioned VARCHAR(255),
    ranking_position INTEGER,
    sentiment VARCHAR(20),
    confidence_score INTEGER,
    context_snippet TEXT,
    response_metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Optimization recommendations table
CREATE TABLE IF NOT EXISTS optimization_recommendations (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    impact_estimate VARCHAR(20),
    effort_estimate VARCHAR(20),
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Monitoring jobs and schedules table
CREATE TABLE IF NOT EXISTS monitoring_jobs (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    results JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Competitor tracking table
CREATE TABLE IF NOT EXISTS competitor_mentions (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
    competitor_name VARCHAR(255) NOT NULL,
    llm_platform VARCHAR(50) NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    ranking_position INTEGER,
    sentiment VARCHAR(20),
    confidence_score INTEGER,
    context_snippet TEXT,
    response_metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Analytics aggregates for performance
CREATE TABLE IF NOT EXISTS llm_analytics_daily (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brand_monitoring(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_mentions INTEGER NOT NULL DEFAULT 0,
    positive_mentions INTEGER NOT NULL DEFAULT 0,
    neutral_mentions INTEGER NOT NULL DEFAULT 0,
    negative_mentions INTEGER NOT NULL DEFAULT 0,
    avg_ranking_position INTEGER,
    competitor_mentions INTEGER NOT NULL DEFAULT 0,
    llm_platform_breakdown JSONB NOT NULL DEFAULT '{}',
    query_performance JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(brand_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS brand_monitoring_user_id_idx ON brand_monitoring(user_id);
CREATE INDEX IF NOT EXISTS brand_monitoring_team_id_idx ON brand_monitoring(team_id);
CREATE INDEX IF NOT EXISTS brand_monitoring_brand_name_idx ON brand_monitoring(brand_name);
CREATE INDEX IF NOT EXISTS brand_monitoring_is_active_idx ON brand_monitoring(is_active);

CREATE INDEX IF NOT EXISTS llm_mentions_brand_id_idx ON llm_mentions(brand_id);
CREATE INDEX IF NOT EXISTS llm_mentions_platform_idx ON llm_mentions(llm_platform);
CREATE INDEX IF NOT EXISTS llm_mentions_created_at_idx ON llm_mentions(created_at);
CREATE INDEX IF NOT EXISTS llm_mentions_mention_type_idx ON llm_mentions(mention_type);
CREATE INDEX IF NOT EXISTS llm_mentions_sentiment_idx ON llm_mentions(sentiment);

CREATE INDEX IF NOT EXISTS optimization_recommendations_brand_id_idx ON optimization_recommendations(brand_id);
CREATE INDEX IF NOT EXISTS optimization_recommendations_status_idx ON optimization_recommendations(status);
CREATE INDEX IF NOT EXISTS optimization_recommendations_priority_idx ON optimization_recommendations(priority);
CREATE INDEX IF NOT EXISTS optimization_recommendations_type_idx ON optimization_recommendations(recommendation_type);

CREATE INDEX IF NOT EXISTS monitoring_jobs_brand_id_idx ON monitoring_jobs(brand_id);
CREATE INDEX IF NOT EXISTS monitoring_jobs_status_idx ON monitoring_jobs(status);
CREATE INDEX IF NOT EXISTS monitoring_jobs_job_type_idx ON monitoring_jobs(job_type);
CREATE INDEX IF NOT EXISTS monitoring_jobs_scheduled_at_idx ON monitoring_jobs(scheduled_at);

CREATE INDEX IF NOT EXISTS competitor_mentions_brand_id_idx ON competitor_mentions(brand_id);
CREATE INDEX IF NOT EXISTS competitor_mentions_competitor_idx ON competitor_mentions(competitor_name);
CREATE INDEX IF NOT EXISTS competitor_mentions_platform_idx ON competitor_mentions(llm_platform);
CREATE INDEX IF NOT EXISTS competitor_mentions_created_at_idx ON competitor_mentions(created_at);

CREATE INDEX IF NOT EXISTS llm_analytics_daily_brand_date_idx ON llm_analytics_daily(brand_id, date);
CREATE INDEX IF NOT EXISTS llm_analytics_daily_date_idx ON llm_analytics_daily(date);

-- Add constraints
ALTER TABLE llm_mentions ADD CONSTRAINT llm_mentions_platform_check 
    CHECK (llm_platform IN ('openai', 'anthropic', 'google', 'other'));

ALTER TABLE llm_mentions ADD CONSTRAINT llm_mentions_mention_type_check 
    CHECK (mention_type IN ('direct', 'indirect', 'competitor'));

ALTER TABLE llm_mentions ADD CONSTRAINT llm_mentions_sentiment_check 
    CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative'));

ALTER TABLE brand_monitoring ADD CONSTRAINT brand_monitoring_frequency_check 
    CHECK (monitoring_frequency IN ('daily', 'weekly', 'monthly'));

ALTER TABLE optimization_recommendations ADD CONSTRAINT optimization_recommendations_priority_check 
    CHECK (priority IN ('high', 'medium', 'low'));

ALTER TABLE optimization_recommendations ADD CONSTRAINT optimization_recommendations_status_check 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed'));

ALTER TABLE monitoring_jobs ADD CONSTRAINT monitoring_jobs_type_check 
    CHECK (job_type IN ('mention_scan', 'competitor_analysis', 'optimization_check'));

ALTER TABLE monitoring_jobs ADD CONSTRAINT monitoring_jobs_status_check 
    CHECK (status IN ('pending', 'running', 'completed', 'failed'));

ALTER TABLE competitor_mentions ADD CONSTRAINT competitor_mentions_platform_check 
    CHECK (llm_platform IN ('openai', 'anthropic', 'google', 'other'));

ALTER TABLE competitor_mentions ADD CONSTRAINT competitor_mentions_sentiment_check 
    CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative'));

-- Add confidence score constraints
ALTER TABLE llm_mentions ADD CONSTRAINT llm_mentions_confidence_score_check 
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100));

ALTER TABLE competitor_mentions ADD CONSTRAINT competitor_mentions_confidence_score_check 
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100));

-- Add comments for documentation
COMMENT ON TABLE brand_monitoring IS 'Stores brand monitoring configuration and settings';
COMMENT ON TABLE llm_mentions IS 'Tracks brand mentions found in LLM responses';
COMMENT ON TABLE optimization_recommendations IS 'Stores AI-generated optimization recommendations';
COMMENT ON TABLE monitoring_jobs IS 'Manages scheduled monitoring and analysis jobs';
COMMENT ON TABLE competitor_mentions IS 'Tracks competitor mentions for comparison analysis';
COMMENT ON TABLE llm_analytics_daily IS 'Daily aggregated analytics for brand performance';

COMMENT ON COLUMN brand_monitoring.tracking_queries IS 'Array of queries to monitor for brand mentions';
COMMENT ON COLUMN brand_monitoring.competitors IS 'Array of competitor brand names to track';
COMMENT ON COLUMN llm_mentions.confidence_score IS 'Confidence score 0-100 for mention detection accuracy';
COMMENT ON COLUMN llm_mentions.ranking_position IS 'Position of brand mention in LLM response (1-based)';
COMMENT ON COLUMN optimization_recommendations.impact_estimate IS 'Estimated impact of implementing recommendation';
COMMENT ON COLUMN optimization_recommendations.effort_estimate IS 'Estimated effort required to implement';