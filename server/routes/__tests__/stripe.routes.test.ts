import request from 'supertest';
import express from 'express';
import stripeRoutes from '../stripe.routes';
import { stripeService } from '../../services/stripe.service';
import { db } from '../../db';

// Mock the stripe service
jest.mock('../../services/stripe.service', () => ({
  stripeService: {
    createSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    createPaygPaymentIntent: jest.fn(),
    handleWebhookEvent: jest.fn(),
  },
}));

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../middlewares/authMiddleware', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  },
}));

// Mock Stripe webhook verification
jest.mock('stripe', () => ({
  webhooks: {
    constructEvent: jest.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));
app.use('/api/stripe', stripeRoutes);

describe('Stripe Routes', () => {
  const mockStripeService = stripeService as jest.Mocked<typeof stripeService>;
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/stripe/plans', () => {
    it('should get subscription plans successfully', async () => {
      const mockPlans = [
        {
          id: 1,
          name: 'Starter Plan',
          description: 'Perfect for small teams',
          priceInCents: 2500,
          interval: 'month',
          features: ['25 articles', '10 keyword reports'],
          isActive: true
        }
      ];

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockPlans)
        })
      });

      const response = await request(app)
        .get('/api/stripe/plans');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        plans: mockPlans
      });
    });

    it('should handle database errors', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      const response = await request(app)
        .get('/api/stripe/plans');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        ok: false,
        message: 'Database error'
      });
    });
  });

  describe('POST /api/stripe/subscribe', () => {
    it('should create subscription successfully', async () => {
      const mockSubscription = {
        subscriptionId: 1,
        clientSecret: 'pi_test_client_secret'
      };

      mockStripeService.createSubscription.mockResolvedValue(mockSubscription);

      const response = await request(app)
        .post('/api/stripe/subscribe')
        .send({
          planId: 1,
          paymentMethodId: 'pm_test123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        subscription: mockSubscription
      });
      expect(mockStripeService.createSubscription).toHaveBeenCalledWith({
        userId: 1,
        planId: 1,
        paymentMethodId: 'pm_test123',
        email: 'test@example.com'
      });
    });

    it('should return 400 when planId is missing', async () => {
      const response = await request(app)
        .post('/api/stripe/subscribe')
        .send({
          paymentMethodId: 'pm_test123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        ok: false,
        message: 'Missing required fields: planId and paymentMethodId are required'
      });
    });

    it('should return 400 when paymentMethodId is missing', async () => {
      const response = await request(app)
        .post('/api/stripe/subscribe')
        .send({
          planId: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        ok: false,
        message: 'Missing required fields: planId and paymentMethodId are required'
      });
    });

    it('should handle stripe service errors', async () => {
      mockStripeService.createSubscription.mockRejectedValue(new Error('Stripe error'));

      const response = await request(app)
        .post('/api/stripe/subscribe')
        .send({
          planId: 1,
          paymentMethodId: 'pm_test123'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        ok: false,
        message: 'Stripe error'
      });
    });
  });

  describe('POST /api/stripe/cancel-subscription', () => {
    it('should cancel subscription successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Subscription cancelled successfully'
      };

      mockStripeService.cancelSubscription.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/stripe/cancel-subscription')
        .send({
          subscriptionId: 1
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        result: mockResult
      });
      expect(mockStripeService.cancelSubscription).toHaveBeenCalledWith(1);
    });

    it('should return 400 when subscriptionId is missing', async () => {
      const response = await request(app)
        .post('/api/stripe/cancel-subscription')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        ok: false,
        message: 'Subscription ID is required'
      });
    });

    it('should handle stripe service errors', async () => {
      mockStripeService.cancelSubscription.mockRejectedValue(new Error('Cancel error'));

      const response = await request(app)
        .post('/api/stripe/cancel-subscription')
        .send({
          subscriptionId: 1
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        ok: false,
        message: 'Cancel error'
      });
    });
  });

  describe('POST /api/stripe/create-payg-payment', () => {
    it('should create PAYG payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test_client_secret'
      };

      mockStripeService.createPaygPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/api/stripe/create-payg-payment');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        paymentIntent: mockPaymentIntent
      });
      expect(mockStripeService.createPaygPaymentIntent).toHaveBeenCalledWith(1, 'test@example.com');
    });

    it('should handle stripe service errors', async () => {
      mockStripeService.createPaygPaymentIntent.mockRejectedValue(new Error('Payment error'));

      const response = await request(app)
        .post('/api/stripe/create-payg-payment');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        ok: false,
        message: 'Payment error'
      });
    });
  });

  describe('POST /api/stripe/webhook', () => {
    it('should handle webhook successfully', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test123' } }
      };

      // Mock Stripe webhook verification
      const Stripe = require('stripe');
      Stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      mockStripeService.handleWebhookEvent.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(mockEvent));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
      expect(mockStripeService.handleWebhookEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should return 400 when signature is missing', async () => {
      const response = await request(app)
        .post('/api/stripe/webhook')
        .send(JSON.stringify({ type: 'test' }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Missing stripe-signature header'
      });
    });

    it('should handle webhook verification errors', async () => {
      const Stripe = require('stripe');
      Stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(JSON.stringify({ type: 'test' }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Webhook signature verification failed'
      });
    });

    it('should handle webhook processing errors', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test123' } }
      };

      const Stripe = require('stripe');
      Stripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      mockStripeService.handleWebhookEvent.mockRejectedValue(new Error('Processing error'));

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send(JSON.stringify(mockEvent));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'Webhook processing failed'
      });
    });
  });

  describe('GET /api/stripe/subscription-status', () => {
    it('should get subscription status successfully', async () => {
      const mockSubscription = {
        id: 1,
        status: 'active',
        planName: 'Starter Plan',
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false
      };

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([mockSubscription])
              })
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/stripe/subscription-status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        subscription: mockSubscription
      });
    });

    it('should return null when no subscription found', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([])
              })
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/stripe/subscription-status');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        subscription: null
      });
    });
  });
});
