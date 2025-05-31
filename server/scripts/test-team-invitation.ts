/**
 * Test script for team invitation emails
 * 
 * This script tests the team invitation email functionality by:
 * 1. Creating a test team if needed
 * 2. Sending a test invitation email
 * 3. Verifying the email was sent successfully
 * 
 * Usage: 
 * NODE_ENV=development node server/scripts/test-team-invitation.js
 */

import { db } from '@db';
import { sendEmail } from '../services/email';
import { teams, emailLogs } from '@db/schema';
import { eq } from 'drizzle-orm';

async function testTeamInvitation() {
  try {
    // Create a test team
    const [team] = await db.insert(teams).values({
      name: 'Test Team',
      ownerId: 1, // Using a numeric ID for the owner since users table uses serial IDs
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Test email addresses to verify
    const testEmails = [
      'test1@gmail.com',
      'test2@outlook.com',
      'test3@yahoo.com'
    ];

    // Send invitations to each email
    for (const email of testEmails) {
      await sendEmail('team_invitation', {
        teamName: team.name,
        inviterName: 'Test Owner',
        acceptLink: `http://localhost:3000/teams/${team.id}/accept-invitation`
      }, {
        to: email,
        metadata: {
          teamId: team.id,
          role: 'member',
          invitedBy: 'test-owner'
        }
      });
      console.log(`Invitation sent to ${email}`);
    }

    // Verify in email logs
    const logs = await db.query.emailLogs.findMany({
      where: (logs) => eq(logs.type, 'team_invitation')
    });

    console.log('Email Logs:', logs);
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testTeamInvitation();
