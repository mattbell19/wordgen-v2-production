import { Router } from 'express';
import { db } from '@db';
import { teams, teamMembers, users } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../../auth';
import ApiResponse from '../../lib/api-response';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate-request';

const router = Router();

// Schema for invitation token
const tokenSchema = z.object({
  token: z.string(),
});

/**
 * Verify a team invitation
 * GET /api/teams/invites/verify
 */
router.get('/verify', requireAuth, async (req, res) => {
  try {
    const token = req.query.token as string;
    
    if (!token) {
      return ApiResponse.badRequest(res, 'Invitation token is required', 'MISSING_TOKEN');
    }

    // Decode the token
    let decodedToken: string;
    try {
      decodedToken = Buffer.from(token, 'base64').toString('utf-8');
    } catch (error) {
      return ApiResponse.badRequest(res, 'Invalid invitation token', 'INVALID_TOKEN');
    }

    // Parse the token (format: teamId:userId or teamId:email)
    const [teamIdStr, userIdentifier] = decodedToken.split(':');
    const teamId = parseInt(teamIdStr);

    if (isNaN(teamId)) {
      return ApiResponse.badRequest(res, 'Invalid invitation token', 'INVALID_TOKEN');
    }

    // Get the team
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Find the invitation
    let invitation;
    const userId = parseInt(userIdentifier);

    if (!isNaN(userId)) {
      // Token contains userId
      invitation = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.status, 'pending')
        ),
        with: {
          inviter: true,
        },
      });
    } else {
      // Token contains email
      invitation = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.email, userIdentifier),
          eq(teamMembers.status, 'pending')
        ),
        with: {
          inviter: true,
        },
      });
    }

    if (!invitation) {
      return ApiResponse.notFound(res, 'Invitation not found or already accepted', 'INVITATION_NOT_FOUND');
    }

    // Check if the current user matches the invitation
    if (!isNaN(userId) && userId !== req.user!.id) {
      return ApiResponse.forbidden(res, 'This invitation is for another user', 'WRONG_USER');
    }

    if (userIdentifier === invitation.email && invitation.email !== req.user!.email) {
      return ApiResponse.forbidden(res, 'This invitation is for another email address', 'WRONG_EMAIL');
    }

    // Return invitation details
    return ApiResponse.success(res, {
      teamId: team.id,
      teamName: team.name,
      inviterId: invitation.inviter?.id,
      inviterName: invitation.inviter?.name || invitation.inviter?.email,
    });
  } catch (error: any) {
    console.error('Failed to verify team invitation:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to verify invitation', 'VERIFICATION_ERROR');
  }
});

/**
 * Accept a team invitation
 * POST /api/teams/invites/accept
 */
router.post('/accept', requireAuth, validateRequest(tokenSchema), async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user!.id;

    // Decode the token
    let decodedToken: string;
    try {
      decodedToken = Buffer.from(token, 'base64').toString('utf-8');
    } catch (error) {
      return ApiResponse.badRequest(res, 'Invalid invitation token', 'INVALID_TOKEN');
    }

    // Parse the token (format: teamId:userId or teamId:email)
    const [teamIdStr, userIdentifier] = decodedToken.split(':');
    const teamId = parseInt(teamIdStr);

    if (isNaN(teamId)) {
      return ApiResponse.badRequest(res, 'Invalid invitation token', 'INVALID_TOKEN');
    }

    // Get the team
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return ApiResponse.notFound(res, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Find the invitation
    let invitation;
    const inviteeId = parseInt(userIdentifier);

    if (!isNaN(inviteeId)) {
      // Token contains userId
      invitation = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, inviteeId),
          eq(teamMembers.status, 'pending')
        ),
      });

      // Check if the current user matches the invitation
      if (inviteeId !== userId) {
        return ApiResponse.forbidden(res, 'This invitation is for another user', 'WRONG_USER');
      }
    } else {
      // Token contains email
      invitation = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.email, userIdentifier),
          eq(teamMembers.status, 'pending')
        ),
      });

      // Check if the current user's email matches the invitation
      if (userIdentifier !== req.user!.email) {
        return ApiResponse.forbidden(res, 'This invitation is for another email address', 'WRONG_EMAIL');
      }
    }

    if (!invitation) {
      return ApiResponse.notFound(res, 'Invitation not found or already accepted', 'INVITATION_NOT_FOUND');
    }

    // Accept the invitation
    await db
      .update(teamMembers)
      .set({
        userId: userId, // Set the user ID for email invitations
        status: 'active',
        joinedAt: new Date(),
      })
      .where(eq(teamMembers.id, invitation.id));

    // Set the user's active team to the joined team
    await db
      .update(users)
      .set({ activeTeamId: teamId })
      .where(eq(users.id, userId));

    return ApiResponse.success(res, {
      message: 'Invitation accepted successfully',
      teamId,
    });
  } catch (error: any) {
    console.error('Failed to accept team invitation:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to accept invitation', 'ACCEPT_ERROR');
  }
});

/**
 * Decline a team invitation
 * POST /api/teams/invites/decline
 */
router.post('/decline', requireAuth, validateRequest(tokenSchema), async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user!.id;

    // Decode the token
    let decodedToken: string;
    try {
      decodedToken = Buffer.from(token, 'base64').toString('utf-8');
    } catch (error) {
      return ApiResponse.badRequest(res, 'Invalid invitation token', 'INVALID_TOKEN');
    }

    // Parse the token (format: teamId:userId or teamId:email)
    const [teamIdStr, userIdentifier] = decodedToken.split(':');
    const teamId = parseInt(teamIdStr);

    if (isNaN(teamId)) {
      return ApiResponse.badRequest(res, 'Invalid invitation token', 'INVALID_TOKEN');
    }

    // Find the invitation
    let invitation;
    const inviteeId = parseInt(userIdentifier);

    if (!isNaN(inviteeId)) {
      // Token contains userId
      invitation = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, inviteeId),
          eq(teamMembers.status, 'pending')
        ),
      });

      // Check if the current user matches the invitation
      if (inviteeId !== userId) {
        return ApiResponse.forbidden(res, 'This invitation is for another user', 'WRONG_USER');
      }
    } else {
      // Token contains email
      invitation = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.email, userIdentifier),
          eq(teamMembers.status, 'pending')
        ),
      });

      // Check if the current user's email matches the invitation
      if (userIdentifier !== req.user!.email) {
        return ApiResponse.forbidden(res, 'This invitation is for another email address', 'WRONG_EMAIL');
      }
    }

    if (!invitation) {
      return ApiResponse.notFound(res, 'Invitation not found or already processed', 'INVITATION_NOT_FOUND');
    }

    // Delete the invitation
    await db
      .delete(teamMembers)
      .where(eq(teamMembers.id, invitation.id));

    return ApiResponse.success(res, {
      message: 'Invitation declined successfully',
    });
  } catch (error: any) {
    console.error('Failed to decline team invitation:', error);
    return ApiResponse.error(res, 500, error.message || 'Failed to decline invitation', 'DECLINE_ERROR');
  }
});

export default router;
