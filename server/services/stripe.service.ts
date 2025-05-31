import Stripe from 'stripe';
import { db } from '@db';
import { subscriptionPlans, subscriptions, paymentHistory } from '@db/schema';
import { eq } from 'drizzle-orm';
import { subscriptionController } from '../controllers/subscription.controller';

export const isDevelopment = process.env.NODE_ENV === 'development';

// Make Stripe optional during development
export let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY && !isDevelopment) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true
    });
  } else if (isDevelopment) {
    console.warn('Running in development mode - Stripe functionality will be mocked');
  } else {
    throw new Error('Stripe must be configured in production');
  }
} catch (error) {
  console.error('Failed to initialize Stripe:', error);
  if (!isDevelopment) {
    throw error;
  }
}

// Define subscription plan types
interface SubscriptionPlan {
  name: string;
  description: string;
  priceInCents: number;
  interval?: Stripe.Price.Recurring.Interval;
  metadata: {
    articleLimit: number | null;
    keywordReportLimit: number | null;
  };
  stripeProductId?: string;
}

// Define our subscription plans
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    name: 'Pay-As-You-Go',
    description: 'Pay per article with no monthly commitment',
    priceInCents: 500, // £5
    metadata: {
      articleLimit: null,
      keywordReportLimit: null
    }
  },
  {
    name: 'Starter Plan',
    description: 'Perfect for small content teams',
    priceInCents: 7500,
    interval: 'month',
    metadata: {
      articleLimit: 25,
      keywordReportLimit: 10
    },
    stripeProductId: 'prod_RiKY2q7UR3tgMH'
  },
  {
    name: 'Growth Plan',
    description: 'Ideal for growing businesses',
    priceInCents: 14900,
    interval: 'month',
    metadata: {
      articleLimit: 75,
      keywordReportLimit: 30
    },
    stripeProductId: 'prod_RiKb0yi0sAGJTQ'
  },
  {
    name: 'Agency Plan',
    description: 'For professional content agencies',
    priceInCents: 29900,
    interval: 'month',
    metadata: {
      articleLimit: 200,
      keywordReportLimit: 100
    },
    stripeProductId: 'prod_RiKbLtYcxeZcIH'
  }
];

export interface CreateSubscriptionParams {
  userId: number;
  planId: number;
  paymentMethodId: string;
  email: string;
}

export const stripeService = {
  // Initialize Stripe products and prices
  async initializeProducts() {
    if (isDevelopment) {
      console.log('Development mode: Skipping Stripe product initialization');
      return;
    }
    
    if (!stripe) {
      throw new Error('Stripe must be configured in production');
    }
    
    try {
      // Create PAYG price
      const paygPlan = SUBSCRIPTION_PLANS[0];
      const paygProduct = await stripe.products.create({
        name: paygPlan.name,
        description: paygPlan.description,
        metadata: paygPlan.metadata,
        active: true,
      });

      const paygPrice = await stripe.prices.create({
        product: paygProduct.id,
        unit_amount: paygPlan.priceInCents,
        currency: 'gbp', // Changed to GBP for £5
        metadata: paygPlan.metadata,
      });

      // Update PAYG in database
      await db
        .update(subscriptionPlans)
        .set({
          stripeProductId: paygProduct.id,
          stripePriceId: paygPrice.id,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlans.name, paygPlan.name));

      // For subscription plans, use existing product IDs
      for (const plan of SUBSCRIPTION_PLANS.slice(1)) {
        if (!plan.stripeProductId || !plan.interval) continue;

        // Create price for the existing product
        const price = await stripe.prices.create({
          product: plan.stripeProductId,
          unit_amount: plan.priceInCents,
          currency: 'gbp',
          recurring: {
            interval: plan.interval,
          },
          metadata: plan.metadata,
        });

        // Update our database with the Stripe IDs
        await db
          .update(subscriptionPlans)
          .set({
            stripeProductId: plan.stripeProductId,
            stripePriceId: price.id,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionPlans.name, plan.name));

        console.log(`[Stripe] Initialized plan: ${plan.name}`);
      }
    } catch (error: any) {
      console.error('[Stripe] Product initialization error:', error);
      if (!isDevelopment) {
        throw error;
      }
    }
  },

  async createCustomer(email: string, name?: string) {
    if (isDevelopment) {
      console.log('Development mode: Returning mock customer');
      return { id: 'mock_customer_' + Date.now() };
    }

    if (!stripe) throw new Error('Stripe must be configured in production');

    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });
      return customer;
    } catch (error: any) {
      console.error('[Stripe] Create customer error:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  },

  async createSubscription({ userId, planId, paymentMethodId, email }: CreateSubscriptionParams) {
    if (isDevelopment) {
      console.log('Development mode: Creating mock subscription');
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId));

      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const [dbSubscription] = await db
        .insert(subscriptions)
        .values({
          userId,
          planId,
          status: 'active',
          stripeSubscriptionId: 'mock_sub_' + Date.now(),
          stripeCustomerId: 'mock_customer_' + Date.now(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          articlesUsed: 0,
          cancelAtPeriodEnd: false,
        })
        .returning();

      return {
        subscriptionId: dbSubscription.id,
        clientSecret: 'mock_client_secret',
      };
    }

    if (!stripe) throw new Error('Stripe must be configured in production');

    try {
      // Get the plan details from our database
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId));

      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Create or get customer
      const customer = await this.createCustomer(email);

      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set it as the default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: plan.stripePriceId }],
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      // Save subscription details to our database
      const [dbSubscription] = await db
        .insert(subscriptions)
        .values({
          userId,
          planId,
          status: subscription.status,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customer.id,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          articlesUsed: 0,
          cancelAtPeriodEnd: false,
        })
        .returning();

      return {
        subscriptionId: dbSubscription.id,
        clientSecret: (subscription.latest_invoice as any).payment_intent?.client_secret,
      };
    } catch (error: any) {
      console.error('[Stripe] Create subscription error:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  },

  async cancelSubscription(subscriptionId: number) {
    if (isDevelopment) {
      console.log('Development mode: Mocking subscription cancellation');
      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true })
        .where(eq(subscriptions.id, subscriptionId));
      return true;
    }

    if (!stripe) throw new Error('Stripe must be configured in production');

    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId));

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true })
        .where(eq(subscriptions.id, subscriptionId));

      return true;
    } catch (error: any) {
      console.error('[Stripe] Cancel subscription error:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  },

  async handleWebhookEvent(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const userId = parseInt(paymentIntent.metadata.userId);
          
          // Handle PAYG payment success
          if (paymentIntent.metadata.type === 'payg') {
            await subscriptionController.updateSubscriptionStatus(userId, 'Pay-As-You-Go');
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const [dbSubscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

          if (!dbSubscription) break;

          // Get plan name from product
          const product = await stripe.products.retrieve(subscription.items.data[0].price.product as string);
          
          await subscriptionController.updateSubscriptionStatus(
            dbSubscription.userId,
            product.name,
            event.type === 'customer.subscription.created'
          );
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const [dbSubscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

          if (!dbSubscription) break;

          // Update subscription status in database
          await db
            .update(subscriptions)
            .set({
              status: 'canceled',
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, dbSubscription.id));

          // Reset user to PAYG
          await subscriptionController.updateSubscriptionStatus(
            dbSubscription.userId,
            'Pay-As-You-Go'
          );
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          
          // Only handle subscription invoices
          if (!invoice.subscription) break;

          const [dbSubscription] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string));

          if (!dbSubscription) break;

          // Get plan name from product
          const product = await stripe.products.retrieve(invoice.lines.data[0].price.product as string);
          
          // Handle subscription renewal
          await subscriptionController.handleSubscriptionRenewal(
            dbSubscription.userId,
            product.name
          );
          break;
        }
      }
    } catch (error: any) {
      console.error('[Stripe] Webhook handling error:', error);
      throw error;
    }
  },

  async createPaygPaymentIntent(userId: number, email: string) {
    try {
      // Get the PAYG plan
      const [paygPlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, 'Pay-As-You-Go'));

      if (!paygPlan) {
        throw new Error('PAYG plan not found');
      }

      // Get or create customer
      let customer = await this.getOrCreateCustomer(email);

      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: paygPlan.priceInCents,
        currency: 'gbp',
        customer: customer.id,
        metadata: {
          type: 'payg',
          userId: userId.toString(),
          planId: paygPlan.id.toString()
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error: any) {
      console.error('[Stripe] PAYG payment intent creation error:', error);
      throw error;
    }
  },

  // Helper function to get or create a Stripe customer
  async getOrCreateCustomer(email: string) {
    // Search for existing customer
    const customers = await stripe.customers.list({ email });
    
    if (customers.data.length > 0) {
      return customers.data[0];
    }

    // Create new customer if none exists
    return await stripe.customers.create({ email });
  },

  /**
   * Update an existing subscription to a new plan
   */
  async updateSubscription(stripeSubscriptionId: string, newPriceId: string) {
    try {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      const subscriptionItems = subscription.items.data;
      if (!subscriptionItems || subscriptionItems.length === 0) {
        throw new Error('No subscription items found');
      }

      // Update the subscription with the new price
      await stripe.subscriptions.update(stripeSubscriptionId, {
        items: [
          {
            id: subscriptionItems[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });
    } catch (error: any) {
      console.error('[Stripe] Update subscription error:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  },

  async createSetupIntent(customerId: string) {
    return stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
  },

  async listPaymentMethods(customerId: string) {
    return stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
  },

  async detachPaymentMethod(paymentMethodId: string) {
    return stripe.paymentMethods.detach(paymentMethodId);
  },

  async updateDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
    return stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  },
};