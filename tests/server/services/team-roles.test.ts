import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { db } from '../../../db';
import { teams, teamRoles, teamMembers, users } from '../../../db/schema';
import teamRolesService, { CreateRoleParams, UpdateRoleParams, AssignRoleParams } from '../../../services/team-roles.service';

// Mock the database
jest.mock('../../../db', () => ({
  db: {
    query: {
      teams: {
        findFirst: jest.fn(),
      },
      teamRoles: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      teamMembers: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      users: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn().mockResolvedValue([{ id: 1 }]),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([{ id: 1 }]),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn().mockResolvedValue([{ id: 1 }]),
    })),
  },
}));

describe('Team Roles Service', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('initializeDefaultRoles', () => {
    it('should create default roles for a team', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
      });

      // Mock no existing roles
      (db.query.teamRoles.findMany as jest.Mock).mockResolvedValue([]);

      const roles = await teamRolesService.initializeDefaultRoles(1);

      // Verify roles were created
      expect(db.insert).toHaveBeenCalledWith(teamRoles);
      expect(roles.length).toBeGreaterThan(0);
    });

    it('should return existing roles if team already has roles', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
      });

      // Mock existing roles
      const existingRoles = [
        { id: 1, name: 'Owner', teamId: 1 },
        { id: 2, name: 'Member', teamId: 1 },
      ];
      (db.query.teamRoles.findMany as jest.Mock).mockResolvedValue(existingRoles);

      const roles = await teamRolesService.initializeDefaultRoles(1);

      // Verify no new roles were created
      expect(db.insert).not.toHaveBeenCalled();
      expect(roles).toEqual(existingRoles);
    });

    it('should throw error if team not found', async () => {
      // Mock team not found
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamRolesService.initializeDefaultRoles(1))
        .rejects.toThrow('Team not found');
    });
  });

  describe('createRole', () => {
    const mockParams: CreateRoleParams = {
      name: 'Test Role',
      teamId: 1,
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
        canManageBilling: false,
        canManageRoles: false,
      },
      description: 'Test role description',
    };

    it('should create a new role', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
      });

      // Mock no existing role with same name
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue(null);

      const role = await teamRolesService.createRole(mockParams);

      // Verify role was created
      expect(db.insert).toHaveBeenCalledWith(teamRoles);
      expect(role).toHaveProperty('id');
    });

    it('should throw error if team not found', async () => {
      // Mock team not found
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamRolesService.createRole(mockParams))
        .rejects.toThrow('Team not found');
    });

    it('should throw error if role with same name already exists', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
      });

      // Mock existing role with same name
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Role',
        teamId: 1,
      });

      await expect(teamRolesService.createRole(mockParams))
        .rejects.toThrow('Role with name "Test Role" already exists');
    });
  });

  describe('updateRole', () => {
    const mockParams: UpdateRoleParams = {
      id: 1,
      name: 'Updated Role',
      permissions: {
        canInviteMembers: true,
      },
    };

    it('should update an existing role', async () => {
      // Mock existing role
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Role',
        teamId: 1,
        permissions: {
          canInviteMembers: false,
          canRemoveMembers: false,
        },
      });

      const role = await teamRolesService.updateRole(mockParams);

      // Verify role was updated
      expect(db.update).toHaveBeenCalledWith(teamRoles);
      expect(role).toHaveProperty('id');
    });

    it('should throw error if role not found', async () => {
      // Mock role not found
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamRolesService.updateRole(mockParams))
        .rejects.toThrow('Role not found');
    });

    it('should throw error if new name conflicts with existing role', async () => {
      // Mock existing role
      (db.query.teamRoles.findFirst as jest.Mock)
        .mockImplementation(async (args) => {
          // First call is to find the role being updated
          if (!args) return null;
          
          // For the first call, return the role being updated
          if (args.where && typeof args.where === 'function') {
            return {
              id: 1,
              name: 'Test Role',
              teamId: 1,
              permissions: {},
            };
          }
          
          // For the second call, return a different role with the same name
          return {
            id: 2,
            name: 'Updated Role',
            teamId: 1,
          };
        });

      await expect(teamRolesService.updateRole(mockParams))
        .rejects.toThrow('Role with name "Updated Role" already exists');
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      // Mock existing role
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Role',
        teamId: 1,
        team: {
          id: 1,
          name: 'Test Team',
        },
      });

      // Mock no members using this role
      (db.query.teamMembers.findMany as jest.Mock).mockResolvedValue([]);

      await teamRolesService.deleteRole(1);

      // Verify role was deleted
      expect(db.delete).toHaveBeenCalledWith(teamRoles);
    });

    it('should throw error if role not found', async () => {
      // Mock role not found
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamRolesService.deleteRole(1))
        .rejects.toThrow('Role not found');
    });

    it('should throw error if role is assigned to members', async () => {
      // Mock existing role
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Role',
        teamId: 1,
        team: {
          id: 1,
          name: 'Test Team',
        },
      });

      // Mock members using this role
      (db.query.teamMembers.findMany as jest.Mock).mockResolvedValue([
        { id: 1, userId: 1, roleId: 1 },
      ]);

      await expect(teamRolesService.deleteRole(1))
        .rejects.toThrow('Cannot delete role that is assigned to team members');
    });
  });

  describe('assignRole', () => {
    const mockParams: AssignRoleParams = {
      teamId: 1,
      userId: 1,
      roleId: 1,
    };

    it('should assign a role to a team member', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        ownerId: 2, // Different from userId in params
      });

      // Mock user
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      // Mock role
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Member',
        teamId: 1,
      });

      // Mock team membership
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        teamId: 1,
        userId: 1,
        roleId: 2, // Different role
      });

      await teamRolesService.assignRole(mockParams);

      // Verify role was assigned
      expect(db.update).toHaveBeenCalledWith(teamMembers);
    });

    it('should throw error if team not found', async () => {
      // Mock team not found
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamRolesService.assignRole(mockParams))
        .rejects.toThrow('Team not found');
    });

    it('should throw error if user not found', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
      });

      // Mock user not found
      (db.query.users.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamRolesService.assignRole(mockParams))
        .rejects.toThrow('User not found');
    });

    it('should throw error if role not found', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
      });

      // Mock user
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      // Mock role not found
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamRolesService.assignRole(mockParams))
        .rejects.toThrow('Role not found or does not belong to the team');
    });

    it('should throw error if user is not a team member', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
      });

      // Mock user
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      // Mock role
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Member',
        teamId: 1,
      });

      // Mock user not a team member
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamRolesService.assignRole(mockParams))
        .rejects.toThrow('User is not a member of the team');
    });

    it('should throw error if trying to change role of team owner', async () => {
      // Mock team with owner matching userId
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        ownerId: 1, // Same as userId in params
      });

      // Mock user
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      // Mock role that is not Owner
      (db.query.teamRoles.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Member', // Not Owner
        teamId: 1,
      });

      // Mock team membership
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        teamId: 1,
        userId: 1,
        roleId: 2,
      });

      await expect(teamRolesService.assignRole(mockParams))
        .rejects.toThrow('Cannot change role of team owner');
    });
  });

  describe('hasPermission', () => {
    it('should return true if user is team owner', async () => {
      // Mock team with owner matching userId
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        ownerId: 1, // Same as userId parameter
      });

      const hasPermission = await teamRolesService.hasPermission(1, 1, 'canInviteMembers');

      // Team owner should have all permissions
      expect(hasPermission).toBe(true);
    });

    it('should return true if user has the permission', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        ownerId: 2, // Different from userId parameter
      });

      // Mock team membership with role
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        teamId: 1,
        userId: 1,
        roleId: 1,
        status: 'active',
        role: {
          id: 1,
          name: 'Admin',
          permissions: {
            canInviteMembers: true,
          },
        },
      });

      const hasPermission = await teamRolesService.hasPermission(1, 1, 'canInviteMembers');

      expect(hasPermission).toBe(true);
    });

    it('should return false if user does not have the permission', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        ownerId: 2, // Different from userId parameter
      });

      // Mock team membership with role
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        teamId: 1,
        userId: 1,
        roleId: 1,
        status: 'active',
        role: {
          id: 1,
          name: 'Member',
          permissions: {
            canInviteMembers: false,
          },
        },
      });

      const hasPermission = await teamRolesService.hasPermission(1, 1, 'canInviteMembers');

      expect(hasPermission).toBe(false);
    });

    it('should return false if user is not a team member', async () => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        ownerId: 2, // Different from userId parameter
      });

      // Mock user not a team member
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue(null);

      const hasPermission = await teamRolesService.hasPermission(1, 1, 'canInviteMembers');

      expect(hasPermission).toBe(false);
    });

    it('should return false if team not found', async () => {
      // Mock team not found
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue(null);

      const hasPermission = await teamRolesService.hasPermission(1, 1, 'canInviteMembers');

      expect(hasPermission).toBe(false);
    });
  });
});
