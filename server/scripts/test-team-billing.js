/**
 * Test script for team billing functionality
 * 
 * This script tests the team billing functionality by:
 * 1. Finding a team to use for testing
 * 2. Checking if the team has a subscription
 * 3. Simulating usage tracking for the team
 * 
 * Usage: 
 * NODE_ENV=development node server/scripts/test-team-billing.js
 */

import { db } from '../dist/db.js';
import { createTeam } from '../dist/services/team.js';
import { createUser } from '../dist/services/user.js';
import { stripe, createCustomer } from '../dist/services/stripe.js';

export async function testTeamBilling() {
  try {
    // Create test user and team
    const owner = await createUser({
      email: 'billing-test@test.com',
      name: 'Billing Test User',
      password: 'password123'
    });

    const team = await createTeam({
      name: 'Billing Test Team',
      ownerId: owner.id,
      plan: 'free'
    });

    // Create Stripe customer
    const customer = await createCustomer(owner.email, owner.name);
    console.log('✅ Created Stripe customer');

    // Create subscription plan
    const subscriptionPlan = await db.teamSubscriptionPlan.create({
      data: {
        teamId: team.id,
        planType: 'pro',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });
    console.log('✅ Created subscription plan');

    // Create usage records
    const usageTypes = ['articles', 'keywords', 'api_calls'];
    for (const type of usageTypes) {
      await db.teamUsageRecord.create({
        data: {
          teamId: team.id,
          usageType: type,
          quantity: Math.floor(Math.random() * 100),
          recordedAt: new Date()
        }
      });
    }
    console.log('✅ Created usage records');

    // Create billing contact
    const billingContact = await db.teamBillingContact.create({
      data: {
        teamId: team.id,
        name: owner.name,
        email: owner.email,
        phone: '+1234567890'
      }
    });
    console.log('✅ Created billing contact');

    // Create usage limits
    const limits = [
      { type: 'articles', quantity: 100 },
      { type: 'keywords', quantity: 1000 },
      { type: 'api_calls', quantity: 10000 }
    ];

    for (const limit of limits) {
      await db.teamUsageLimit.create({
        data: {
          teamId: team.id,
          limitType: limit.type,
          maxQuantity: limit.quantity
        }
      });
    }
    console.log('✅ Created usage limits');

    // Test usage tracking
    const usageRecords = await db.teamUsageRecord.findMany({
      where: {
        teamId: team.id
      }
    });
    console.log(`Found ${usageRecords.length} usage records`);

    // Test limit enforcement
    const usageLimits = await db.teamUsageLimit.findMany({
      where: {
        teamId: team.id
      }
    });

    for (const record of usageRecords) {
      const limit = usageLimits.find(l => l.limitType === record.usageType);
      if (limit) {
        const isWithinLimit = record.quantity <= limit.maxQuantity;
        console.log(`Usage type ${record.usageType}: ${isWithinLimit ? '✅ Within limit' : '❌ Exceeds limit'}`);
      }
    }

    // Test subscription status
    const subscription = await db.teamSubscriptionPlan.findFirst({
      where: {
        teamId: team.id
      }
    });

    if (subscription.status === 'active') {
      console.log('✅ Subscription is active');
    } else {
      console.log('❌ Subscription is not active');
    }

    // Clean up test data
    await db.teamSubscriptionPlan.delete({
      where: {
        id: subscriptionPlan.id
      }
    });

    await db.teamBillingContact.delete({
      where: {
        id: billingContact.id
      }
    });

    for (const record of usageRecords) {
      await db.teamUsageRecord.delete({
        where: {
          id: record.id
        }
      });
    }

    for (const limit of usageLimits) {
      await db.teamUsageLimit.delete({
        where: {
          id: limit.id
        }
      });
    }

    console.log('✅ Cleaned up test data');
    console.log('Team billing tests completed successfully');
  } catch (error) {
    console.error('Error in test:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}
