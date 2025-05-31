import { useEffect } from "react";

interface HeadProps {
  children?: React.ReactNode;
}

export function Head({ children }: HeadProps) {
  useEffect(() => {
    // Only load Stripe.js if it hasn't been loaded yet
    if (!(window as any).Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  return children;
}