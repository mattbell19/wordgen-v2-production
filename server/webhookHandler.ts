import type { Request, Response } from "express";
import Stripe from "stripe";
import { stripeService } from "./services/stripe.service";
import { db } from "@db";
import { subscriptions, userUsage, paymentHistory } from "@db/schema";
import { eq } from "drizzle-orm";
import { errorHandler } from './services/error-handler.service';

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing required Stripe environment variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * Handles incoming Stripe webhook events
 * 
 * For local development:
 * 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 2. Run: stripe listen --forward-to localhost:5000/api/payments/webhook
 * 3. Use the provided webhook secret in your environment variables
 * 4. Test with: stripe trigger payment_intent.succeeded
 */
export async function handleWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'invoice.payment_failed':
        await errorHandler.handlePaymentFailed(
          event.data.object.subscription,
          event.data.object
        );
        break;

      case 'customer.subscription.deleted':
        await errorHandler.handleSubscriptionCanceled(event.data.object);
        break;

      case 'customer.subscription.updated':
        const oldSubscription = event.data.previous_attributes;
        const newSubscription = event.data.object;
        
        if (oldSubscription.items?.data[0]?.price?.id !== 
            newSubscription.items.data[0].price.id) {
          await errorHandler.handlePlanTransition(oldSubscription, newSubscription);
        }
        break;

      case 'invoice.payment_succeeded':
        // Reset usage counters for new billing periods
        const subscription = event.data.object.subscription;
        if (subscription) {
          await db
            .update(userUsage)
            .set({
              creditsUsed: 0,
              updatedAt: new Date(),
            })
            .where(
              eq(userUsage.userId, 
                (await db
                  .select()
                  .from(subscriptions)
                  .where(eq(subscriptions.stripeSubscriptionId, subscription))
                )[0].userId
              )
            );
        }
        break;

      // Handle other webhook events...
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: 'Webhook error' });
  }
}