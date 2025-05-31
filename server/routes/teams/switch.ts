import { Router } from 'express';
import { db } from '@db';
import { users, teams, teamMembers } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../../auth';
import ApiResponse from '../../lib/api-response';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate-request';

const router = Router();

// Schema for team switching
const switchTeamSchema = z.object({
  teamId: z.number().nullable(),
});

/**
 * Switch between personal and team accounts
 * POST /api/teams/switch
 */
router.post('/', requireAuth, validateRequest(switchTeamSchema), async (req, res) => {
  try {
    const { teamId } = req.body;
    const userId = req.user!.id;
    console.log(`Switch team request - User ID: ${userId}, Team ID: ${teamId}`);

    // If teamId is null, switch to personal account
    if (teamId === null) {
      console.log('Switching to personal account');
      await db
        .update(users)
        .set({ activeTeamId: null })
        .where(eq(users.id, userId));

      return ApiResponse.success(res, {
        message: 'Switched to personal account'
      });
    }

    console.log(`Verifying team exists: ${teamId}`);
    // Verify the team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    console.log(`Team data: ${JSON.stringify(team)}`);

    if (!team) {
      console.log(`Team not found with ID: ${teamId}`);
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    console.log(`Checking if user ${userId} is a member of team ${teamId}`);
    // Verify the user is a member of the team
    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      ),
    });

    console.log(`Membership data: ${JSON.stringify(membership)}`);

    if (!membership) {
      console.log(`User ${userId} is not a member of team ${teamId}`);
      return ApiResponse.forbidden(res, 'You are not a member of this team', 'NOT_TEAM_MEMBER');
    }

    console.log(`Updating user ${userId} activeTeamId to ${teamId}`);
    // Update the user's activeTeamId
    await db
      .update(users)
      .set({ activeTeamId: teamId })
      .where(eq(users.id, userId));

    console.log('Team switch successful');
    return ApiResponse.success(res, {
      message: 'Switched to team account',
      teamId
    });
  } catch (error: any) {
    console.error('Failed to switch team:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to switch team', 'SWITCH_TEAM_ERROR');
  }
});

// Note: The active team endpoint has been moved to its own file at /server/routes/teams/active.ts

export default router;
