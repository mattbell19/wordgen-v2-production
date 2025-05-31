import { db } from '@db';
import { subscriptions, users, userUsage } from '@db/schema';
import { eq } from 'drizzle-orm';
import { stripeService } from './stripe.service';
import { sendEmail } from './email';
import type { Stripe } from 'stripe';

interface ErrorNotification {
  userId: number;
  userEmail: string;
  type: 'payment_failed' | 'subscription_canceled' | 'credit_limit' | 'plan_change';
  details: any;
}

interface UserSubscriptionData {
  id: number;
  email: string;
  stripeSubscriptionId: string;
  status: string;
}

class ErrorHandlerService {
  private async getUserSubscriptionData(subscriptionId: string): Promise<UserSubscriptionData | null> {
    try {
      const [data] = await db
        .select({
          id: users.id,
          email: users.email,
          stripeSubscriptionId: subscriptions.stripeSubscriptionId,
          status: subscriptions.status,
        })
        .from(subscriptions)
        .innerJoin(users, eq(users.id, subscriptions.userId))
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      return data || null;
    } catch (error) {
      console.error('Error fetching user subscription data:', error);
      return null;
    }
  }

  async handlePaymentFailed(subscriptionId: string, invoice: Stripe.Invoice) {
    try {
      // Get user and subscription details
      const userData = await this.getUserSubscriptionData(subscriptionId);
      if (!userData) {
        console.error('User not found for failed payment:', subscriptionId);
        return;
      }

      // Send email notification
      await sendEmail({
        to: userData.email,
        subject: 'Payment Failed - Action Required',
        template: 'payment-failed',
        data: {
          amount: invoice.amount_due / 100,
          dueDate: new Date(invoice.due_date * 1000).toLocaleDateString(),
          paymentLink: `${process.env.FRONTEND_URL}/billing?invoice=${invoice.id}`,
        },
      });

      // Update subscription status
      await db
        .update(subscriptions)
        .set({
          status: 'past_due',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      // Log the error
      console.error('Payment failed:', {
        subscriptionId,
        userId: userData.id,
        amount: invoice.amount_due,
        attemptCount: invoice.attempt_count,
      });
    } catch (error) {
      console.error('Error handling failed payment:', error);
    }
  }

  async handleSubscriptionCanceled(subscriptionId: string) {
    try {
      // Get user and subscription details
      const userData = await this.getUserSubscriptionData(subscriptionId);
      if (!userData) {
        console.error('User not found for canceled subscription:', subscriptionId);
        return;
      }

      // Get subscription details from Stripe
      const stripeSubscription = await stripeService.stripe.subscriptions.retrieve(
        subscriptionId,
        {} as Stripe.SubscriptionRetrieveParams,
        {} as Stripe.RequestOptions
      );

      // Send email notification
      await sendEmail({
        to: userData.email,
        subject: 'Subscription Canceled',
        template: 'subscription-canceled',
        data: {
          endDate: new Date(stripeSubscription.current_period_end * 1000).toLocaleDateString(),
          reactivateLink: `${process.env.FRONTEND_URL}/billing`,
        },
      });

      // Update subscription status
      await db
        .update(subscriptions)
        .set({
          status: 'canceled',
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      // Log the cancellation
      console.log('Subscription canceled:', {
        subscriptionId,
        userId: userData.id,
        endDate: new Date(stripeSubscription.current_period_end * 1000),
      });
    } catch (error) {
      console.error('Error handling subscription cancellation:', error);
    }
  }

  async handleCreditLimitReached(userId: number, userEmail: string) {
    try {
      // Send email notification
      await sendEmail({
        to: userEmail,
        subject: 'Credit Limit Reached',
        template: 'credit-limit',
        data: {
          upgradeLink: `${process.env.FRONTEND_URL}/billing?upgrade=true`,
        },
      });

      // Get current usage
      const [usage] = await db
        .select()
        .from(userUsage)
        .where(eq(userUsage.userId, userId));

      // Log the event
      console.log('Credit limit reached:', {
        userId,
        currentUsage: usage?.creditsUsed || 0,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling credit limit:', error);
    }
  }

  async handlePlanTransition(oldSubscriptionId: string, newSubscriptionId: string) {
    try {
      // Get user and subscription details
      const userData = await this.getUserSubscriptionData(oldSubscriptionId);
      if (!userData) {
        console.error('User not found for plan transition:', oldSubscriptionId);
        return;
      }

      // Get subscription details from Stripe
      const [oldStripeSubscription, newStripeSubscription] = await Promise.all([
        stripeService.stripe.subscriptions.retrieve(
          oldSubscriptionId,
          { expand: ['items.data.price'] } as Stripe.SubscriptionRetrieveParams,
          {} as Stripe.RequestOptions
        ),
        stripe.subscriptions.retrieve(
          newSubscriptionId,
          { expand: ['items.data.price'] } as Stripe.SubscriptionRetrieveParams,
          {} as Stripe.RequestOptions
        ),
      ]);

      const isUpgrade = 
        (newStripeSubscription.items.data[0].price.unit_amount || 0) > 
        (oldStripeSubscription.items.data[0].price.unit_amount || 0);

      // Send email notification
      await sendEmail({
        to: userData.email,
        subject: isUpgrade ? 'Subscription Upgraded' : 'Subscription Downgraded',
        template: isUpgrade ? 'plan-upgraded' : 'plan-downgraded',
        data: {
          oldPlan: oldStripeSubscription.items.data[0].price.nickname,
          newPlan: newStripeSubscription.items.data[0].price.nickname,
          effectiveDate: isUpgrade 
            ? 'immediately'
            : new Date(oldStripeSubscription.current_period_end * 1000).toLocaleDateString(),
          manageLink: `${process.env.FRONTEND_URL}/billing`,
        },
      });

      // Update subscription in database
      await db
        .update(subscriptions)
        .set({
          stripeSubscriptionId: newSubscriptionId,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, oldSubscriptionId));

      // Log the transition
      console.log('Plan transition:', {
        userId: userData.id,
        oldPlan: oldStripeSubscription.items.data[0].price.nickname,
        newPlan: newStripeSubscription.items.data[0].price.nickname,
        isUpgrade,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error handling plan transition:', error);
    }
  }

  async notifyUser({ userId, userEmail, type, details }: ErrorNotification) {
    try {
      let template: string;
      let subject: string;
      let data: any = {};

      switch (type) {
        case 'payment_failed':
          template = 'payment-failed';
          subject = 'Payment Failed - Action Required';
          data = {
            amount: details.amount,
            dueDate: details.dueDate,
            paymentLink: `${process.env.FRONTEND_URL}/billing`,
          };
          break;

        case 'subscription_canceled':
          template = 'subscription-canceled';
          subject = 'Subscription Canceled';
          data = {
            endDate: details.endDate,
            reactivateLink: `${process.env.FRONTEND_URL}/billing`,
          };
          break;

        case 'credit_limit':
          template = 'credit-limit';
          subject = 'Credit Limit Reached';
          data = {
            upgradeLink: `${process.env.FRONTEND_URL}/billing?upgrade=true`,
          };
          break;

        case 'plan_change':
          template = details.isUpgrade ? 'plan-upgraded' : 'plan-downgraded';
          subject = details.isUpgrade ? 'Subscription Upgraded' : 'Subscription Downgraded';
          data = {
            oldPlan: details.oldPlan,
            newPlan: details.newPlan,
            effectiveDate: details.effectiveDate,
            manageLink: `${process.env.FRONTEND_URL}/billing`,
          };
          break;
      }

      await sendEmail({
        to: userEmail,
        subject,
        template,
        data,
      });

      // Log notification
      console.log('User notification sent:', {
        userId,
        type,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error sending user notification:', error);
    }
  }
}

export const errorHandler = new ErrorHandlerService(); 