import { db } from '@db';
import { teams, teamRoles, teamMembers, users } from '@db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Define the permission types
export interface TeamPermissions {
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canEditTeamSettings: boolean;
  canCreateContent: boolean;
  canEditContent: boolean;
  canDeleteContent: boolean;
  canApproveContent: boolean;
  canManageKeywords: boolean;
  canViewAnalytics: boolean;
  canManageBilling: boolean;
  canManageRoles: boolean;
}

// Define the role types
export interface TeamRole {
  id: number;
  name: string;
  teamId: number;
  permissions: TeamPermissions;
  isDefault?: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Define the default roles
export const DEFAULT_ROLES = {
  OWNER: {
    name: 'Owner',
    description: 'Full access to all team features and settings',
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
      canManageBilling: true,
      canManageRoles: true,
    },
    isDefault: true,
  },
  ADMIN: {
    name: 'Admin',
    description: 'Can manage team members and content',
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
      canManageRoles: true,
    },
    isDefault: true,
  },
  EDITOR: {
    name: 'Editor',
    description: 'Can create and edit content',
    permissions: {
      canInviteMembers: false,
      canRemoveMembers: false,
      canEditTeamSettings: false,
      canCreateContent: true,
      canEditContent: true,
      canDeleteContent: true,
      canApproveContent: true,
      canManageKeywords: true,
      canViewAnalytics: true,
      canManageBilling: false,
      canManageRoles: false,
    },
    isDefault: true,
  },
  MEMBER: {
    name: 'Member',
    description: 'Basic access to team content',
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
      canManageBilling: false,
      canManageRoles: false,
    },
    isDefault: true,
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access to team content',
    permissions: {
      canInviteMembers: false,
      canRemoveMembers: false,
      canEditTeamSettings: false,
      canCreateContent: false,
      canEditContent: false,
      canDeleteContent: false,
      canApproveContent: false,
      canManageKeywords: false,
      canViewAnalytics: true,
      canManageBilling: false,
      canManageRoles: false,
    },
    isDefault: true,
  },
};

export interface CreateRoleParams {
  name: string;
  teamId: number;
  permissions: TeamPermissions;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateRoleParams {
  id: number;
  name?: string;
  permissions?: Partial<TeamPermissions>;
  description?: string;
}

export interface AssignRoleParams {
  teamId: number;
  userId: number;
  roleId: number;
}

export const teamRolesService = {
  // Initialize default roles for a team
  async initializeDefaultRoles(teamId: number): Promise<TeamRole[]> {
    const roles: TeamRole[] = [];

    // Check if team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Check if team already has roles
    const existingRoles = await db.query.teamRoles.findMany({
      where: eq(teamRoles.teamId, teamId),
    });

    if (existingRoles.length > 0) {
      return existingRoles as TeamRole[];
    }

    // Create default roles
    for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
      const [newRole] = await db.insert(teamRoles).values({
        name: role.name,
        teamId,
        permissions: role.permissions,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      roles.push(newRole as TeamRole);
    }

    return roles;
  },

  // Create a new role
  async createRole(params: CreateRoleParams): Promise<TeamRole> {
    const { name, teamId, permissions, description, isDefault } = params;

    // Check if team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Check if role with same name already exists
    const existingRole = await db.query.teamRoles.findFirst({
      where: and(
        eq(teamRoles.teamId, teamId),
        eq(teamRoles.name, name)
      ),
    });

    if (existingRole) {
      throw new Error(`Role with name "${name}" already exists`);
    }

    // Create the role
    const [role] = await db.insert(teamRoles).values({
      name,
      teamId,
      permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return role as TeamRole;
  },

  // Update an existing role
  async updateRole(params: UpdateRoleParams): Promise<TeamRole> {
    const { id, name, permissions, description } = params;

    // Check if role exists
    const existingRole = await db.query.teamRoles.findFirst({
      where: eq(teamRoles.id, id),
    });

    if (!existingRole) {
      throw new Error('Role not found');
    }

    // Check if role with same name already exists (if name is being updated)
    if (name && name !== existingRole.name) {
      const duplicateRole = await db.query.teamRoles.findFirst({
        where: and(
          eq(teamRoles.teamId, existingRole.teamId),
          eq(teamRoles.name, name)
        ),
      });

      if (duplicateRole) {
        throw new Error(`Role with name "${name}" already exists`);
      }
    }

    // Update the role
    const [updatedRole] = await db
      .update(teamRoles)
      .set({
        name: name || existingRole.name,
        permissions: permissions ? { ...existingRole.permissions, ...permissions } : existingRole.permissions,
        updatedAt: new Date(),
      })
      .where(eq(teamRoles.id, id))
      .returning();

    return updatedRole as TeamRole;
  },

  // Delete a role
  async deleteRole(id: number): Promise<void> {
    // Check if role exists
    const role = await db.query.teamRoles.findFirst({
      where: eq(teamRoles.id, id),
      with: {
        team: true,
      },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Check if role is in use
    const membersWithRole = await db.query.teamMembers.findMany({
      where: eq(teamMembers.roleId, id),
    });

    if (membersWithRole.length > 0) {
      throw new Error('Cannot delete role that is assigned to team members');
    }

    // Delete the role
    await db.delete(teamRoles).where(eq(teamRoles.id, id));
  },

  // Get all roles for a team
  async getRoles(teamId: number): Promise<TeamRole[]> {
    const roles = await db.query.teamRoles.findMany({
      where: eq(teamRoles.teamId, teamId),
      orderBy: (roles) => roles.name,
    });

    return roles as TeamRole[];
  },

  // Get a specific role
  async getRole(id: number): Promise<TeamRole | null> {
    const role = await db.query.teamRoles.findFirst({
      where: eq(teamRoles.id, id),
    });

    return role as TeamRole | null;
  },

  // Assign a role to a team member
  async assignRole(params: AssignRoleParams): Promise<void> {
    const { teamId, userId, roleId } = params;

    // Check if team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if role exists and belongs to the team
    const role = await db.query.teamRoles.findFirst({
      where: and(
        eq(teamRoles.id, roleId),
        eq(teamRoles.teamId, teamId)
      ),
    });

    if (!role) {
      throw new Error('Role not found or does not belong to the team');
    }

    // Check if user is a member of the team
    const membership = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ),
    });

    if (!membership) {
      throw new Error('User is not a member of the team');
    }

    // Cannot change role of team owner
    if (team.ownerId === userId && role.name !== 'Owner') {
      throw new Error('Cannot change role of team owner');
    }

    // Update the member's role
    await db
      .update(teamMembers)
      .set({
        roleId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        )
      );
  },

  // Check if a user has a specific permission
  async hasPermission(userId: number, teamId: number, permission: keyof TeamPermissions): Promise<boolean> {
    // Check if team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return false;
    }

    // Team owner always has all permissions
    if (team.ownerId === userId) {
      return true;
    }

    // Get user's membership and role
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

    if (!membership || !membership.role) {
      return false;
    }

    // Check the specific permission
    return !!membership.role.permissions[permission];
  },

  // Get all permissions for a user in a team
  async getUserPermissions(userId: number, teamId: number): Promise<TeamPermissions | null> {
    // Check if team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      return null;
    }

    // Team owner always has all permissions
    if (team.ownerId === userId) {
      return DEFAULT_ROLES.OWNER.permissions;
    }

    // Get user's membership and role
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

    if (!membership || !membership.role) {
      return null;
    }

    return membership.role.permissions as TeamPermissions;
  },
};

export default teamRolesService;
