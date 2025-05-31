import express from 'express';
import { db } from '@db';
import { subscriptionPlans, subscriptions } from '@db/schema';
import { stripeService } from '../services/stripe.service';
import { eq, and, sql } from 'drizzle-orm';
import { User } from '../types/auth';
import { handleWebhook } from '../webhookHandler';
import { requireAuth } from '../auth';
import { stripe } from '../services/stripe';

const router = express.Router();

// Special raw body parser just for the webhook endpoint
router.use('/webhook', express.raw({ type: 'application/json' }));

interface AuthenticatedRequest extends express.Request {
  user?: User;
}

// Webhook endpoint - no auth required
router.post('/webhook', handleWebhook);

// Get available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true));
    res.json({ ok: true, plans });
  } catch (error: any) {
    console.error('Failed to fetch subscription plans:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Error fetching subscription plans',
      details: error.message 
    });
  }
});

// Create a subscription - requires auth
router.post('/subscribe', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { planId, paymentMethodId } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({ 
        ok: false, 
        message: "Unauthorized",
        isAuthenticated: false 
      });
    }

    if (!planId || !paymentMethodId) {
      return res.status(400).json({ 
        ok: false, 
        message: "Missing required fields: planId and paymentMethodId are required" 
      });
    }

    const subscription = await stripeService.createSubscription({
      userId,
      planId,
      paymentMethodId,
      email: userEmail,
    });

    res.json({ ok: true, subscription });
  } catch (error: any) {
    console.error('Subscription error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Error creating subscription',
      details: error.message 
    });
  }
});

// Cancel a subscription - requires auth
router.post('/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { subscriptionId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        ok: false, 
        message: "Unauthorized",
        isAuthenticated: false 
      });
    }

    if (!subscriptionId) {
      return res.status(400).json({ 
        ok: false, 
        message: "Missing required field: subscriptionId" 
      });
    }

    const subscription = await db.query.subscriptions.findFirst({
      where: (subscriptions, { eq, and }) =>
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.userId, userId)
        )
    });

    if (!subscription) {
      return res.status(404).json({ 
        ok: false, 
        message: "Subscription not found" 
      });
    }

    await stripeService.cancelSubscription(subscriptionId);
    res.json({ 
      ok: true, 
      message: 'Subscription cancelled successfully' 
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Error canceling subscription',
      details: error.message 
    });
  }
});

// Create a PAYG payment intent - requires auth
router.post('/payg', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(401).json({ 
        ok: false, 
        message: "Unauthorized",
        isAuthenticated: false 
      });
    }

    const paymentIntent = await stripeService.createPaygPaymentIntent(userId, userEmail);

    res.json({ 
      ok: true, 
      clientSecret: paymentIntent.client_secret 
    });
  } catch (error: any) {
    console.error('PAYG payment error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Error creating PAYG payment',
      details: error.message 
    });
  }
});

// Get subscription status
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ 
        ok: false, 
        message: "Unauthorized",
        isAuthenticated: false 
      });
    }

    // Get active subscription
    const [subscription] = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(
        and(
          eq(subscriptions.userId, req.user.id),
          eq(subscriptions.status, 'active'),
          eq(subscriptions.cancelAtPeriodEnd, false)
        )
      );

    // Get usage info
    const [usage] = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, req.user.id));

    // Format response
    const status = {
      tier: subscription ? subscription.plan.name : 'Free',
      credits: {
        used: usage?.creditsUsed || 0,
        total: subscription?.subscription.articleLimit || 0,
        payg: usage?.paygCredits || 0
      },
      expiryDate: subscription?.subscription.currentPeriodEnd,
      isActive: !!subscription
    };

    res.json(status);
  } catch (error: any) {
    console.error('Subscription status error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Error fetching subscription status',
      details: error.message 
    });
  }
});

// Get payment history
router.get('/history', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ 
        ok: false, 
        message: "Unauthorized",
        isAuthenticated: false 
      });
    }

    // Get subscription payments
    const subscriptionPayments = await db
      .select({
        id: subscriptions.id,
        amount: subscriptionPlans.priceInCents,
        status: subscriptions.status,
        type: sql<'subscription'>`'subscription'::text`,
        createdAt: subscriptions.createdAt
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(eq(subscriptions.userId, req.user.id));

    // Get PAYG payments from Stripe
    const customer = await stripeService.getCustomer(req.user.id);
    let paygPayments: Array<{
      id: string;
      amount: number;
      status: string;
      type: 'payg';
      createdAt: string;
    }> = [];
    
    if (customer) {
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 100
      });

      paygPayments = paymentIntents.data
        .filter(pi => pi.metadata.type === 'payg')
        .map(pi => ({
          id: pi.id,
          amount: pi.amount,
          status: pi.status,
          type: 'payg' as const,
          createdAt: new Date(pi.created * 1000).toISOString()
        }));
    }

    // Combine and sort payments
    const allPayments = [...subscriptionPayments, ...paygPayments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(allPayments);
  } catch (error: any) {
    console.error('Payment history error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Error fetching payment history',
      details: error.message 
    });
  }
});

export default router;