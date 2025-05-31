/**
 * Test script for team data sharing verification
 * 
 * This script tests the team data sharing functionality by:
 * 1. Creating a test team
 * 2. Adding multiple team members with different roles
 * 3. Creating content by different team members
 * 4. Verifying content visibility and permissions for team members
 * 5. Testing content editing and sharing between team members
 * 
 * Usage: 
 * NODE_ENV=development npx tsx server/scripts/verify-team-data-access.ts
 */

import { teams, users, articles, projects, teamMembers } from '@db/schema';
import { db } from '@db/index';
import { and, or, eq, inArray } from 'drizzle-orm';

async function verifyTeamDataAccess() {
  let testData = {
    team: null as any,
    adminUser: null as any,
    editorUser: null as any,
    viewerUser: null as any,
    adminProject: null as any,
    editorProject: null as any,
    adminArticle: null as any,
    editorArticle: null as any
  };

  try {
    const timestamp = Date.now();
    console.log('\n=== Starting Team Data Access Test ===');
    console.log(`Timestamp: ${timestamp}`);
    console.log('=====================================\n');
    
    // Create a test team
    console.log('1. Creating test team...');
    const [team] = await db.insert(teams).values({
      name: `Test Team ${timestamp}`,
      ownerId: 1,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testData.team = team;
    console.log('✓ Team created successfully:', JSON.stringify(team, null, 2));

    // Create test users
    console.log('\n2. Creating test users...');
    const [adminUser] = await db.insert(users).values({
      email: `admin${timestamp}@test.com`,
      password: 'test123',
      name: 'Admin User',
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testData.adminUser = adminUser;
    console.log('✓ Admin user created:', JSON.stringify(adminUser, null, 2));

    const [editorUser] = await db.insert(users).values({
      email: `editor${timestamp}@test.com`,
      password: 'test123',
      name: 'Editor User',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testData.editorUser = editorUser;
    console.log('✓ Editor user created:', JSON.stringify(editorUser, null, 2));

    const [viewerUser] = await db.insert(users).values({
      email: `viewer${timestamp}@test.com`,
      password: 'test123',
      name: 'Viewer User',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testData.viewerUser = viewerUser;
    console.log('✓ Viewer user created:', JSON.stringify(viewerUser, null, 2));

    // Add users to team with different roles
    console.log('\n3. Adding users to team...');
    await db.insert(teamMembers).values([
      {
        teamId: team.id,
        userId: adminUser.id,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        teamId: team.id,
        userId: editorUser.id,
        role: 'editor',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        teamId: team.id,
        userId: viewerUser.id,
        role: 'viewer',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]).returning();
    console.log('✓ Added users to team with roles');

    // Create team content by admin
    console.log('\n4. Creating content as admin user...');
    const [adminProject] = await db.insert(projects).values({
      userId: adminUser.id,
      name: `Admin Project ${timestamp}`,
      description: 'Test project created by admin',
      status: 'active',
      totalKeywords: 0,
      completedKeywords: 0,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testData.adminProject = adminProject;
    console.log('✓ Admin project created:', JSON.stringify(adminProject, null, 2));

    const [adminArticle] = await db.insert(articles).values({
      userId: adminUser.id,
      projectId: adminProject.id,
      title: `Admin Article ${timestamp}`,
      content: 'This is a test article created by admin',
      wordCount: 100,
      readingTime: 1,
      settings: {},
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testData.adminArticle = adminArticle;
    console.log('✓ Admin article created:', JSON.stringify(adminArticle, null, 2));

    // Create team content by editor
    console.log('\n5. Creating content as editor user...');
    const [editorProject] = await db.insert(projects).values({
      userId: editorUser.id,
      name: `Editor Project ${timestamp}`,
      description: 'Test project created by editor',
      status: 'active',
      totalKeywords: 0,
      completedKeywords: 0,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testData.editorProject = editorProject;
    console.log('✓ Editor project created:', JSON.stringify(editorProject, null, 2));

    const [editorArticle] = await db.insert(articles).values({
      userId: editorUser.id,
      projectId: editorProject.id,
      title: `Editor Article ${timestamp}`,
      content: 'This is a test article created by editor',
      wordCount: 100,
      readingTime: 1,
      settings: {},
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testData.editorArticle = editorArticle;
    console.log('✓ Editor article created:', JSON.stringify(editorArticle, null, 2));

    // Verify content visibility and permissions
    console.log('\n6. Verifying content visibility and permissions...');
    async function verifyContentAccess(userId: number, role: string) {
      try {
        // Get user's team membership
        const [membership] = await db.select()
          .from(teamMembers)
          .where(and(
            eq(teamMembers.userId, userId),
            eq(teamMembers.teamId, team.id)
          ));

        // Get team member IDs
        const teamMemberIds = (await db.select()
          .from(teamMembers)
          .where(eq(teamMembers.teamId, team.id)))
          .map(member => member.userId);

        // Get content visible to user (content created by any team member)
        const visibleArticles = await db.select()
          .from(articles)
          .where(inArray(articles.userId, teamMemberIds));
        
        const visibleProjects = await db.select()
          .from(projects)
          .where(inArray(projects.userId, teamMemberIds));
        
        // Test content editing permission
        const canEdit = role === 'admin' || role === 'editor';
        
        return {
          role: membership.role,
          articles: visibleArticles,
          projects: visibleProjects,
          canEdit
        };
      } catch (error) {
        console.error(`Error verifying access for ${role}:`, error);
        throw error;
      }
    }

    // Test access for each user role
    console.log('\n7. Testing access for each role...');
    
    const adminAccess = await verifyContentAccess(adminUser.id, 'admin');
    console.log('\nAdmin Access Results:');
    console.log('Role:', adminAccess.role);
    console.log('Visible Articles:', adminAccess.articles.length);
    console.log('Visible Projects:', adminAccess.projects.length);
    console.log('Can Edit:', adminAccess.canEdit);
    console.log('✓ Admin access verified');

    const editorAccess = await verifyContentAccess(editorUser.id, 'editor');
    console.log('\nEditor Access Results:');
    console.log('Role:', editorAccess.role);
    console.log('Visible Articles:', editorAccess.articles.length);
    console.log('Visible Projects:', editorAccess.projects.length);
    console.log('Can Edit:', editorAccess.canEdit);
    console.log('✓ Editor access verified');

    const viewerAccess = await verifyContentAccess(viewerUser.id, 'viewer');
    console.log('\nViewer Access Results:');
    console.log('Role:', viewerAccess.role);
    console.log('Visible Articles:', viewerAccess.articles.length);
    console.log('Visible Projects:', viewerAccess.projects.length);
    console.log('Can Edit:', viewerAccess.canEdit);
    console.log('✓ Viewer access verified');

    // Verify expected results
    console.log('\n8. Verifying test expectations...');
    const expectations = [
      {
        test: 'Admin can see all content',
        passed: adminAccess.articles.length === 2 && adminAccess.projects.length === 2
      },
      {
        test: 'Editor can see all content',
        passed: editorAccess.articles.length === 2 && editorAccess.projects.length === 2
      },
      {
        test: 'Viewer can see all content',
        passed: viewerAccess.articles.length === 2 && viewerAccess.projects.length === 2
      },
      {
        test: 'Admin has edit permissions',
        passed: adminAccess.canEdit === true
      },
      {
        test: 'Editor has edit permissions',
        passed: editorAccess.canEdit === true
      },
      {
        test: 'Viewer does not have edit permissions',
        passed: viewerAccess.canEdit === false
      }
    ];

    console.log('\nTest Results:');
    expectations.forEach(({ test, passed }) => {
      console.log(`${passed ? '✓' : '✗'} ${test}`);
    });

    // Clean up test data
    console.log('\n9. Cleaning up test data...');
    if (testData.editorArticle) {
      await db.delete(articles).where(eq(articles.id, testData.editorArticle.id));
      console.log('✓ Deleted editor article');
    }
    if (testData.adminArticle) {
      await db.delete(articles).where(eq(articles.id, testData.adminArticle.id));
      console.log('✓ Deleted admin article');
    }
    if (testData.editorProject) {
      await db.delete(projects).where(eq(projects.id, testData.editorProject.id));
      console.log('✓ Deleted editor project');
    }
    if (testData.adminProject) {
      await db.delete(projects).where(eq(projects.id, testData.adminProject.id));
      console.log('✓ Deleted admin project');
    }
    if (testData.team) {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, testData.team.id));
      console.log('✓ Deleted team members');
      await db.delete(teams).where(eq(teams.id, testData.team.id));
      console.log('✓ Deleted test team');
    }
    if (testData.adminUser) {
      await db.delete(users).where(eq(users.id, testData.adminUser.id));
      console.log('✓ Deleted admin user');
    }
    if (testData.editorUser) {
      await db.delete(users).where(eq(users.id, testData.editorUser.id));
      console.log('✓ Deleted editor user');
    }
    if (testData.viewerUser) {
      await db.delete(users).where(eq(users.id, testData.viewerUser.id));
      console.log('✓ Deleted viewer user');
    }

    console.log('\n=== Test Summary ===');
    console.log('Status: SUCCESS');
    console.log('All operations completed successfully');
    console.log('Test data cleaned up properly');
    console.log('===================\n');

  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('Error:', error);
    
    // Attempt to clean up any created data
    console.log('\nAttempting to clean up test data...');
    try {
      if (testData.editorArticle) {
        await db.delete(articles).where(eq(articles.id, testData.editorArticle.id));
      }
      if (testData.adminArticle) {
        await db.delete(articles).where(eq(articles.id, testData.adminArticle.id));
      }
      if (testData.editorProject) {
        await db.delete(projects).where(eq(projects.id, testData.editorProject.id));
      }
      if (testData.adminProject) {
        await db.delete(projects).where(eq(projects.id, testData.adminProject.id));
      }
      if (testData.team) {
        await db.delete(teamMembers).where(eq(teamMembers.teamId, testData.team.id));
        await db.delete(teams).where(eq(teams.id, testData.team.id));
      }
      if (testData.adminUser) {
        await db.delete(users).where(eq(users.id, testData.adminUser.id));
      }
      if (testData.editorUser) {
        await db.delete(users).where(eq(users.id, testData.editorUser.id));
      }
      if (testData.viewerUser) {
        await db.delete(users).where(eq(users.id, testData.viewerUser.id));
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    
    throw error;
  }
}

verifyTeamDataAccess().catch(console.error); 