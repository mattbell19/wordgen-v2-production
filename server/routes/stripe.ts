import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { stripeService } from '../services/stripe.service';
import { db } from '../db';
import { subscriptions, users, subscriptionPlans } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

export const stripeRouter = router({
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Get active subscription
    const [subscription] = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active'),
          eq(subscriptions.cancelAtPeriodEnd, false)
        )
      );

    // Get usage info from subscription
    const usage = subscription?.subscription;

    return {
      tier: subscription ? subscription.plan.name : 'Free',
      credits: {
        used: usage?.articleLimit || 0,
        total: subscription?.subscription.articleLimit || 0,
        payg: 0, // PAYG credits are not tracked in this version
      },
      expiryDate: subscription?.subscription.currentPeriodEnd,
      isActive: !!subscription,
    };
  }),

  changePlan: protectedProcedure
    .input(
      z.object({
        planName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Get current subscription
      const [currentSubscription] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, 'active')
          )
        );

      if (!currentSubscription) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active subscription found',
        });
      }

      // Get new plan details
      const [newPlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, input.planName));

      if (!newPlan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Selected plan not found',
        });
      }

      // Update subscription in Stripe
      await stripeService.updateSubscription(
        currentSubscription.stripeSubscriptionId,
        newPlan.stripePriceId
      );

      // Update subscription in database
      await db
        .update(subscriptions)
        .set({
          planId: newPlan.id,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, currentSubscription.id));

      return {
        success: true,
        message: 'Subscription updated successfully',
      };
    }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

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
      .where(eq(subscriptions.userId, userId));

    // Get PAYG payments from Stripe
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      );

    let paygPayments: Array<{
      id: string;
      amount: number;
      status: string;
      type: 'payg';
      createdAt: string;
    }> = [];
    
    if (subscription?.stripeCustomerId) {
      const paymentIntents = await stripe.paymentIntents.list({
        customer: subscription.stripeCustomerId,
        limit: 100
      });

      paygPayments = paymentIntents.data
        .filter((pi: Stripe.PaymentIntent) => pi.metadata.type === 'payg')
        .map((pi: Stripe.PaymentIntent) => ({
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

    return allPayments;
  }),
}); 