import Stripe from 'stripe';
import { logger } from '../lib/logger';

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  logger.warn('STRIPE_SECRET_KEY is not defined in environment variables', {
    context: 'stripe'
  });
}

// Create Stripe instance
export const stripe = new Stripe(stripeSecretKey || 'dummy_key_for_dev', {
  apiVersion: '2023-10-16', // Use latest API version
  appInfo: {
    name: 'WordGen',
    version: '1.0.0',
  },
  typescript: true,
});

// Export the initialized Stripe instance
export default stripe; 