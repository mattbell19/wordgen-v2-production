import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { teams, teamMembers, teamRoles } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import ApiResponse from '../lib/api-response';
import teamRolesService, { TeamPermissions } from '../services/team-roles.service';

/**
 * Middleware to check if a user has a specific permission in a team
 * @param permission The permission to check
 * @returns Middleware function
 */
export const checkTeamPermission = (permission: keyof TeamPermissions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from authenticated user
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
      }

      // Get team ID from params
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return ApiResponse.badRequest(res, 'Invalid team ID', 'INVALID_TEAM_ID');
      }

      // Check if team exists
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, teamId),
      });

      if (!team) {
        return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
      }

      // Team owner always has all permissions
      if (team.ownerId === userId) {
        return next();
      }

      // Check if user has the required permission
      const hasPermission = await teamRolesService.hasPermission(userId, teamId, permission);
      
      if (!hasPermission) {
        return ApiResponse.forbidden(
          res,
          `You do not have the required permission: ${permission}`,
          'PERMISSION_DENIED'
        );
      }

      // User has permission, proceed to the next middleware/route handler
      next();
    } catch (error: any) {
      console.error('Error checking team permission:', error);
      return ApiResponse.error(
        res,
        500,
        'An error occurred while checking permissions',
        'PERMISSION_CHECK_ERROR'
      );
    }
  };
};

export default checkTeamPermission;
