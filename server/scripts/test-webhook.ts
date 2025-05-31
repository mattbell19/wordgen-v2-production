import type { Request, Response } from "express";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

/**
 * Helper function to simulate webhook events locally
 * This is useful for testing webhook handling without the Stripe CLI
 */
export async function simulateWebhookEvent(eventType: string) {
  try {
    // Create a test customer
    const customer = await stripe.customers.create({
      email: "test@example.com",
    });

    // Create a test payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2000,
      currency: "usd",
      customer: customer.id,
      payment_method_types: ["card"],
    });

    // Construct event data based on type
    const eventData = {
      id: `evt_${Math.random().toString(36).substr(2, 9)}`,
      object: "event",
      api_version: "2024-12-18.acacia",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: paymentIntent,
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: eventType,
    };

    return eventData;
  } catch (error) {
    console.error("Error simulating webhook event:", error);
    throw error;
  }
}

/**
 * Example usage:
 * 
 * 1. Start your server
 * 2. Install Stripe CLI: https://stripe.com/docs/stripe-cli
 * 3. Run: stripe listen --forward-to localhost:5000/api/payments/webhook
 * 4. In another terminal, trigger events:
 *    stripe trigger payment_intent.succeeded
 * 
 * For manual testing without Stripe CLI:
 * ```typescript
 * const event = await simulateWebhookEvent('payment_intent.succeeded');
 * const response = await fetch('http://localhost:5000/api/payments/webhook', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Stripe-Signature': 'test_signature'  // Note: This won't pass signature verification
 *   },
 *   body: JSON.stringify(event)
 * });
 * ```
 */
