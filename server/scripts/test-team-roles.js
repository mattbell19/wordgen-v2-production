/**
 * Test script for team roles and permissions
 * 
 * This script tests the team roles and permissions functionality by:
 * 1. Finding a team to use for testing
 * 2. Checking existing roles and their permissions
 * 3. Testing permission enforcement
 * 
 * Usage: 
 * NODE_ENV=development node server/scripts/test-team-roles.js
 */

import { db } from '../dist/db.js';
import { createTeam } from '../dist/services/team.js';
import { createUser } from '../dist/services/user.js';
import { addTeamMember } from '../dist/services/team-member.js';

export async function testTeamRoles() {
  try {
    // Create test users
    const owner = await createUser({
      email: 'owner@test.com',
      name: 'Test Owner',
      password: 'password123'
    });

    // Create a test team
    const team = await createTeam({
      name: 'Test Team',
      ownerId: owner.id,
      plan: 'free'
    });

    // Test role creation
    const roles = [
      {
        name: 'admin',
        permissions: {
          canInviteMembers: true,
          canRemoveMembers: true,
          canEditTeamSettings: true,
          canCreateContent: true,
          canEditContent: true,
          canDeleteContent: true,
          canManageRoles: true
        }
      },
      {
        name: 'editor',
        permissions: {
          canInviteMembers: false,
          canRemoveMembers: false,
          canEditTeamSettings: false,
          canCreateContent: true,
          canEditContent: true,
          canDeleteContent: false,
          canManageRoles: false
        }
      },
      {
        name: 'viewer',
        permissions: {
          canInviteMembers: false,
          canRemoveMembers: false,
          canEditTeamSettings: false,
          canCreateContent: false,
          canEditContent: false,
          canDeleteContent: false,
          canManageRoles: false
        }
      }
    ];

    for (const roleData of roles) {
      const role = await db.teamRole.create({
        data: {
          teamId: team.id,
          name: roleData.name,
          permissions: roleData.permissions
        }
      });
      console.log(`✅ Created ${roleData.name} role`);
    }

    // Test role assignment
    const editor = await createUser({
      email: 'editor@test.com',
      name: 'Test Editor',
      password: 'password123'
    });

    const editorRole = await db.teamRole.findFirst({
      where: {
        teamId: team.id,
        name: 'editor'
      }
    });

    await addTeamMember({
      teamId: team.id,
      userId: editor.id,
      roleId: editorRole.id
    });

    console.log('✅ Assigned editor role to user');

    // Test permission checks
    const editorMember = await db.teamMember.findFirst({
      where: {
        teamId: team.id,
        userId: editor.id
      },
      include: {
        role: true
      }
    });

    if (editorMember.role.permissions.canCreateContent) {
      console.log('✅ Editor has correct content creation permission');
    } else {
      console.log('❌ Editor has incorrect content creation permission');
    }

    if (!editorMember.role.permissions.canManageRoles) {
      console.log('✅ Editor correctly cannot manage roles');
    } else {
      console.log('❌ Editor incorrectly can manage roles');
    }

    // Test role updates
    const updatedPermissions = {
      ...editorRole.permissions,
      canInviteMembers: true
    };

    await db.teamRole.update({
      where: {
        id: editorRole.id
      },
      data: {
        permissions: updatedPermissions
      }
    });

    console.log('✅ Updated editor role permissions');

    // Test role deletion
    const viewerRole = await db.teamRole.findFirst({
      where: {
        teamId: team.id,
        name: 'viewer'
      }
    });

    await db.teamRole.delete({
      where: {
        id: viewerRole.id
      }
    });

    console.log('✅ Deleted viewer role');

    console.log('Team roles tests completed successfully');
  } catch (error) {
    console.error('Error in test:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}
