import { Router } from 'express';
import { db } from '@db';
import { teams, teamMembers, teamRoles } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../../auth';
import ApiResponse from '../../lib/api-response';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate-request';
import teamRolesService, { TeamPermissions } from '../../services/team-roles.service';

const router = Router({ mergeParams: true });

// Schema for creating a role
const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  permissions: z.object({
    canInviteMembers: z.boolean(),
    canRemoveMembers: z.boolean(),
    canEditTeamSettings: z.boolean(),
    canCreateContent: z.boolean(),
    canEditContent: z.boolean(),
    canDeleteContent: z.boolean(),
    canApproveContent: z.boolean(),
    canManageKeywords: z.boolean(),
    canViewAnalytics: z.boolean(),
    canManageBilling: z.boolean(),
    canManageRoles: z.boolean(),
  }),
  description: z.string().optional(),
});

// Schema for updating a role
const updateRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required').optional(),
  permissions: z.object({
    canInviteMembers: z.boolean(),
    canRemoveMembers: z.boolean(),
    canEditTeamSettings: z.boolean(),
    canCreateContent: z.boolean(),
    canEditContent: z.boolean(),
    canDeleteContent: z.boolean(),
    canApproveContent: z.boolean(),
    canManageKeywords: z.boolean(),
    canViewAnalytics: z.boolean(),
    canManageBilling: z.boolean(),
    canManageRoles: z.boolean(),
  }).partial().optional(),
  description: z.string().optional(),
});

// Schema for assigning a role
const assignRoleSchema = z.object({
  userId: z.number(),
  roleId: z.number(),
});

/**
 * Get all roles for a team
 * GET /api/teams/:teamId/roles
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = req.user!.id;

    if (isNaN(teamId)) {
      return ApiResponse.badRequest(res, 'Invalid team ID', 'INVALID_TEAM_ID');
    }

    // Verify the team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Verify the user is a member of the team
    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      ),
    });

    if (!membership && team.ownerId !== userId) {
      return ApiResponse.forbidden(res, 'You are not a member of this team', 'NOT_TEAM_MEMBER');
    }

    // Get all roles for the team
    const roles = await teamRolesService.getRoles(teamId);

    return ApiResponse.success(res, roles);
  } catch (error: any) {
    console.error('Failed to get team roles:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to get team roles', 'ROLES_ERROR');
  }
});

/**
 * Create a new role
 * POST /api/teams/:teamId/roles
 */
router.post('/', requireAuth, validateRequest(createRoleSchema), async (req, res) => {
  try {
    const { name, permissions, description } = req.body;
    const teamId = parseInt(req.params.teamId);
    const userId = req.user!.id;

    if (isNaN(teamId)) {
      return ApiResponse.badRequest(res, 'Invalid team ID', 'INVALID_TEAM_ID');
    }

    // Verify the team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Check if user has permission to manage roles
    const hasPermission = await teamRolesService.hasPermission(userId, teamId, 'canManageRoles');
    
    if (!hasPermission && team.ownerId !== userId) {
      return ApiResponse.forbidden(res, 'You do not have permission to manage roles', 'PERMISSION_DENIED');
    }

    // Create the role
    const role = await teamRolesService.createRole({
      name,
      teamId,
      permissions,
      description,
    });

    return ApiResponse.success(res, role);
  } catch (error: any) {
    console.error('Failed to create team role:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to create team role', 'CREATE_ROLE_ERROR');
  }
});

/**
 * Update a role
 * PUT /api/teams/:teamId/roles/:roleId
 */
router.put('/:roleId', requireAuth, validateRequest(updateRoleSchema), async (req, res) => {
  try {
    const { name, permissions, description } = req.body;
    const teamId = parseInt(req.params.teamId);
    const roleId = parseInt(req.params.roleId);
    const userId = req.user!.id;

    if (isNaN(teamId) || isNaN(roleId)) {
      return ApiResponse.badRequest(res, 'Invalid team or role ID', 'INVALID_ID');
    }

    // Verify the team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Verify the role exists and belongs to the team
    const role = await db.query.teamRoles.findFirst({
      where: and(
        eq(teamRoles.id, roleId),
        eq(teamRoles.teamId, teamId)
      ),
    });

    if (!role) {
      return ApiResponse.notFound(res, 'Role not found or does not belong to the team', 'ROLE_NOT_FOUND');
    }

    // Check if user has permission to manage roles
    const hasPermission = await teamRolesService.hasPermission(userId, teamId, 'canManageRoles');
    
    if (!hasPermission && team.ownerId !== userId) {
      return ApiResponse.forbidden(res, 'You do not have permission to manage roles', 'PERMISSION_DENIED');
    }

    // Update the role
    const updatedRole = await teamRolesService.updateRole({
      id: roleId,
      name,
      permissions,
      description,
    });

    return ApiResponse.success(res, updatedRole);
  } catch (error: any) {
    console.error('Failed to update team role:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to update team role', 'UPDATE_ROLE_ERROR');
  }
});

/**
 * Delete a role
 * DELETE /api/teams/:teamId/roles/:roleId
 */
router.delete('/:roleId', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const roleId = parseInt(req.params.roleId);
    const userId = req.user!.id;

    if (isNaN(teamId) || isNaN(roleId)) {
      return ApiResponse.badRequest(res, 'Invalid team or role ID', 'INVALID_ID');
    }

    // Verify the team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Verify the role exists and belongs to the team
    const role = await db.query.teamRoles.findFirst({
      where: and(
        eq(teamRoles.id, roleId),
        eq(teamRoles.teamId, teamId)
      ),
    });

    if (!role) {
      return ApiResponse.notFound(res, 'Role not found or does not belong to the team', 'ROLE_NOT_FOUND');
    }

    // Check if user has permission to manage roles
    const hasPermission = await teamRolesService.hasPermission(userId, teamId, 'canManageRoles');
    
    if (!hasPermission && team.ownerId !== userId) {
      return ApiResponse.forbidden(res, 'You do not have permission to manage roles', 'PERMISSION_DENIED');
    }

    // Delete the role
    await teamRolesService.deleteRole(roleId);

    return ApiResponse.success(res, {
      message: 'Role deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete team role:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to delete team role', 'DELETE_ROLE_ERROR');
  }
});

/**
 * Assign a role to a team member
 * POST /api/teams/:teamId/roles/assign
 */
router.post('/assign', requireAuth, validateRequest(assignRoleSchema), async (req, res) => {
  try {
    const { userId: targetUserId, roleId } = req.body;
    const teamId = parseInt(req.params.teamId);
    const userId = req.user!.id;

    if (isNaN(teamId)) {
      return ApiResponse.badRequest(res, 'Invalid team ID', 'INVALID_TEAM_ID');
    }

    // Verify the team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Check if user has permission to manage roles
    const hasPermission = await teamRolesService.hasPermission(userId, teamId, 'canManageRoles');
    
    if (!hasPermission && team.ownerId !== userId) {
      return ApiResponse.forbidden(res, 'You do not have permission to manage roles', 'PERMISSION_DENIED');
    }

    // Assign the role
    await teamRolesService.assignRole({
      teamId,
      userId: targetUserId,
      roleId,
    });

    return ApiResponse.success(res, {
      message: 'Role assigned successfully',
    });
  } catch (error: any) {
    console.error('Failed to assign team role:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to assign team role', 'ASSIGN_ROLE_ERROR');
  }
});

/**
 * Get user permissions in a team
 * GET /api/teams/:teamId/roles/permissions
 */
router.get('/permissions', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = req.user!.id;

    if (isNaN(teamId)) {
      return ApiResponse.badRequest(res, 'Invalid team ID', 'INVALID_TEAM_ID');
    }

    // Get user permissions
    const permissions = await teamRolesService.getUserPermissions(userId, teamId);

    if (!permissions) {
      return ApiResponse.notFound(res, 'User permissions not found', 'PERMISSIONS_NOT_FOUND');
    }

    return ApiResponse.success(res, permissions);
  } catch (error: any) {
    console.error('Failed to get user permissions:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to get user permissions', 'PERMISSIONS_ERROR');
  }
});

/**
 * Initialize default roles for a team
 * POST /api/teams/:teamId/roles/initialize
 */
router.post('/initialize', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = req.user!.id;

    if (isNaN(teamId)) {
      return ApiResponse.badRequest(res, 'Invalid team ID', 'INVALID_TEAM_ID');
    }

    // Verify the team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Only team owner can initialize roles
    if (team.ownerId !== userId) {
      return ApiResponse.forbidden(res, 'Only the team owner can initialize roles', 'NOT_TEAM_OWNER');
    }

    // Initialize default roles
    const roles = await teamRolesService.initializeDefaultRoles(teamId);

    return ApiResponse.success(res, roles);
  } catch (error: any) {
    console.error('Failed to initialize team roles:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to initialize team roles', 'INITIALIZE_ROLES_ERROR');
  }
});

export default router;
