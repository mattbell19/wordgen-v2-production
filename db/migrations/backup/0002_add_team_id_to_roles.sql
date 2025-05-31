-- Add team_id column to team_roles table
ALTER TABLE "team_roles" ADD COLUMN "team_id" integer NOT NULL;

-- Add foreign key constraint
ALTER TABLE "team_roles" 
ADD CONSTRAINT "team_roles_team_id_teams_id_fk" 
FOREIGN KEY ("team_id") 
REFERENCES "teams"("id") 
ON DELETE cascade 
ON UPDATE no action; 