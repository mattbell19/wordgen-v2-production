-- Create migration log table to track applied migrations
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_migration_log_name ON migration_log(migration_name);

COMMENT ON TABLE migration_log IS 'Tracks which database migrations have been applied';