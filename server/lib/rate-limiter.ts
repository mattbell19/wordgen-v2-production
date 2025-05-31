import { rateLimit } from 'express-rate-limit';

// Create a general rate limiter for all API routes
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
  handler: (req, res, next, options) => {
    console.log(`[RATE-LIMIT] Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({
      status: 'error',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
        details: {
          retryAfter: Math.ceil(options.windowMs / 1000),
          limit: options.max,
          windowMs: options.windowMs
        }
      }
    });
  }
});

// Create a more strict rate limiter for authentication routes
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts, please try again after an hour',
  handler: (req, res, next, options) => {
    console.log(`[RATE-LIMIT] Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({
      status: 'error',
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: options.message,
        details: {
          retryAfter: Math.ceil(options.windowMs / 1000),
          limit: options.max,
          windowMs: options.windowMs
        }
      }
    });
  }
});

// Create a rate limiter for API endpoints that consume significant resources
export const resourceIntensiveRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many resource-intensive requests, please try again after 5 minutes',
  handler: (req, res, next, options) => {
    console.log(`[RATE-LIMIT] Resource intensive rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json({
      status: 'error',
      error: {
        code: 'RESOURCE_RATE_LIMIT_EXCEEDED',
        message: options.message,
        details: {
          retryAfter: Math.ceil(options.windowMs / 1000),
          limit: options.max,
          windowMs: options.windowMs
        }
      }
    });
  }
});

export default rateLimiter; 