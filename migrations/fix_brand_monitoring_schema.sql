-- Fix brand monitoring schema to match the application code expectations

-- Fix llm_mentions table - rename llm_platform to platform
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llm_mentions' AND column_name = 'llm_platform') THEN
        ALTER TABLE llm_mentions RENAME COLUMN llm_platform TO platform;
    END IF;
END $$;

-- Update tracking_queries column type from JSONB to TEXT[] if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_monitoring' 
        AND column_name = 'tracking_queries' 
        AND data_type = 'jsonb'
    ) THEN
        -- Add new column with correct type
        ALTER TABLE brand_monitoring ADD COLUMN tracking_queries_new TEXT[];
        
        -- Convert JSONB to TEXT[] for existing data
        UPDATE brand_monitoring 
        SET tracking_queries_new = ARRAY(
            SELECT jsonb_array_elements_text(tracking_queries)
        );
        
        -- Drop old column and rename new one
        ALTER TABLE brand_monitoring DROP COLUMN tracking_queries;
        ALTER TABLE brand_monitoring RENAME COLUMN tracking_queries_new TO tracking_queries;
        
        -- Set NOT NULL and default
        ALTER TABLE brand_monitoring ALTER COLUMN tracking_queries SET NOT NULL;
        ALTER TABLE brand_monitoring ALTER COLUMN tracking_queries SET DEFAULT '{}';
    END IF;
END $$;

-- Update competitors column type from JSONB to TEXT[] if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'brand_monitoring' 
        AND column_name = 'competitors' 
        AND data_type = 'jsonb'
    ) THEN
        -- Add new column with correct type
        ALTER TABLE brand_monitoring ADD COLUMN competitors_new TEXT[];
        
        -- Convert JSONB to TEXT[] for existing data
        UPDATE brand_monitoring 
        SET competitors_new = ARRAY(
            SELECT jsonb_array_elements_text(competitors)
        );
        
        -- Drop old column and rename new one
        ALTER TABLE brand_monitoring DROP COLUMN competitors;
        ALTER TABLE brand_monitoring RENAME COLUMN competitors_new TO competitors;
        
        -- Set default
        ALTER TABLE brand_monitoring ALTER COLUMN competitors SET DEFAULT '{}';
    END IF;
END $$;

-- Add hourly option to monitoring frequency if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_monitoring_frequency'
        AND check_clause LIKE '%hourly%'
    ) THEN
        ALTER TABLE brand_monitoring DROP CONSTRAINT IF EXISTS chk_monitoring_frequency;
        ALTER TABLE brand_monitoring 
        ADD CONSTRAINT chk_monitoring_frequency 
        CHECK (monitoring_frequency IN ('hourly', 'daily', 'weekly', 'monthly'));
    END IF;
END $$;

-- Ensure monitoring_jobs table has all required columns
DO $$
BEGIN
    -- Add priority column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monitoring_jobs' AND column_name = 'priority') THEN
        ALTER TABLE monitoring_jobs ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
    END IF;
    
    -- Add progress column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monitoring_jobs' AND column_name = 'progress') THEN
        ALTER TABLE monitoring_jobs ADD COLUMN progress INTEGER DEFAULT 0;
    END IF;
    
    -- Add started_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monitoring_jobs' AND column_name = 'started_at') THEN
        ALTER TABLE monitoring_jobs ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add completed_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monitoring_jobs' AND column_name = 'completed_at') THEN
        ALTER TABLE monitoring_jobs ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add error_message column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monitoring_jobs' AND column_name = 'error_message') THEN
        ALTER TABLE monitoring_jobs ADD COLUMN error_message TEXT;
    END IF;
    
    -- Add results column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monitoring_jobs' AND column_name = 'results') THEN
        ALTER TABLE monitoring_jobs ADD COLUMN results JSONB DEFAULT '{}';
    END IF;
    
    -- Add config column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'monitoring_jobs' AND column_name = 'config') THEN
        ALTER TABLE monitoring_jobs ADD COLUMN config JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add constraints for monitoring_jobs if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_job_priority') THEN
        ALTER TABLE monitoring_jobs 
        ADD CONSTRAINT chk_job_priority 
        CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;
END $$;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_llm_mentions_platform ON llm_mentions(platform);
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_priority ON monitoring_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_monitoring_jobs_progress ON monitoring_jobs(progress);

-- Update platform check constraint to match new column name
DO $$
BEGIN
    -- Drop old constraint if exists
    ALTER TABLE llm_mentions DROP CONSTRAINT IF EXISTS llm_mentions_platform_check;
    
    -- Add new constraint
    ALTER TABLE llm_mentions 
    ADD CONSTRAINT llm_mentions_platform_check 
    CHECK (platform IN ('openai', 'anthropic', 'google', 'other'));
END $$;

-- Log successful migration
INSERT INTO migration_log (migration_name, executed_at, description) 
VALUES ('fix_brand_monitoring_schema', NOW(), 'Fixed schema alignment for brand monitoring feature')
ON CONFLICT (migration_name) DO NOTHING;