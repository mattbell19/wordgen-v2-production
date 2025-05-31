-- Add activeTeamId to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "active_team_id" INTEGER;

-- Add foreign key constraint
ALTER TABLE "users" 
ADD CONSTRAINT "fk_users_active_team_id" 
FOREIGN KEY ("active_team_id") 
REFERENCES "teams"("id") 
ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS "idx_users_active_team_id" ON "users"("active_team_id");
