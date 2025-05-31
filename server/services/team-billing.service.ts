import { db } from '../db';
import { eq } from 'drizzle-orm';
import {
  teams,
  // teamSubscriptionPlans, // TODO: Add these tables to schema
  // teamUsageRecords,
  // teamBillingContacts,
  // teamUsageLimits,
  subscriptions,
  users,
} from '../../db/schema';
import { stripe, isDevelopment } from './stripe.service';

// Team subscription plans
const TEAM_SUBSCRIPTION_PLANS = [
  {
    name: 'Team Starter',
    description: 'For small teams up to 3 members',
    priceInCents: 4900,
    interval: 'monthly',
    maxMembers: 3,
    articleLimit: 100,
    keywordReportLimit: 50,
    features: ['Team collaboration', 'Shared projects', 'Basic analytics'],
    stripeProductId: 'prod_team_starter',
    stripePriceId: 'price_team_starter',
    isActive: true,
  },
  {
    name: 'Team Pro',
    description: 'For growing teams up to 10 members',
    priceInCents: 9900,
    interval: 'monthly',
    maxMembers: 10,
    articleLimit: 500,
    keywordReportLimit: 200,
    features: ['Advanced analytics', 'Priority support', 'Custom branding'],
    stripeProductId: 'prod_team_pro',
    stripePriceId: 'price_team_pro',
    isActive: true,
  },
  {
    name: 'Team Enterprise',
    description: 'For large teams with custom needs',
    priceInCents: 19900,
    interval: 'monthly',
    maxMembers: 50,
    articleLimit: 2000,
    keywordReportLimit: 1000,
    features: ['Custom integrations', 'Dedicated support', 'Advanced security'],
    stripeProductId: 'prod_team_enterprise',
    stripePriceId: 'price_team_enterprise',
    isActive: true,
  },
];

export interface CreateTeamSubscriptionParams {
  teamId: number;
  planId: string;
  paymentMethodId: string;
  userId: number;
}

export interface TeamUsageParams {
  teamId: number;
  userId: number;
  resourceType: string;
  quantity?: number;
  metadata?: Record<string, any>;
}

class TeamBillingService {
  async createSubscription(params: CreateTeamSubscriptionParams) {
    const { teamId, planId, paymentMethodId, userId } = params;

    // Verify team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Create Stripe subscription
    if (!stripe) {
      throw new Error('Stripe is not initialized');
    }
    
    const subscription = await stripe.subscriptions.create({
      customer: teamId.toString(), // Convert to string for Stripe
      items: [{ price: planId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Get the plan details to set the article limit
    const plan = TEAM_SUBSCRIPTION_PLANS.find(p => p.stripePriceId === planId);
    if (!plan) {
      throw new Error('Invalid plan ID');
    }

    // Create subscription record
    await db.insert(subscriptions).values({
      userId,
      planId: parseInt(planId),
      status: 'active',
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: teamId.toString(),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: false,
      articlesUsed: 0,
      metadata: { teamId, articleLimit: plan.articleLimit },
    });

    return subscription;
  }

  async recordUsage(params: TeamUsageParams) {
    // TODO: Implement when teamUsageRecords table is added to schema
    console.log('Team usage recording not implemented yet:', params);
    return Promise.resolve();
  }

  async getUsage(teamId: number) {
    // TODO: Implement when teamUsageRecords table is added to schema
    console.log('Team usage retrieval not implemented yet for team:', teamId);
    return [];
  }

  async setUsageLimit(teamId: number, resourceType: string, limitValue: number, period: string) {
    // TODO: Implement when teamUsageLimits table is added to schema
    console.log('Team usage limit setting not implemented yet:', { teamId, resourceType, limitValue, period });
    return Promise.resolve();
  }

  async getUsageLimits(teamId: number) {
    // TODO: Implement when teamUsageLimits table is added to schema
    console.log('Team usage limits retrieval not implemented yet for team:', teamId);
    return [];
  }

  async addBillingContact(teamId: number, userId: number, isPrimary: boolean = false) {
    // TODO: Implement when teamBillingContacts table is added to schema
    console.log('Team billing contact addition not implemented yet:', { teamId, userId, isPrimary });
    return Promise.resolve();
  }

  async getBillingContacts(teamId: number) {
    // TODO: Implement when teamBillingContacts table is added to schema
    console.log('Team billing contacts retrieval not implemented yet for team:', teamId);
    return [];
  }

  async getSubscriptionStatus(teamId: number) {
    // TODO: Update when teamId field is added to subscriptions table
    console.log('Team subscription status retrieval not fully implemented for team:', teamId);
    return null;
  }
}

export const teamBillingService = new TeamBillingService();

export default teamBillingService;
