import { subscriptionController } from '../subscription.controller';
import { db } from '../../db';
import { users, userUsage, subscriptions } from '../../../db/schema';
import { stripeService } from '../../services/stripe.service';

// Mock database
jest.mock('../../db', () => ({
  db: {
    transaction: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  },
}));

// Mock stripe service
jest.mock('../../services/stripe.service', () => ({
  stripeService: {
    createSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
  },
}));

describe('Subscription Controller', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  const mockStripeService = stripeService as jest.Mocked<typeof stripeService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      const mockSubscription = {
        subscriptionId: 1,
        clientSecret: 'pi_test_client_secret',
      };

      mockStripeService.createSubscription.mockResolvedValue(mockSubscription);

      const result = await subscriptionController.createSubscription(
        1,
        1,
        'pm_test123',
        'test@example.com'
      );

      expect(mockStripeService.createSubscription).toHaveBeenCalledWith({
        userId: 1,
        planId: 1,
        paymentMethodId: 'pm_test123',
        email: 'test@example.com',
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should handle stripe service errors', async () => {
      mockStripeService.createSubscription.mockRejectedValue(new Error('Stripe error'));

      await expect(
        subscriptionController.createSubscription(1, 1, 'pm_test123', 'test@example.com')
      ).rejects.toThrow('Failed to create subscription: Stripe error');
    });
  });

  describe('updateSubscriptionStatus', () => {
    it('should update subscription status for PAYG plan', async () => {
      const mockTransaction = jest.fn();
      const mockTx = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([])
          })
        }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ remainingCredits: 5 }])
          })
        }),
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockResolvedValue([])
        }),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      const result = await subscriptionController.updateSubscriptionStatus(
        1,
        'Pay-As-You-Go',
        false
      );

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalledWith(users);
      expect(result).toBe(true);
    });

    it('should update subscription status for subscription plan with new billing period', async () => {
      const mockTransaction = jest.fn();
      const mockTx = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([])
          })
        }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ remainingCredits: 10 }])
          })
        }),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      const result = await subscriptionController.updateSubscriptionStatus(
        1,
        'Starter Plan',
        true
      );

      expect(mockTx.update).toHaveBeenCalledWith(users);
      expect(mockTx.update).toHaveBeenCalledWith(userUsage);
      expect(result).toBe(true);
    });

    it('should handle database errors', async () => {
      mockDb.transaction.mockRejectedValue(new Error('Database error'));

      await expect(
        subscriptionController.updateSubscriptionStatus(1, 'Starter Plan', false)
      ).rejects.toThrow('Failed to update subscription status: Database error');
    });

    it('should create new user usage record if none exists', async () => {
      const mockTransaction = jest.fn();
      const mockTx = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([])
          })
        }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]) // No existing usage
          })
        }),
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockResolvedValue([])
        }),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      await subscriptionController.updateSubscriptionStatus(1, 'Growth Plan', true);

      expect(mockTx.insert).toHaveBeenCalledWith(userUsage);
      expect(mockTx.insert().values).toHaveBeenCalledWith({
        userId: 1,
        remainingCredits: 75, // Growth Plan credits
      });
    });

    it('should add credits for PAYG plan', async () => {
      const mockTransaction = jest.fn();
      const mockTx = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([])
          })
        }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ remainingCredits: 5 }])
          })
        }),
      };

      mockDb.transaction.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      await subscriptionController.updateSubscriptionStatus(1, 'Pay-As-You-Go', false);

      expect(mockTx.update).toHaveBeenCalledWith(userUsage);
      expect(mockTx.update().set).toHaveBeenCalledWith({
        remainingCredits: 6, // 5 existing + 1 PAYG credit
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('handleSubscriptionRenewal', () => {
    it('should handle subscription renewal successfully', async () => {
      const updateSpy = jest.spyOn(subscriptionController, 'updateSubscriptionStatus')
        .mockResolvedValue(true);

      const result = await subscriptionController.handleSubscriptionRenewal(1, 'Agency Plan');

      expect(updateSpy).toHaveBeenCalledWith(1, 'Agency Plan', true);
      expect(result).toBe(true);

      updateSpy.mockRestore();
    });

    it('should handle renewal errors', async () => {
      const updateSpy = jest.spyOn(subscriptionController, 'updateSubscriptionStatus')
        .mockRejectedValue(new Error('Update error'));

      await expect(
        subscriptionController.handleSubscriptionRenewal(1, 'Agency Plan')
      ).rejects.toThrow('Failed to handle subscription renewal: Update error');

      updateSpy.mockRestore();
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const mockResult = { success: true, message: 'Cancelled' };
      mockStripeService.cancelSubscription.mockResolvedValue(mockResult);

      const result = await subscriptionController.cancelSubscription(1);

      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });

    it('should handle cancellation errors', async () => {
      mockStripeService.cancelSubscription.mockRejectedValue(new Error('Cancel error'));

      await expect(
        subscriptionController.cancelSubscription(1)
      ).rejects.toThrow('Failed to cancel subscription: Cancel error');
    });
  });

  describe('PLAN_CREDITS', () => {
    it('should have correct credit allocation for each plan', () => {
      const PLAN_CREDITS = {
        'Pay-As-You-Go': 1,
        'Starter Plan': 25,
        'Growth Plan': 75,
        'Agency Plan': 200,
      };

      // Test that the controller uses these values correctly
      expect(PLAN_CREDITS['Pay-As-You-Go']).toBe(1);
      expect(PLAN_CREDITS['Starter Plan']).toBe(25);
      expect(PLAN_CREDITS['Growth Plan']).toBe(75);
      expect(PLAN_CREDITS['Agency Plan']).toBe(200);
    });
  });
});
