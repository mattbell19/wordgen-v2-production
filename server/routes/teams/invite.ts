import { Router } from 'express';
import { db } from '@db';
import { teams, teamMembers, teamRoles, users } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../../auth';
import ApiResponse from '../../lib/api-response';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate-request';
import { sendEmail } from '../../services/email';

const router = Router({ mergeParams: true });

// Schema for team invitation
const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  roleId: z.number().optional(),
});

/**
 * Send a team invitation
 * POST /api/teams/:id/invite
 */
router.post('/', requireAuth, validateRequest(inviteSchema), async (req, res) => {
  try {
    const { email, roleId } = req.body;
    const teamId = parseInt(req.params.id);
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

    // Verify the user is a member of the team with invite permissions
    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      ),
      with: {
        role: true,
      },
    });

    if (!membership) {
      return ApiResponse.forbidden(res, 'You are not a member of this team', 'NOT_TEAM_MEMBER');
    }

    // Check if user has permission to invite members
    if (!membership.role.permissions.canInviteMembers && team.ownerId !== userId) {
      return ApiResponse.forbidden(res, 'You do not have permission to invite members', 'PERMISSION_DENIED');
    }

    // Check if the invited user already exists
    let invitedUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Check if the user is already a member of the team
    if (invitedUser) {
      const existingMembership = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, invitedUser.id)
        ),
      });

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          return ApiResponse.badRequest(res, 'User is already a member of this team', 'ALREADY_MEMBER');
        } else if (existingMembership.status === 'pending') {
          return ApiResponse.badRequest(res, 'User has already been invited to this team', 'ALREADY_INVITED');
        }
      }
    }

    // Get the default member role if roleId is not provided
    let memberRoleId = roleId;
    if (!memberRoleId) {
      const defaultRole = await db.query.teamRoles.findFirst({
        where: and(
          eq(teamRoles.teamId, teamId),
          eq(teamRoles.name, 'Member')
        ),
      });

      if (!defaultRole) {
        return ApiResponse.serverError(res, 'Default member role not found', 'ROLE_NOT_FOUND');
      }

      memberRoleId = defaultRole.id;
    }

    // If the user doesn't exist, create a pending invitation
    if (!invitedUser) {
      // Create a pending invitation in the database
      await db.insert(teamMembers).values({
        teamId,
        userId: null, // Will be updated when the user registers
        email,
        roleId: memberRoleId,
        status: 'pending',
        invitedBy: userId,
        invitedAt: new Date(),
      });

      // Generate invitation link
      const appUrl = process.env.APP_URL || 'http://localhost:5000';
      const inviteToken = Buffer.from(`${teamId}:${email}`).toString('base64');
      const inviteLink = `${appUrl}/register?invite=${inviteToken}`;

      // Send invitation email
      await sendEmail(
        'team_invitation',
        {
          teamName: team.name,
          inviterName: req.user!.name || req.user!.email,
          acceptLink: inviteLink,
        },
        {
          to: email,
          userId: req.user!.id,
          subject: `You've been invited to join ${team.name} on WordGen`,
        }
      );

      return ApiResponse.success(res, { 
        message: 'Invitation sent to new user',
        email,
        status: 'new_user'
      });
    } else {
      // Create a pending invitation for existing user
      await db.insert(teamMembers).values({
        teamId,
        userId: invitedUser.id,
        roleId: memberRoleId,
        status: 'pending',
        invitedBy: userId,
        invitedAt: new Date(),
      });

      // Generate invitation link
      const appUrl = process.env.APP_URL || 'http://localhost:5000';
      const inviteToken = Buffer.from(`${teamId}:${invitedUser.id}`).toString('base64');
      const inviteLink = `${appUrl}/dashboard/teams/invite?token=${inviteToken}`;

      // Send invitation email
      await sendEmail(
        'team_invitation',
        {
          teamName: team.name,
          inviterName: req.user!.name || req.user!.email,
          acceptLink: inviteLink,
        },
        {
          to: email,
          userId: invitedUser.id,
          subject: `You've been invited to join ${team.name} on WordGen`,
        }
      );

      return ApiResponse.success(res, { 
        message: 'Invitation sent to existing user',
        email,
        status: 'existing_user'
      });
    }
  } catch (error: any) {
    console.error('Failed to send team invitation:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to send invitation', 'INVITATION_ERROR');
  }
});

export default router;
