-- Add email column to team_members table
ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Make userId nullable for pending invitations
ALTER TABLE "team_members" ALTER COLUMN "user_id" DROP NOT NULL;
