import type { Request, Response, NextFunction } from "express";
import express from "express";

/**
 * Sets up the webhook middleware for handling Stripe webhook requests
 * 
 * This middleware ensures that:
 * 1. Webhook endpoints receive raw body data for signature verification
 * 2. Other routes use standard body parsing
 * 3. Proper error handling is in place
 */
export function setupWebhookMiddleware(app: express.Express) {
  // Special raw body parser just for the webhook endpoint
  app.use("/api/payments/webhook", express.raw({ type: 'application/json' }));

  // Regular body parser for all other routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/api/payments/webhook") {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  // URL-encoded parser for non-webhook routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/api/payments/webhook") {
      next();
    } else {
      express.urlencoded({ extended: false })(req, res, next);
    }
  });
}