import { db } from '../db';
import { teams, teamMembers, teamInvitations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { sendTeamInvitationEmail } from './email';
import type { InferModel } from 'drizzle-orm';

type Team = InferModel<typeof teams>;
type TeamMember = InferModel<typeof teamMembers>;
type TeamInvitation = InferModel<typeof teamInvitations>;

export async function createTeam(data: { name: string; ownerId: number }): Promise<Team> {
  const [team] = await db.insert(teams)
    .values({
      name: data.name,
      ownerId: data.ownerId,
    })
    .returning();
  return team;
}

export async function inviteUserToTeam(data: {
  teamId: number;
  email: string;
  role: string;
  invitedBy: number;
}): Promise<TeamInvitation> {
  const [invitation] = await db.insert(teamInvitations)
    .values({
      teamId: data.teamId,
      email: data.email,
      role: data.role,
      invitedBy: data.invitedBy,
    })
    .returning();

  await sendTeamInvitationEmail({
    email: data.email,
    teamId: data.teamId,
    invitationId: invitation.id,
  });

  return invitation;
}

export async function acceptTeamInvitation(data: {
  invitationId: number;
  userId: number;
}): Promise<TeamMember> {
  const [invitation] = await db.select()
    .from(teamInvitations)
    .where(eq(teamInvitations.id, data.invitationId));

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  const [teamMember] = await db.insert(teamMembers)
    .values({
      teamId: invitation.teamId,
      userId: data.userId,
      role: invitation.role,
    })
    .returning();

  await db.delete(teamInvitations)
    .where(eq(teamInvitations.id, data.invitationId));

  return teamMember;
} 