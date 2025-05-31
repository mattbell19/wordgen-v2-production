import { db } from '@db';
import { users, teamMembers } from '@db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import type { Request } from 'express';
import type { User } from '../types/auth';

/**
 * Get the active context (personal or team) for the current user
 * @param req Express request object with authenticated user
 * @returns Object with userId and teamId (if in team context)
 */
export async function getActiveContext(req: Request): Promise<{ userId: number; teamId: number | null }> {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Get user with activeTeamId
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // If user has an active team, verify they are still a member
  if (user.activeTeamId) {
    const [membership] = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, user.activeTeamId),
        eq(teamMembers.userId, userId)
      ))
      .limit(1);

    // If not a member anymore, reset activeTeamId
    if (!membership) {
      await db
        .update(users)
        .set({ activeTeamId: null })
        .where(eq(users.id, userId));
      
      return { userId, teamId: null };
    }

    return { userId, teamId: user.activeTeamId };
  }

  return { userId, teamId: null };
}

/**
 * Get user IDs for the current context (personal or team)
 * @param req Express request object with authenticated user
 * @returns Array of user IDs (just the user's ID for personal context, or all team member IDs for team context)
 */
export async function getUserIdsForContext(req: Request): Promise<number[]> {
  const { userId, teamId } = await getActiveContext(req);

  // If not in team context, just return the user's ID
  if (!teamId) {
    return [userId];
  }

  // Get all team member user IDs
  const memberRecords = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  return memberRecords.map((member: { userId: number }) => member.userId);
}

/**
 * Create a where condition for team context
 * @param userIdField Field to use for user ID comparison
 * @param req Express request object with authenticated user
 * @returns Promise resolving to a where condition for Drizzle ORM
 */
export async function createTeamContextCondition(userIdField: any, req: Request) {
  const userIds = await getUserIdsForContext(req);
  return inArray(userIdField, userIds);
}
