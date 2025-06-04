import { Router } from 'express';
import { db } from '@db';
import { and, eq, inArray } from 'drizzle-orm';
import {
  teams,
  teamMembers,
  teamRoles,
  users,
  insertTeamSchema,
  insertTeamRoleSchema,
  insertTeamMemberSchema,
} from '@db/schema';
import { sendEmail } from '../services/email';
import type { Request, Response } from 'express';
import type { User } from '../types/auth';
import { requireAuth } from '../auth';
import ApiResponse from '../lib/api-response';

interface TeamMemberWithRole {
  role: {
    id: number;
    name: string;
    permissions: {
      canInviteMembers: boolean;
      canRemoveMembers: boolean;
      canEditTeamSettings: boolean;
      canCreateContent: boolean;
      canEditContent: boolean;
      canDeleteContent: boolean;
      canApproveContent: boolean;
      canManageKeywords: boolean;
      canViewAnalytics: boolean;
    };
  };
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const router = Router();

// Create a new team
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Team name is required"
      });
    }

    // Check if user already has a team
    const existingTeam = await db.query.teams.findFirst({
      where: eq(teams.ownerId, req.user!.id),
    });

    if (existingTeam) {
      return res.status(400).json({
        ok: false,
        message: "You can only create one team"
      });
    }

    // Create team
    const [team] = await db.insert(teams).values({
      name: name.trim(),
      description: description?.trim(),
      ownerId: req.user!.id,
      settings: {},
    }).returning();

    // Create default admin role for the team
    const [adminRole] = await db.insert(teamRoles).values({
      name: 'Admin',
      teamId: team.id,
      permissions: {
        canInviteMembers: true,
        canRemoveMembers: true,
        canEditTeamSettings: true,
        canCreateContent: true,
        canEditContent: true,
        canDeleteContent: true,
        canApproveContent: true,
        canManageKeywords: true,
        canViewAnalytics: true,
      },
    }).returning();

    // Create default member role for the team
    const [memberRole] = await db.insert(teamRoles).values({
      name: 'Member',
      teamId: team.id,
      permissions: {
        canInviteMembers: false,
        canRemoveMembers: false,
        canEditTeamSettings: false,
        canCreateContent: true,
        canEditContent: false,
        canDeleteContent: false,
        canApproveContent: false,
        canManageKeywords: true,
        canViewAnalytics: true,
      },
    }).returning();

    // Add team owner as admin
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: req.user!.id,
      roleId: adminRole.id,
      status: 'active',
      joinedAt: new Date(),
    });

    // Set the user's active team to the new team
    await db
      .update(users)
      .set({ activeTeamId: team.id })
      .where(eq(users.id, req.user!.id));

    res.status(201).json({ ok: true, team });
  } catch (error: any) {
    console.error('Failed to create team:', error);
    res.status(500).json({
      ok: false,
      message: error.message || 'Failed to create team'
    });
  }
});

// Get user's teams
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('Teams route - Request headers:', req.headers);
    console.log('Teams route - Session:', req.session);
    console.log('Teams route - User object:', req.user);

    if (!req.user || !req.user.id) {
      console.error('No user found in request');
      return ApiResponse.error(res, 401, 'User not authenticated');
    }

    // Check if database is available
    if (!db) {
      console.warn("Database not available - teams disabled in development");
      return ApiResponse.error(res, 503, "Database not available. Please deploy to Heroku to test teams.", "DATABASE_UNAVAILABLE");
    }

    console.log(`Fetching teams for user ID: ${req.user.id}`);

    // Get team IDs where the user is a member OR is the owner
    try {
      // First, check if the user owns any teams
      const ownedTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.ownerId, req.user.id));

      console.log('Teams owned by user:', ownedTeams);

      // Get teams where the user is a member
      const memberResults = await db
        .select({
          teamId: teamMembers.teamId,
        })
        .from(teamMembers)
        .where(and(
          eq(teamMembers.userId, req.user.id),
          eq(teamMembers.status, 'active')
        ));

      console.log('Raw member results:', memberResults);

      // Combine owned teams and member teams
      const ownedTeamIds = ownedTeams.map(team => team.id);
      const memberTeamIds = memberResults.map(member => member.teamId).filter(Boolean);

      // Combine and deduplicate team IDs
      const allTeamIds = [...ownedTeamIds, ...memberTeamIds]
        .filter((id, index, self) => self.indexOf(id) === index);

      console.log('All team IDs (owned + member):', allTeamIds);

      // If user has no teams, return empty array
      if (allTeamIds.length === 0) {
        console.log('User has no teams, returning empty array');
        return ApiResponse.success(res, { teams: [] });
      }

      // Get team details with a more robust query
      const userTeams = await db
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
        .where(inArray(teams.id, allTeamIds));

      console.log('Retrieved teams:', userTeams);

      // Create the response object
      const response = { teams: userTeams };
      console.log('Sending API response:', response);

      return ApiResponse.success(res, response);
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      console.error('Error stack:', dbError.stack);
      return ApiResponse.error(res, 500, `Database error: ${dbError.message}`);
    }
  } catch (error: any) {
    console.error('Failed to fetch teams:', error);
    console.error('Error stack:', error.stack);
    return ApiResponse.error(res, 500, `Failed to fetch teams: ${error.message}`);
  }
});

// Get a specific team's details
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate teamId is a number
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ ok: false, message: 'Invalid team ID' });
    }

    // Check if user is a member of the team
    const memberCheck = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, req.user!.id)
      ))
      .limit(1);

    if (memberCheck.length === 0) {
      return res.status(403).json({ ok: false, message: 'Access denied' });
    }

    // Get team details
    const teamData = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (teamData.length === 0) {
      return res.status(404).json({ ok: false, message: 'Team not found' });
    }

    // Get team members with a simpler query
    const members = await db
      .select({
        id: teamMembers.id,
        status: teamMembers.status,
        userId: teamMembers.userId,
        roleId: teamMembers.roleId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    // Get all user IDs that are valid
    const userIds = members
      .map(member => member.userId)
      .filter(id => id !== null && id !== undefined);

    // Get all role IDs that are valid
    const roleIds = members
      .map(member => member.roleId)
      .filter(id => id !== null && id !== undefined);

    // Fetch all users in one query
    const usersData = userIds.length > 0 ? await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(inArray(users.id, userIds)) : [];

    // Fetch all roles in one query
    const rolesData = roleIds.length > 0 ? await db
      .select()
      .from(teamRoles)
      .where(inArray(teamRoles.id, roleIds)) : [];

    // Create a map for quick lookups
    const usersMap = new Map(usersData.map(user => [user.id, user]));
    const rolesMap = new Map(rolesData.map(role => [role.id, role]));

    // Map members with their user and role data
    const memberDetails = members.map(member => {
      if (!member.userId) return null;

      return {
        id: member.id,
        status: member.status,
        user: usersMap.get(member.userId),
        role: member.roleId ? rolesMap.get(member.roleId) : null,
      };
    });

    // Filter out null values (members without users)
    const validMembers = memberDetails.filter(Boolean);

    const team = {
      ...teamData[0],
      members: validMembers,
    };

    res.json({ ok: true, team });
  } catch (error: any) {
    console.error('Failed to fetch team:', error);
    res.status(500).json({ ok: false, message: 'Failed to fetch team' });
  }
});

export const teamRoutes = router;