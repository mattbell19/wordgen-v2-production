import { Router } from 'express';
import { db } from '@db';
import { teams, teamMembers, teamRoles } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../../auth';
import ApiResponse from '../../lib/api-response';

const router = Router({ mergeParams: true });

/**
 * Remove a team member
 * DELETE /api/teams/:teamId/members/:memberId
 */
router.delete('/:memberId', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const memberId = parseInt(req.params.memberId);
    const userId = req.user!.id;

    if (isNaN(teamId) || isNaN(memberId)) {
      return ApiResponse.badRequest(res, 'Invalid team or member ID', 'INVALID_ID');
    }

    // Verify the team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Get the member to be removed
    const memberToRemove = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.id, memberId),
    });

    if (!memberToRemove) {
      return ApiResponse.notFound(res, 'Team member not found', 'MEMBER_NOT_FOUND');
    }

    // Check if the user is the team owner or has permission to remove members
    if (team.ownerId !== userId) {
      // Check if user has permission to remove members
      const userMembership = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.status, 'active')
        ),
        with: {
          role: true,
        },
      });

      if (!userMembership) {
        return ApiResponse.forbidden(res, 'You are not a member of this team', 'NOT_TEAM_MEMBER');
      }

      if (!userMembership.role.permissions.canRemoveMembers) {
        return ApiResponse.forbidden(res, 'You do not have permission to remove members', 'PERMISSION_DENIED');
      }

      // Users can't remove themselves unless they're the owner
      if (memberToRemove.userId === userId) {
        return ApiResponse.forbidden(res, 'You cannot remove yourself from the team', 'CANNOT_REMOVE_SELF');
      }
    }

    // Cannot remove the team owner
    if (memberToRemove.userId === team.ownerId) {
      return ApiResponse.forbidden(res, 'Cannot remove the team owner', 'CANNOT_REMOVE_OWNER');
    }

    // Remove the member
    await db
      .delete(teamMembers)
      .where(eq(teamMembers.id, memberId));

    return ApiResponse.success(res, { 
      message: 'Team member removed successfully',
      memberId
    });
  } catch (error: any) {
    console.error('Failed to remove team member:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to remove team member', 'REMOVE_MEMBER_ERROR');
  }
});

export default router;
