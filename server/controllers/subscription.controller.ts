import { db } from '@db';
import { subscriptions, users, userUsage } from '@db/schema';
import { eq } from 'drizzle-orm';
import { stripeService } from '../services/stripe.service';

// Credit allocation per plan
const PLAN_CREDITS = {
  'Pay-As-You-Go': 1,
  'Starter Plan': 25,
  'Growth Plan': 75,
  'Agency Plan': 200,
};

export const subscriptionController = {
  /**
   * Create a new subscription
   */
  async createSubscription(userId: number, planId: number, paymentMethodId: string, email: string) {
    try {
      const subscription = await stripeService.createSubscription({
        userId,
        planId,
        paymentMethodId,
        email,
      });

      return subscription;
    } catch (error: any) {
      console.error('[Subscription] Create subscription error:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  },

  /**
   * Update user's subscription tier and credits
   */
  async updateSubscriptionStatus(userId: number, planName: string, isNewBillingPeriod: boolean = false) {
    try {
      // Get credits for the plan
      const credits = PLAN_CREDITS[planName as keyof typeof PLAN_CREDITS] || 0;

      // Begin transaction
      await db.transaction(async (tx) => {
        // Update user's subscription tier
        await tx
          .update(users)
          .set({
            subscriptionTier: planName,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        // If it's a new billing period or PAYG, update credits
        if (isNewBillingPeriod || planName === 'Pay-As-You-Go') {
          // For PAYG, add credits to existing
          // For subscription plans, reset and set new credit amount
          const [existingUsage] = await tx
            .select()
            .from(userUsage)
            .where(eq(userUsage.userId, userId));

          const currentCredits = planName === 'Pay-As-You-Go' 
            ? (existingUsage?.remainingCredits || 0) + credits
            : credits;

          if (existingUsage) {
            await tx
              .update(userUsage)
              .set({
                remainingCredits: currentCredits,
                updatedAt: new Date(),
              })
              .where(eq(userUsage.userId, userId));
          } else {
            await tx
              .insert(userUsage)
              .values({
                userId,
                remainingCredits: currentCredits,
              });
          }
        }
      });

      return true;
    } catch (error: any) {
      console.error('[Subscription] Update subscription status error:', error);
      throw new Error(`Failed to update subscription status: ${error.message}`);
    }
  },

  /**
   * Handle subscription renewal
   */
  async handleSubscriptionRenewal(userId: number, planName: string) {
    try {
      // Update subscription status with new billing period
      await this.updateSubscriptionStatus(userId, planName, true);

      return true;
    } catch (error: any) {
      console.error('[Subscription] Subscription renewal error:', error);
      throw new Error(`Failed to handle subscription renewal: ${error.message}`);
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: number) {
    try {
      return await stripeService.cancelSubscription(subscriptionId);
    } catch (error: any) {
      console.error('[Subscription] Cancel subscription error:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  },
}; 