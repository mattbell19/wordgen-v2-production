import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../lib/error-handler';
import ApiResponse from '../lib/api-response';
import rateLimit from 'express-rate-limit';

/**
 * Middleware to require authentication for routes
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return ApiResponse.unauthorized(res, 'Authentication required to access this resource', 'SESSION_EXPIRED');
  }

  // Ensure session is updated (extend expiry)
  if (req.session) {
    req.session.touch();
  }

  next();
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return ApiResponse.unauthorized(res, 'Authentication required to access this resource', 'SESSION_EXPIRED');
  }

  if (!req.user?.isAdmin) {
    return ApiResponse.forbidden(res, 'Admin privileges required to access this resource', 'ADMIN_REQUIRED');
  }

  next();
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
 * Enhanced rate limiter for authentication endpoints with IP and user-based limiting
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Reduced to 5 attempts per IP
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    // Use both IP and email for more granular rate limiting
    const email = req.body?.email || 'unknown';
    return `auth_${req.ip}_${email}`;
  },
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for auth attempt:`, {
      ip: req.ip,
      email: req.body?.email,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    return ApiResponse.error(res, 429, 'Too many login attempts, please try again later', 'RATE_LIMIT_EXCEEDED');
  }
});

/**
 * Enhanced rate limiter for API endpoints with user-based limiting
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Increased for normal API usage
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).user?.id;
    return userId ? `api_user_${userId}` : `api_ip_${req.ip}`;
  },
  handler: (req, res) => {
    console.warn(`API rate limit exceeded:`, {
      ip: req.ip,
      userId: (req as any).user?.id,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    return ApiResponse.error(res, 429, 'Too many requests, please try again later', 'RATE_LIMIT_EXCEEDED');
  }
});

/**
 * Strict rate limiter for sensitive operations
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 attempts per hour
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many attempts for this sensitive operation, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as any).user?.id;
    return userId ? `strict_user_${userId}` : `strict_ip_${req.ip}`;
  }
});

/**
 * Check if user has active subscription
 */
export const requireActiveSubscription = (req: Request, res: Response, next: NextFunction) => {
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
}; 