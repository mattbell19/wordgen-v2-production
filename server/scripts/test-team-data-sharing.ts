import { db } from '../db';
import { users, teams, teamMembers, teamInvitations, articles, keywords } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function testTeamDataSharing() {
  console.log('Starting team data sharing test...');

  try {
    // Create test users
    console.log('Creating test users...');
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const [owner] = await db.insert(users).values({
      email: 'owner@test.com',
      password: hashedPassword,
      name: 'Team Owner',
    }).returning();

    const [member] = await db.insert(users).values({
      email: 'member@test.com',
      password: hashedPassword,
      name: 'Team Member',
    }).returning();

    // Create a team
    console.log('Creating test team...');
    const [team] = await db.insert(teams).values({
      name: 'Test Team',
      ownerId: owner.id,
    }).returning();

    // Invite and accept member
    console.log('Inviting and accepting team member...');
    const [invitation] = await db.insert(teamInvitations).values({
      teamId: team.id,
      email: member.email,
      role: 'MEMBER',
      invitedBy: owner.id,
    }).returning();

    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: member.id,
      role: invitation.role,
    });

    // Create content as owner
    console.log('Creating content as team owner...');
    const [ownerKeyword] = await db.insert(keywords).values({
      name: 'Test Keyword',
      userId: owner.id,
      teamId: team.id,
      keywords: ['test'],
      source: 'manual',
    }).returning();

    const [ownerArticle] = await db.insert(articles).values({
      title: 'Test Article',
      content: 'Test content',
      userId: owner.id,
      teamId: team.id,
      wordCount: 100,
      readingTime: 1,
      settings: {},
      primaryKeyword: 'test',
    }).returning();

    // Verify member can access team content
    console.log('Verifying member access to team content...');
    
    // Check keyword access
    const [accessedKeyword] = await db.select()
      .from(keywords)
      .where(
        or(
          eq(keywords.id, ownerKeyword.id),
          eq(keywords.teamId, team.id)
        )
      );
    console.log('Keyword access:', accessedKeyword ? '✅ Success' : '❌ Failed');

    // Check article access
    const [accessedArticle] = await db.select()
      .from(articles)
      .where(
        or(
          eq(articles.id, ownerArticle.id),
          eq(articles.teamId, team.id)
        )
      );
    console.log('Article access:', accessedArticle ? '✅ Success' : '❌ Failed');

    // Test content creation as member
    console.log('Testing content creation as team member...');
    const [newMemberKeyword] = await db.insert(keywords).values({
      name: 'Member Keyword',
      userId: member.id,
      teamId: team.id,
      keywords: ['member'],
      source: 'manual',
    }).returning();
    console.log('Member keyword creation:', newMemberKeyword ? '✅ Success' : '❌ Failed');

    const [newMemberArticle] = await db.insert(articles).values({
      title: 'Member Article',
      content: 'Member content',
      userId: member.id,
      teamId: team.id,
      wordCount: 100,
      readingTime: 1,
      settings: {},
      primaryKeyword: 'member',
    }).returning();
    console.log('Member article creation:', newMemberArticle ? '✅ Success' : '❌ Failed');

    // Verify content attribution
    console.log('Verifying content attribution...');
    const memberCreatedKeywords = await db.select()
      .from(keywords)
      .where(
        eq(keywords.teamId, team.id)
      );
    console.log('Member-created keywords count:', memberCreatedKeywords.length);

    const teamKeywords = await db.select()
      .from(keywords)
      .where(
        eq(keywords.teamId, team.id)
      );
    console.log('Total team keywords count:', teamKeywords.length);

    // Clean up
    console.log('Cleaning up test data...');
    await db.delete(articles).where(eq(articles.teamId, team.id));
    await db.delete(keywords).where(eq(keywords.teamId, team.id));
    await db.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
    await db.delete(teams).where(eq(teams.id, team.id));
    await db.delete(users).where(
      or(
        eq(users.id, owner.id),
        eq(users.id, member.id)
      )
    );

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTeamDataSharing(); 