/**
 * Consolidated Authentication Middleware
 * 
 * This file provides a single source of truth for authentication middleware
 * to ensure consistent behavior across the application.
 */

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../lib/api-response';
import rateLimit from 'express-rate-limit';

/**
 * Middleware to require authentication for routes
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Log authentication check for debugging
    console.log('[requireAuth] Checking authentication:', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id,
      path: req.path,
      method: req.method
    });

    if (!req.isAuthenticated()) {
      return ApiResponse.unauthorized(res, 'Authentication required to access this resource', 'SESSION_EXPIRED');
    }

    // Ensure session is updated (extend expiry)
    if (req.session) {
      req.session.touch();
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return ApiResponse.error(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
  }
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated()) {
      return ApiResponse.unauthorized(res, 'Authentication required to access this resource', 'SESSION_EXPIRED');
    }

    if (!req.user?.isAdmin) {
      return ApiResponse.forbidden(res, 'Admin privileges required to access this resource', 'ADMIN_REQUIRED');
    }

    // Ensure session is updated (extend expiry)
    if (req.session) {
      req.session.touch();
    }

    next();
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return ApiResponse.error(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
  }
};

/**
 * Async middleware wrapper for consistent error handling
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Successful login attempts don't count towards rate limiting
});

/**
 * Rate limiter for API endpoints
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Check if user has active subscription
 */
export const requireActiveSubscription = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.isAuthenticated()) {
      return ApiResponse.unauthorized(res, 'Authentication required to access this resource', 'SESSION_EXPIRED');
    }

    const user = req.user;
    
    // Skip check for admins
    if (user.isAdmin) {
      return next();
    }

    // Check subscription status - this should be adapted to your subscription logic
    if (user.subscriptionTier === 'free' && (user.articleCreditsRemaining || 0) <= 0) {
      return ApiResponse.forbidden(
        res, 
        'You have used all your free credits. Please upgrade your subscription to continue.', 
        'SUBSCRIPTION_REQUIRED'
      );
    }

    next();
  } catch (error) {
    console.error("Subscription middleware error:", error);
    return ApiResponse.error(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
  }
};
