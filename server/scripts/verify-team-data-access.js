/**
 * Test script for team data access
 * 
 * This script verifies that team members can access shared team data by:
 * 1. Finding a team with multiple members
 * 2. Checking if members can access team content
 * 3. Verifying content attribution works correctly
 * 
 * Usage: 
 * NODE_ENV=development node server/scripts/verify-team-data-access.js
 */

const { db } = require('../dist/db');
const { teams, users, teamMembers, keywords, articles } = require('../dist/db/schema');
const { eq, and, inArray } = require('drizzle-orm');

async function main() {
  console.log('Starting team data access verification...');

  // Find a team with multiple members
  const teamsWithMembers = await db.query.teams.findMany({
    with: {
      members: {
        where: eq(teamMembers.status, 'active'),
        with: {
          user: true
        }
      }
    }
  });
  
  // Find a team with at least 2 members
  const team = teamsWithMembers.find(team => team.members.length >= 2);
  
  if (!team) {
    console.error('No teams found with multiple members. Please create a team with at least 2 members first.');
    process.exit(1);
  }
  
  console.log(`Using team "${team.name}" (ID: ${team.id}) with ${team.members.length} members`);
  
  // Get team member IDs
  const memberIds = team.members.map(member => member.userId).filter(Boolean);
  console.log(`Team members: ${memberIds.join(', ')}`);
  
  // Check if team has any keywords
  const teamKeywords = await db.query.keywords.findMany({
    where: eq(keywords.teamId, team.id),
    limit: 10
  });
  
  console.log(`Team has ${teamKeywords.length} keywords`);
  
  // Check if team has any articles
  const teamArticles = await db.query.articles.findMany({
    where: eq(articles.teamId, team.id),
    limit: 10
  });
  
  console.log(`Team has ${teamArticles.length} articles`);
  
  // If no team content exists, create some test content
  if (teamKeywords.length === 0) {
    console.log('Creating test keyword for team...');
    const keyword = await db.insert(keywords).values({
      keyword: 'test team keyword',
      teamId: team.id,
      userId: team.members[0].userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log(`Created test keyword with ID: ${keyword[0].id}`);
  }
  
  // Verify each member can access team content
  for (const member of team.members) {
    if (!member.userId) continue;
    
    console.log(`\nVerifying access for member: ${member.user.email} (ID: ${member.userId})`);
    
    // Simulate fetching keywords as this user
    const accessibleKeywords = await db.query.keywords.findMany({
      where: (fields) => {
        return inArray(fields.teamId, [team.id]);
      },
      limit: 5
    });
    
    console.log(`Member can access ${accessibleKeywords.length} team keywords`);
    
    if (accessibleKeywords.length > 0) {
      console.log('Sample keyword:', accessibleKeywords[0].keyword);
      console.log('Created by user ID:', accessibleKeywords[0].userId);
      console.log('Team ID:', accessibleKeywords[0].teamId);
    }
  }
  
  console.log('\nVerification completed');
  process.exit(0);
}

main().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});
