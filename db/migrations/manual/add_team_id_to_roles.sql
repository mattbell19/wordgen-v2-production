-- Add team_id column as nullable first
ALTER TABLE "team_roles" ADD COLUMN IF NOT EXISTS "team_id" integer;

-- Add foreign key constraint
ALTER TABLE "team_roles" 
ADD CONSTRAINT "team_roles_team_id_teams_id_fk" 
FOREIGN KEY ("team_id") 
REFERENCES "teams"("id") 
ON DELETE cascade 
ON UPDATE no action;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS "idx_team_roles_team_id" ON "team_roles"("team_id");

-- Update existing roles to have team_id from their members
UPDATE "team_roles" tr
SET team_id = tm.team_id
FROM "team_members" tm
WHERE tr.id = tm.role_id AND tr.team_id IS NULL;

-- Make team_id not nullable after update
ALTER TABLE "team_roles" ALTER COLUMN "team_id" SET NOT NULL; 