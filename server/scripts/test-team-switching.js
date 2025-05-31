/**
 * Test script for team switching functionality
 * 
 * This script tests the team switching functionality by:
 * 1. Finding a user with access to at least one team
 * 2. Switching between personal and team contexts
 * 3. Verifying the activeTeamId is updated correctly
 * 
 * Usage: 
 * NODE_ENV=development node server/scripts/test-team-switching.js
 */

const { db } = require('../dist/db');
const { teams, users, teamMembers } = require('../dist/db/schema');
const { eq, and } = require('drizzle-orm');

async function main() {
  console.log('Starting team switching test...');

  // Find a user with team memberships
  const usersWithTeams = await db.query.users.findMany({
    with: {
      teamMemberships: {
        where: eq(teamMembers.status, 'active'),
        with: {
          team: true
        }
      }
    }
  });
  
  // Find a user with at least 1 team
  const user = usersWithTeams.find(user => user.teamMemberships.length > 0);
  
  if (!user) {
    console.error('No users found with team memberships. Please create a user with at least 1 team first.');
    process.exit(1);
  }
  
  console.log(`Using user "${user.email}" (ID: ${user.id}) with ${user.teamMemberships.length} teams`);
  console.log(`Current activeTeamId: ${user.activeTeamId}`);
  
  // Get the user's teams
  const userTeams = user.teamMemberships.map(membership => membership.team);
  console.log(`User teams: ${userTeams.map(team => `${team.name} (ID: ${team.id})`).join(', ')}`);
  
  // Test switching to personal context
  console.log('\nSwitching to personal context...');
  await db
    .update(users)
    .set({ activeTeamId: null })
    .where(eq(users.id, user.id));
  
  // Verify the update
  const personalUser = await db.query.users.findFirst({
    where: eq(users.id, user.id)
  });
  
  console.log(`User activeTeamId after switching to personal: ${personalUser.activeTeamId}`);
  console.log(`Personal mode: ${personalUser.activeTeamId === null ? '✅ Yes' : '❌ No'}`);
  
  // Test switching to team context
  if (userTeams.length > 0) {
    const teamToSwitch = userTeams[0];
    console.log(`\nSwitching to team "${teamToSwitch.name}" (ID: ${teamToSwitch.id})...`);
    
    await db
      .update(users)
      .set({ activeTeamId: teamToSwitch.id })
      .where(eq(users.id, user.id));
    
    // Verify the update
    const teamUser = await db.query.users.findFirst({
      where: eq(users.id, user.id)
    });
    
    console.log(`User activeTeamId after switching to team: ${teamUser.activeTeamId}`);
    console.log(`Team mode: ${teamUser.activeTeamId === teamToSwitch.id ? '✅ Yes' : '❌ No'}`);
  }
  
  console.log('\nTest completed');
  process.exit(0);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
