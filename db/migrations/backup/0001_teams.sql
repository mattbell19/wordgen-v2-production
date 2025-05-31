-- Create teams table
CREATE TABLE IF NOT EXISTS "teams" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "owner_id" integer NOT NULL,
  "description" text,
  "settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create team roles table
CREATE TABLE IF NOT EXISTS "team_roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "permissions" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create team members table
CREATE TABLE IF NOT EXISTS "team_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "team_id" integer NOT NULL,
  "user_id" integer,
  "email" text,
  "role_id" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "invited_by" integer,
  "invited_at" timestamp DEFAULT now(),
  "joined_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "teams" 
ADD CONSTRAINT "teams_owner_id_users_id_fk" 
FOREIGN KEY ("owner_id") 
REFERENCES "users"("id") 
ON DELETE cascade 
ON UPDATE no action;

ALTER TABLE "team_members" 
ADD CONSTRAINT "team_members_team_id_teams_id_fk" 
FOREIGN KEY ("team_id") 
REFERENCES "teams"("id") 
ON DELETE cascade 
ON UPDATE no action;

ALTER TABLE "team_members" 
ADD CONSTRAINT "team_members_user_id_users_id_fk" 
FOREIGN KEY ("user_id") 
REFERENCES "users"("id") 
ON DELETE cascade 
ON UPDATE no action;

ALTER TABLE "team_members" 
ADD CONSTRAINT "team_members_role_id_team_roles_id_fk" 
FOREIGN KEY ("role_id") 
REFERENCES "team_roles"("id") 
ON DELETE no action 
ON UPDATE no action;

ALTER TABLE "team_members" 
ADD CONSTRAINT "team_members_invited_by_users_id_fk" 
FOREIGN KEY ("invited_by") 
REFERENCES "users"("id") 
ON DELETE no action 
ON UPDATE no action;

-- Add triggers for updated_at
CREATE TRIGGER teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER team_roles_updated_at
    BEFORE UPDATE ON team_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 