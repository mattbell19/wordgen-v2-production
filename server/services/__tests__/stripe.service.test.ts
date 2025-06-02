import Stripe from 'stripe';
import { stripeService } from '../stripe.service';
import { db } from '../../db';

// Mock Stripe
jest.mock('stripe');
const MockedStripe = Stripe as jest.MockedClass<typeof Stripe>;

// Mock database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock schema
jest.mock('../../../db/schema', () => ({
  subscriptionPlans: 'subscription_plans_table',
  subscriptions: 'subscriptions_table',
}));

// Mock subscription controller
jest.mock('../../controllers/subscription.controller', () => ({
  subscriptionController: {
    updateSubscriptionStatus: jest.fn(),
  },
}));

const originalEnv = process.env;

describe('Stripe Service', () => {
  let mockStripe: jest.Mocked<Stripe>;
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Create mock Stripe instance
    mockStripe = {
      products: {
        create: jest.fn(),
      },
      prices: {
        create: jest.fn(),
      },
      customers: {
        create: jest.fn(),
        update: jest.fn(),
      },
      paymentMethods: {
        attach: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
      },
      paymentIntents: {
        create: jest.fn(),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    } as any;

    MockedStripe.mockImplementation(() => mockStripe);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createCustomer', () => {
    it('should return mock customer in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const result = await stripeService.createCustomer('test@example.com', 'Test User');

      expect(result.id).toMatch(/^mock_customer_\d+$/);
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });

    it('should create customer in production mode', async () => {
      process.env.NODE_ENV = 'production';
      
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer as any);

      const result = await stripeService.createCustomer('test@example.com', 'Test User');

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should handle Stripe errors', async () => {
      process.env.NODE_ENV = 'production';
      
      mockStripe.customers.create.mockRejectedValue(new Error('Stripe error'));

      await expect(
        stripeService.createCustomer('test@example.com')
      ).rejects.toThrow('Failed to create customer: Stripe error');
    });

    it('should throw error when Stripe is not configured in production', async () => {
      process.env.NODE_ENV = 'production';
      
      // Mock stripe as null
      jest.doMock('../stripe.service', () => ({
        stripe: null,
        stripeService: {
          createCustomer: async () => {
            throw new Error('Stripe must be configured in production');
          }
        }
      }));

      await expect(
        stripeService.createCustomer('test@example.com')
      ).rejects.toThrow('Stripe must be configured in production');
    });
  });

  describe('createSubscription', () => {
    const mockSubscriptionParams = {
      userId: 1,
      planId: 1,
      paymentMethodId: 'pm_test123',
      email: 'test@example.com',
    };

    it('should create mock subscription in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const mockPlan = {
        id: 1,
        name: 'Starter Plan',
        stripePriceId: 'price_test123',
      };

      const mockSubscription = {
        id: 1,
        userId: 1,
        planId: 1,
        status: 'active',
        stripeSubscriptionId: 'mock_sub_123',
        stripeCustomerId: 'mock_customer_123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        articlesUsed: 0,
        cancelAtPeriodEnd: false,
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockPlan])
        })
      });

      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockSubscription])
        })
      });

      const result = await stripeService.createSubscription(mockSubscriptionParams);

      expect(result.subscriptionId).toBe(1);
      expect(result.clientSecret).toBe('mock_client_secret');
      expect(mockStripe.subscriptions.create).not.toHaveBeenCalled();
    });

    it('should create real subscription in production mode', async () => {
      process.env.NODE_ENV = 'production';

      const mockPlan = {
        id: 1,
        name: 'Starter Plan',
        stripePriceId: 'price_test123',
      };

      const mockCustomer = {
        id: 'cus_test123',
      };

      const mockStripeSubscription = {
        id: 'sub_test123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        latest_invoice: {
          payment_intent: {
            client_secret: 'pi_test_client_secret',
          },
        },
      };

      const mockDbSubscription = {
        id: 1,
        userId: 1,
        planId: 1,
        status: 'active',
        stripeSubscriptionId: 'sub_test123',
        stripeCustomerId: 'cus_test123',
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockPlan])
        })
      });

      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockDbSubscription])
        })
      });

      mockStripe.customers.create.mockResolvedValue(mockCustomer as any);
      mockStripe.paymentMethods.attach.mockResolvedValue({} as any);
      mockStripe.customers.update.mockResolvedValue({} as any);
      mockStripe.subscriptions.create.mockResolvedValue(mockStripeSubscription as any);

      const result = await stripeService.createSubscription(mockSubscriptionParams);

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: undefined,
      });
      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_test123', {
        customer: 'cus_test123',
      });
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        items: [{ price: 'price_test123' }],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });
      expect(result.subscriptionId).toBe(1);
      expect(result.clientSecret).toBe('pi_test_client_secret');
    });

    it('should throw error when plan is not found', async () => {
      process.env.NODE_ENV = 'development';

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      await expect(
        stripeService.createSubscription(mockSubscriptionParams)
      ).rejects.toThrow('Subscription plan not found');
    });
  });

  describe('cancelSubscription', () => {
    it('should return mock result in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const result = await stripeService.cancelSubscription(1);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscription cancelled successfully (development mode)');
    });

    it('should cancel subscription in production mode', async () => {
      process.env.NODE_ENV = 'production';

      const mockSubscription = {
        id: 1,
        stripeSubscriptionId: 'sub_test123',
      };

      const mockCancelledSubscription = {
        id: 'sub_test123',
        status: 'canceled',
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockSubscription])
        })
      });

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      mockStripe.subscriptions.update.mockResolvedValue(mockCancelledSubscription as any);

      const result = await stripeService.cancelSubscription(1);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test123', {
        cancel_at_period_end: true,
      });
      expect(result.success).toBe(true);
    });

    it('should throw error when subscription is not found', async () => {
      process.env.NODE_ENV = 'production';

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      await expect(
        stripeService.cancelSubscription(1)
      ).rejects.toThrow('Subscription not found');
    });
  });

  describe('createPaygPaymentIntent', () => {
    it('should create payment intent for PAYG plan', async () => {
      process.env.NODE_ENV = 'production';

      const mockPlan = {
        id: 1,
        name: 'Pay-As-You-Go',
        priceInCents: 500,
      };

      const mockCustomer = {
        id: 'cus_test123',
      };

      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test_client_secret',
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockPlan])
        })
      });

      // Mock getOrCreateCustomer method
      jest.spyOn(stripeService, 'getOrCreateCustomer').mockResolvedValue(mockCustomer as any);
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any);

      const result = await stripeService.createPaygPaymentIntent(1, 'test@example.com');

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 500,
        currency: 'gbp',
        customer: 'cus_test123',
        metadata: {
          type: 'payg',
          userId: '1',
          planId: '1'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
      expect(result.client_secret).toBe('pi_test_client_secret');
    });

    it('should throw error when PAYG plan is not found', async () => {
      process.env.NODE_ENV = 'production';

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      await expect(
        stripeService.createPaygPaymentIntent(1, 'test@example.com')
      ).rejects.toThrow('PAYG plan not found');
    });
  });

  describe('handleWebhookEvent', () => {
    it('should handle payment_intent.succeeded event for PAYG', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            metadata: {
              type: 'payg',
              userId: '1',
            },
          },
        },
      } as Stripe.Event;

      const subscriptionController = require('../../controllers/subscription.controller').subscriptionController;
      subscriptionController.updateSubscriptionStatus.mockResolvedValue(true);

      await stripeService.handleWebhookEvent(mockEvent);

      expect(subscriptionController.updateSubscriptionStatus).toHaveBeenCalledWith(1, 'Pay-As-You-Go');
    });

    it('should handle customer.subscription.created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
            metadata: {
              userId: '1',
              planName: 'Starter Plan',
            },
          },
        },
      } as Stripe.Event;

      const subscriptionController = require('../../controllers/subscription.controller').subscriptionController;
      subscriptionController.updateSubscriptionStatus.mockResolvedValue(true);

      await stripeService.handleWebhookEvent(mockEvent);

      expect(subscriptionController.updateSubscriptionStatus).toHaveBeenCalledWith(1, 'Starter Plan');
    });

    it('should handle invoice.payment_succeeded event for subscription renewal', async () => {
      const mockEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test123',
            subscription: 'sub_test123',
            billing_reason: 'subscription_cycle',
            metadata: {
              userId: '1',
              planName: 'Growth Plan',
            },
          },
        },
      } as Stripe.Event;

      const subscriptionController = require('../../controllers/subscription.controller').subscriptionController;
      subscriptionController.handleSubscriptionRenewal.mockResolvedValue(true);

      await stripeService.handleWebhookEvent(mockEvent);

      expect(subscriptionController.handleSubscriptionRenewal).toHaveBeenCalledWith(1, 'Growth Plan');
    });

    it('should handle customer.subscription.deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test123',
            metadata: {
              userId: '1',
            },
          },
        },
      } as Stripe.Event;

      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      await stripeService.handleWebhookEvent(mockEvent);

      expect(mockDb.update).toHaveBeenCalledWith('subscriptions_table');
    });

    it('should log unhandled event types', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockEvent = {
        type: 'unknown.event.type',
        data: { object: {} },
      } as Stripe.Event;

      await stripeService.handleWebhookEvent(mockEvent);

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled event type: unknown.event.type');

      consoleSpy.mockRestore();
    });

    it('should handle webhook errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            metadata: {
              type: 'payg',
              userId: 'invalid',
            },
          },
        },
      } as Stripe.Event;

      const subscriptionController = require('../../controllers/subscription.controller').subscriptionController;
      subscriptionController.updateSubscriptionStatus.mockRejectedValue(new Error('Database error'));

      await stripeService.handleWebhookEvent(mockEvent);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Stripe] Webhook handling error:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getOrCreateCustomer', () => {
    it('should create new customer when not found', async () => {
      process.env.NODE_ENV = 'production';

      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer as any);

      const result = await stripeService.getOrCreateCustomer('test@example.com');

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result).toEqual(mockCustomer);
    });
  });
});
