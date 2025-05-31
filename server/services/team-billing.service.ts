import { db } from '../db';
import { eq } from 'drizzle-orm';
import { 
  teams, 
  teamSubscriptionPlans, 
  teamUsageRecords, 
  teamBillingContacts,
  teamUsageLimits,
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
      teamId,
      planId: parseInt(planId),
      status: 'active',
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: teamId.toString(),
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      articleLimit: plan.articleLimit,
      cancelAtPeriodEnd: false,
    });

    return subscription;
  }

  async recordUsage(params: TeamUsageParams) {
    const { teamId, userId, resourceType, quantity = 1, metadata = {} } = params;

    // Verify team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Record usage
    await db.insert(teamUsageRecords).values({
      teamId,
      userId,
      resourceType,
      quantity,
      metadata,
    });
  }

  async getUsage(teamId: number) {
    return db.query.teamUsageRecords.findMany({
      where: eq(teamUsageRecords.teamId, teamId),
    });
  }

  async setUsageLimit(teamId: number, resourceType: string, limitValue: number, period: string) {
    // Verify team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Set usage limit
    await db.insert(teamUsageLimits).values({
      teamId,
      resourceType,
      limitValue,
      period,
    });
  }

  async getUsageLimits(teamId: number) {
    return db.query.teamUsageLimits.findMany({
      where: eq(teamUsageLimits.teamId, teamId),
    });
  }

  async addBillingContact(teamId: number, userId: number, isPrimary: boolean = false) {
    // Verify team exists
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Add billing contact
    await db.insert(teamBillingContacts).values({
      teamId,
      userId,
      isPrimary,
    });
  }

  async getBillingContacts(teamId: number) {
    return db.query.teamBillingContacts.findMany({
      where: eq(teamBillingContacts.teamId, teamId),
    });
  }

  async getSubscriptionStatus(teamId: number) {
    return db.query.subscriptions.findFirst({
      where: eq(subscriptions.teamId, teamId),
    });
  }
}

export const teamBillingService = new TeamBillingService();

export default teamBillingService;
