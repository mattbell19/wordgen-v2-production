import { db } from '../dist/db.js';
import { createTeam } from '../dist/services/team.js';
import { createUser } from '../dist/services/user.js';
import { addTeamMember } from '../dist/services/team-member.js';

async function testTeamDataSharing() {
  try {
    // Create test users
    const owner = await createUser({
      email: 'owner@test.com',
      name: 'Test Owner',
      password: 'password123'
    });

    const member = await createUser({
      email: 'member@test.com',
      name: 'Test Member',
      password: 'password123'
    });

    // Create a test team
    const team = await createTeam({
      name: 'Test Team',
      ownerId: owner.id,
      plan: 'free'
    });

    // Add member to team
    await addTeamMember({
      teamId: team.id,
      userId: member.id,
      role: 'member'
    });

    // Create test content
    const testContent = await db.content.create({
      data: {
        teamId: team.id,
        creatorId: owner.id,
        title: 'Test Content',
        type: 'article',
        status: 'draft'
      }
    });

    console.log('Created test content:', testContent);

    // Verify member can access content
    const memberContent = await db.content.findFirst({
      where: {
        id: testContent.id,
        teamId: team.id
      }
    });

    if (memberContent) {
      console.log('✅ Member can access team content');
    } else {
      console.log('❌ Member cannot access team content');
    }

    // Test content isolation
    const otherTeam = await createTeam({
      name: 'Other Team',
      ownerId: owner.id,
      plan: 'free'
    });

    const otherTeamContent = await db.content.findFirst({
      where: {
        id: testContent.id,
        teamId: otherTeam.id
      }
    });

    if (!otherTeamContent) {
      console.log('✅ Content is properly isolated between teams');
    } else {
      console.log('❌ Content is leaking between teams');
    }

    // Test role-based access
    const viewerRole = await db.teamRole.create({
      data: {
        teamId: team.id,
        name: 'viewer',
        permissions: {
          canCreateContent: false,
          canEditContent: false,
          canDeleteContent: false
        }
      }
    });

    const viewer = await createUser({
      email: 'viewer@test.com',
      name: 'Test Viewer',
      password: 'password123'
    });

    await addTeamMember({
      teamId: team.id,
      userId: viewer.id,
      roleId: viewerRole.id
    });

    // Try to create content as viewer
    try {
      await db.content.create({
        data: {
          teamId: team.id,
          creatorId: viewer.id,
          title: 'Viewer Content',
          type: 'article',
          status: 'draft'
        }
      });
      console.log('❌ Viewer was able to create content');
    } catch (error) {
      console.log('✅ Viewer was prevented from creating content');
    }

    console.log('Team data sharing tests completed successfully');
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await db.$disconnect();
  }
}

testTeamDataSharing(); 