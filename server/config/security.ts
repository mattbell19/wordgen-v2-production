/**
 * Security Configuration Module
 * Centralized security settings and validation
 */

import { z } from 'zod';

// Environment validation schema
const securityEnvSchema = z.object({
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BCRYPT_ROUNDS: z.string().transform(val => parseInt(val)).pipe(z.number().min(10).max(15)).default('12'),
  SESSION_TIMEOUT: z.string().transform(val => parseInt(val)).pipe(z.number().positive()).default('86400000'),
  MAX_LOGIN_ATTEMPTS: z.string().transform(val => parseInt(val)).pipe(z.number().positive()).default('5'),
  LOCKOUT_DURATION: z.string().transform(val => parseInt(val)).pipe(z.number().positive()).default('900000'),
  RATE_LIMIT_WINDOW: z.string().transform(val => parseInt(val)).pipe(z.number().positive()).default('900000'),
  RATE_LIMIT_MAX: z.string().transform(val => parseInt(val)).pipe(z.number().positive()).default('100'),
});

// Validate and parse environment variables
function validateSecurityEnv() {
  try {
    return securityEnvSchema.parse({
      SESSION_SECRET: process.env.SESSION_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
      SESSION_TIMEOUT: process.env.SESSION_TIMEOUT,
      MAX_LOGIN_ATTEMPTS: process.env.MAX_LOGIN_ATTEMPTS,
      LOCKOUT_DURATION: process.env.LOCKOUT_DURATION,
      RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
      RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    });
  } catch (error) {
    console.error('Security configuration validation failed:', error);
    throw new Error('Invalid security configuration. Please check your environment variables.');
  }
}

// Export validated configuration
export const securityConfig = validateSecurityEnv();

// Security headers configuration
export const securityHeaders = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'nonce-{NONCE}'", // Will be replaced with actual nonce
        'https://js.stripe.com',
        'https://m.stripe.network',
        'https://m.stripe.com',
        'https://*.posthog.com',
        'https://eu.i.posthog.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled-components
        'https://fonts.googleapis.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.posthog.com'
      ],
      connectSrc: [
        "'self'",
        'https://*.stripe.com',
        'https://*.posthog.com',
        'https://eu.i.posthog.com',
        'wss://*.posthog.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://wordgen.io',
        'https://www.wordgen.io',
        'wss://wordgen.io',
        'wss://www.wordgen.io'
      ],
      frameSrc: [
        "'self'",
        'https://*.stripe.com',
        'https://hooks.stripe.com'
      ],
      workerSrc: ["'self'", 'blob:', 'https://*.stripe.com'],
      manifestSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      reportUri: ['/api/csp-report'],
      reportTo: ['default']
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: 'strict-origin-when-cross-origin'
};

// CORS configuration
export const corsConfig = {
  production: [
    'https://wordgen.io',
    'https://www.wordgen.io',
    'https://wordgen-v2-production-15d78da87625.herokuapp.com'
  ],
  development: [
    'http://localhost:4002',
    'http://127.0.0.1:4002'
  ]
};

// Rate limiting configuration
export const rateLimitConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: securityConfig.MAX_LOGIN_ATTEMPTS,
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  },
  api: {
    windowMs: securityConfig.RATE_LIMIT_WINDOW,
    max: securityConfig.RATE_LIMIT_MAX,
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  }
};

// Session configuration
export const sessionConfig = {
  secret: securityConfig.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    secure: securityConfig.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: securityConfig.SESSION_TIMEOUT,
    path: '/'
  },
  rolling: true,
  proxy: securityConfig.NODE_ENV === 'production'
};

// Password hashing configuration
export const passwordConfig = {
  saltRounds: securityConfig.BCRYPT_ROUNDS,
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false
};

// Account lockout configuration
export const lockoutConfig = {
  maxAttempts: securityConfig.MAX_LOGIN_ATTEMPTS,
  lockoutDuration: securityConfig.LOCKOUT_DURATION,
  resetTime: 24 * 60 * 60 * 1000 // 24 hours
};

// Input validation configuration
export const validationConfig = {
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  sanitizeHtml: true,
  stripTags: true
};

// API security configuration
export const apiSecurityConfig = {
  enableApiVersioning: true,
  defaultVersion: 'v1',
  enableRequestLogging: securityConfig.NODE_ENV !== 'production',
  enableResponseLogging: false,
  maxRequestSize: '10mb',
  enableCompression: true,
  trustProxy: securityConfig.NODE_ENV === 'production'
};

export default {
  security: securityConfig,
  headers: securityHeaders,
  cors: corsConfig,
  rateLimit: rateLimitConfig,
  session: sessionConfig,
  password: passwordConfig,
  lockout: lockoutConfig,
  validation: validationConfig,
  api: apiSecurityConfig
};
