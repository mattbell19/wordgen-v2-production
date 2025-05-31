import { Router } from 'express';
import { db } from '@db';
import { teams, users, teamMembers } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../../auth';
import ApiResponse from '../../lib/api-response';

const router = Router();

/**
 * Get active team details
 * GET /api/teams/active
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    console.log(`Getting active team for user ID: ${userId}`);

    // Get user with activeTeamId
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    console.log(`User data: ${JSON.stringify(user)}`);

    if (!user || !user.activeTeamId) {
      console.log('No active team ID found for user');
      return ApiResponse.success(res, null);
    }

    console.log(`Looking for active team with ID: ${user.activeTeamId}`);

    // Get active team details with a more detailed query
    const team = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        ownerId: teams.ownerId,
        settings: teams.settings,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .where(eq(teams.id, user.activeTeamId))
      .limit(1)
      .then(results => results[0] || null);

    console.log(`Team data: ${JSON.stringify(team)}`);

    if (!team) {
      console.log('Team not found, resetting activeTeamId');
      // If team doesn't exist, reset activeTeamId
      await db
        .update(users)
        .set({ activeTeamId: null })
        .where(eq(users.id, userId));

      return ApiResponse.success(res, null);
    }

    // Also verify that the user is actually a member of this team
    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, user.activeTeamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      ),
    });

    // If not a member, check if they're the owner
    if (!membership && team.ownerId !== userId) {
      console.log('User is not a member or owner of the active team, resetting activeTeamId');
      await db
        .update(users)
        .set({ activeTeamId: null })
        .where(eq(users.id, userId));

      return ApiResponse.success(res, null);
    }

    console.log(`Returning active team: ${JSON.stringify(team)}`);
    return ApiResponse.success(res, team);
  } catch (error: any) {
    console.error('Failed to get active team:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to get active team', 'GET_ACTIVE_TEAM_ERROR');
  }
});

export default router;
