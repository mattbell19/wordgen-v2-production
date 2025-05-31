import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { db } from '../../../db';
import { teams, teamMembers, teamSubscriptionPlans, subscriptions, teamUsageRecords } from '../../../db/schema';
import teamBillingService, { CreateTeamSubscriptionParams, TeamUsageParams } from '../../../services/team-billing.service';

// Mock the database
jest.mock('../../../db', () => ({
  db: {
    query: {
      teams: {
        findFirst: jest.fn(),
      },
      users: {
        findFirst: jest.fn(),
      },
      teamMembers: {
        findFirst: jest.fn(),
      },
      teamSubscriptionPlans: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      subscriptions: {
        findFirst: jest.fn(),
      },
      teamUsageLimits: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      teamBillingContacts: {
        findMany: jest.fn(),
      },
    },
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn().mockResolvedValue([{ id: 1 }]),
      })),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          groupBy: jest.fn().mockResolvedValue([]),
        })),
      })),
    })),
  },
}));

// Mock Stripe
jest.mock('../../../services/stripe.service', () => ({
  stripe: null,
  isDevelopment: true,
}));

describe('Team Billing Service', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('initializeTeamPlans', () => {
    it('should create mock plans in development mode', async () => {
      // Mock existing plans check
      (db.query.teamSubscriptionPlans.findMany as jest.Mock).mockResolvedValue([]);

      await teamBillingService.initializeTeamPlans();

      // Verify plans were created
      expect(db.insert).toHaveBeenCalledWith(teamSubscriptionPlans);
      expect(db.insert).toHaveBeenCalledTimes(3); // 3 default plans
    });

    it('should skip initialization if plans already exist', async () => {
      // Mock existing plans
      (db.query.teamSubscriptionPlans.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);

      await teamBillingService.initializeTeamPlans();

      // Verify no plans were created
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('createTeamSubscription', () => {
    const mockParams: CreateTeamSubscriptionParams = {
      teamId: 1,
      planId: 1,
      paymentMethodId: 'pm_test',
      userId: 1,
    };

    beforeEach(() => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        ownerId: 1,
      });

      // Mock user
      (db.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
      });

      // Mock plan
      (db.query.teamSubscriptionPlans.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Team Starter',
        priceInCents: 4900,
        interval: 'month',
        maxMembers: 3,
        articleLimit: 100,
        keywordReportLimit: 50,
      });

      // Mock no existing subscription
      (db.query.subscriptions.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it('should create a team subscription in development mode', async () => {
      const result = await teamBillingService.createTeamSubscription(mockParams);

      // Verify subscription was created
      expect(db.insert).toHaveBeenCalledWith(subscriptions);
      expect(db.insert).toHaveBeenCalledWith(teamBillingContacts);
      expect(result).toHaveProperty('subscriptionId');
      expect(result).toHaveProperty('clientSecret');
    });

    it('should throw error if team not found', async () => {
      // Mock team not found
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamBillingService.createTeamSubscription(mockParams))
        .rejects.toThrow('Team not found');
    });

    it('should throw error if user is not team owner', async () => {
      // Mock team with different owner
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        ownerId: 2, // Different from userId in params
      });

      await expect(teamBillingService.createTeamSubscription(mockParams))
        .rejects.toThrow('Only the team owner can create a subscription');
    });

    it('should throw error if team already has subscription', async () => {
      // Mock existing subscription
      (db.query.subscriptions.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        status: 'active',
      });

      await expect(teamBillingService.createTeamSubscription(mockParams))
        .rejects.toThrow('Team already has an active subscription');
    });
  });

  describe('trackUsage', () => {
    const mockParams: TeamUsageParams = {
      teamId: 1,
      userId: 1,
      resourceType: 'article',
      quantity: 1,
    };

    beforeEach(() => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
      });

      // Mock team membership
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        teamId: 1,
        userId: 1,
        status: 'active',
      });

      // Mock no usage limit
      (db.query.teamUsageLimits.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it('should track team resource usage', async () => {
      await teamBillingService.trackUsage(mockParams);

      // Verify usage was recorded
      expect(db.insert).toHaveBeenCalledWith(teamUsageRecords);
    });

    it('should throw error if team not found', async () => {
      // Mock team not found
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamBillingService.trackUsage(mockParams))
        .rejects.toThrow('Team not found');
    });

    it('should throw error if user is not a team member', async () => {
      // Mock user not a team member
      (db.query.teamMembers.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamBillingService.trackUsage(mockParams))
        .rejects.toThrow('User is not a member of this team');
    });

    it('should check usage limits before tracking', async () => {
      // Mock usage limit
      (db.query.teamUsageLimits.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        teamId: 1,
        resourceType: 'article',
        limitValue: 100,
        period: 'monthly',
      });

      // Mock current usage
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([{ total: 50 }]),
        }),
      });

      await teamBillingService.trackUsage(mockParams);

      // Verify usage was recorded
      expect(db.insert).toHaveBeenCalledWith(teamUsageRecords);
    });

    it('should throw error if usage limit exceeded', async () => {
      // Mock usage limit
      (db.query.teamUsageLimits.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        teamId: 1,
        resourceType: 'article',
        limitValue: 100,
        period: 'monthly',
      });

      // Mock current usage at limit
      (db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([{ total: 100 }]),
        }),
      });

      await expect(teamBillingService.trackUsage(mockParams))
        .rejects.toThrow('Team has reached the article usage limit for this monthly period');
    });
  });

  describe('getTeamSubscription', () => {
    beforeEach(() => {
      // Mock team
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Test Team',
      });

      // Mock subscription
      (db.query.subscriptions.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        status: 'active',
        plan: {
          id: 1,
          name: 'Team Starter',
        },
      });

      // Mock billing contacts
      (db.query.teamBillingContacts.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          userId: 1,
          isPrimary: true,
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      ]);

      // Mock usage limits
      (db.query.teamUsageLimits.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          resourceType: 'article',
          limitValue: 100,
          period: 'monthly',
        },
      ]);
    });

    it('should return team subscription details', async () => {
      const result = await teamBillingService.getTeamSubscription(1);

      expect(result).toHaveProperty('subscription');
      expect(result).toHaveProperty('billingContacts');
      expect(result).toHaveProperty('usageLimits');
    });

    it('should return null if team has no subscription', async () => {
      // Mock no subscription
      (db.query.subscriptions.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await teamBillingService.getTeamSubscription(1);

      expect(result).toBeNull();
    });

    it('should throw error if team not found', async () => {
      // Mock team not found
      (db.query.teams.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(teamBillingService.getTeamSubscription(1))
        .rejects.toThrow('Team not found');
    });
  });
});
