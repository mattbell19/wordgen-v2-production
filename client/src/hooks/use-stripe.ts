import { useState, useEffect } from 'react';
import { Stripe, loadStripe } from '@stripe/stripe-js';

declare global {
  interface Window {
    Stripe?: (key: string) => any;
  }
}

export function useStripe() {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isStripeLoaded, setIsStripeLoaded] = useState(false);

  useEffect(() => {
    const initStripe = async () => {
      if (window.Stripe) {
        const stripeInstance = await window.Stripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
        setStripe(stripeInstance);
        setIsStripeLoaded(true);
      } else {
        const stripeInstance = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
        setStripe(stripeInstance);
        setIsStripeLoaded(true);
      }
    };

    initStripe();
  }, []);

  return {
    stripe,
    isStripeLoaded,
  };
} 