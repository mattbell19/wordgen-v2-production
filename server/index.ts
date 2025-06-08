import 'dotenv/config'
import express from "express";
import cors from 'cors';
import morgan from 'morgan';
import { setupAuth, cleanupAuth } from './auth'
import { registerRoutes } from './routes/index'
import config from './config'
import { serveStatic } from './static'
import path from 'path';
import crypto from 'crypto';
import { initializeServices, scheduleCleanupTasks, cleanupServices } from './startup';
import { errorHandler, setupGlobalErrorHandlers } from './lib/error-handler';
import { apiRateLimiter } from './middleware/authMiddleware';
import { preventSqlInjection, validateRequestSize } from './middleware/validation';
import { securityMonitor, SecurityEventType, SecuritySeverity, createSecurityEvent } from './lib/security-monitor';

import gscAuthDirectRoute from './gsc-auth-direct';
import { gscService } from './services/gsc.service';
import helmet from 'helmet';
import compression from 'compression';
import apiRouter from './routes/api';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import seoRouter from './routes/seo';
import securityRouter from './routes/security';
import rateLimiter from './lib/rate-limiter';
import { logger } from './lib/logger';
import { logEnvironmentStatus } from './lib/env-validator';

// Setup global unhandled error catchers
setupGlobalErrorHandlers();

const app = express();
app.set('trust proxy', true);



// Health check endpoint is defined at the end of the file

/**
 * Middleware Order:
 * 1. Basic middleware (logging, CORS, body parsing)
 * 2. Authentication setup
 * 3. Static file serving (in production)
 * 4. API routes
 * 5. SPA catch-all route (in production)
 * 6. Error handling middleware
 *
 * This order ensures that:
 * - Static files are served before API routes to prevent conflicts
 * - Authentication is available for both static and API routes
 * - All non-API routes in production serve the SPA
 * - Error handling catches all errors from previous middleware
 */

// Basic middleware
app.use(morgan('dev'));

// Generate CSP nonce for each request
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Configure CSP
app.use((req, res, next) => {
  const nonce = res.locals.nonce;
  const isDev = process.env.NODE_ENV !== 'production';

  // Use secure CSP in all environments with nonce-based script execution
  const policies = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      // Allow unsafe-inline and unsafe-eval in both dev and prod temporarily
      "'unsafe-inline'", "'unsafe-eval'",
      // Add unsafe-hashes to allow event handlers
      "'unsafe-hashes'",
      'https://js.stripe.com',
      'https://m.stripe.network',
      'https://m.stripe.com',
      'https://*.posthog.com',
      'https://eu.i.posthog.com',
      // Add specific hashes for known inline scripts
      "'sha256-5DA+a07wxWmEka9IdoWjSPVHb17Cp5284/lJzfbl8KA='",
      "'sha256-/5Guo2nzv5n/w6ukZpOBZOtTJBJPSkJ6mhHpnBgm3Ls='",
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components
      'https://fonts.googleapis.com'
    ],
    'style-src-elem': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.stripe.com',
      'https://*.posthog.com'
    ],
    'connect-src': [
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
      'wss://www.wordgen.io',
      // Allow development connections
      ...(isDev ? ['ws://localhost:*', 'http://localhost:*', 'https://localhost:*'] : [])
    ],
    'frame-src': [
      "'self'",
      'https://*.stripe.com',
      'https://hooks.stripe.com'
    ],
    'worker-src': ["'self'", 'blob:', 'https://*.stripe.com'],
    'manifest-src': ["'self'"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'report-uri': ['/api/csp-report'],
    'report-to': ['default']
  };

  const cspString = Object.entries(policies)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');

  // Always enforce CSP, but log violations in development
  res.setHeader('Content-Security-Policy', cspString);

  // Also set report-only header in development for debugging
  if (isDev) {
    res.setHeader('Content-Security-Policy-Report-Only', cspString);
  }

  // Add other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// Configure CORS with strict origin validation
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://wordgen.io',
      'https://www.wordgen.io',
      'https://wordgen-v2-production-15d78da87625.herokuapp.com'
    ];
  }

  // Development origins - only allow specific localhost ports
  const allowedOrigins = ['http://localhost:4002', 'http://127.0.0.1:4002'];

  // Allow additional origins from environment variable if specified
  if (process.env.ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    allowedOrigins.push(...additionalOrigins);
  }

  return allowedOrigins;
};

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  maxAge: 86400, // 24 hours
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Log CORS configuration
console.log('[Server] CORS configuration:', {
  origin: corsOptions.origin,
  credentials: corsOptions.credentials,
  allowedHeaders: corsOptions.allowedHeaders,
  exposedHeaders: corsOptions.exposedHeaders
});

// Enable CORS preflight for all routes
app.options('*', cors(corsOptions));

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Parse JSON bodies with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add security middleware
app.use(validateRequestSize(10 * 1024 * 1024)); // 10MB limit
app.use(preventSqlInjection);

// Add API rate limiting to all API routes
app.use('/api', apiRateLimiter);

// Add security monitoring middleware
app.use((req, res, next) => {
  // Log suspicious requests
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /exec\(/i,  // Code execution
  ];

  const fullUrl = req.originalUrl || req.url;
  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(fullUrl) ||
    pattern.test(JSON.stringify(req.body)) ||
    pattern.test(JSON.stringify(req.query))
  );

  if (isSuspicious) {
    const event = createSecurityEvent(
      SecurityEventType.SUSPICIOUS_REQUEST,
      SecuritySeverity.MEDIUM,
      `Suspicious request pattern detected: ${req.method} ${fullUrl}`,
      req,
      {
        url: fullUrl,
        body: req.body,
        query: req.query
      }
    );
    securityMonitor.logSecurityEvent(event);
  }

  next();
});

// Add request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
      headers: req.headers,
      body: req.body,
      query: req.query
    });
    next();
  });
}

// Note: Authentication setup is handled in registerRoutes() function

async function startServer() {
  // Validate environment configuration
  logEnvironmentStatus();

  // Initialize application services
  initializeServices();
  scheduleCleanupTasks();

  // Setup authentication FIRST (required for all other routes)
  console.log('[SERVER] Setting up authentication...');
  await setupAuth(app);
  console.log('[SERVER] Authentication setup complete');

  // Register GSC auth direct route
  app.use('/api/gsc', gscAuthDirectRoute);

// Register GSC callback route
app.get('/api/gsc/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    console.log('Callback received with code:', code);
    console.log('Callback received with state:', state);

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return res.redirect('/dashboard/search-console?error=missing_params');
    }

    // Parse the state parameter
    let userId;
    try {
      // Try to parse as JSON
      const stateObj = JSON.parse(state as string);
      userId = stateObj.userId;
    } catch (e) {
      // If JSON parsing fails, try base64 decoding
      try {
        const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
        userId = stateData.userId;
      } catch (e2) {
        console.error('Failed to parse state parameter:', e2);
        return res.redirect('/dashboard/search-console?error=invalid_state');
      }
    }

    if (!userId) {
      console.error('No userId found in state parameter');
      return res.redirect('/dashboard/search-console?error=invalid_state');
    }

    console.log('Processing callback for user:', userId);

    // Exchange code for tokens
    const tokens = await gscService.getTokensFromCode(code as string);
    console.log('Received tokens:', tokens ? 'tokens received' : 'no tokens');

    // Get user info
    let email, profilePicture;
    if (tokens.access_token) {
      const userInfo = await gscService.getUserInfo(tokens.access_token);
      email = userInfo.email;
      profilePicture = userInfo.picture;
      console.log('User info retrieved:', email);
    }

    // Save tokens
    await gscService.saveUserTokens(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date,
      email,
      profilePicture
    );
    console.log('Tokens saved for user:', userId);

    // Fetch and save sites
    await gscService.getSitesForUser(userId);
    console.log('Sites fetched and saved for user:', userId);

    return res.redirect('/dashboard/search-console?success=true');
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return res.redirect('/dashboard/search-console?error=auth_failed');
  }
});

// Note: Static file serving moved to after API routes to prevent conflicts

// Add debug routes before API routes
app.get('/api/debug/proxy-test', (req, res) => {
  console.log('[DEBUG] Proxy test endpoint called');
  res.json({
    success: true,
    message: 'Proxy is working correctly',
    headers: req.headers,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/debug/echo', express.json(), (req, res) => {
  console.log('[DEBUG] Echo endpoint called with body:', req.body);
  res.json({
    success: true,
    message: 'Echo endpoint',
    receivedBody: req.body,
    headers: req.headers,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint - MUST be before static file serving
app.get('/api/health', (_req, res) => {
  const hasRedis = !!process.env.REDIS_URL || !!process.env.REDIS_TLS_URL;
  const sessionStore = hasRedis ? 'Redis' : 'Memory';

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    sessionStore: sessionStore,
    features: {
      redis: hasRedis,
      openai: !!process.env.OPENAI_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      email: !!process.env.RESEND_API_KEY,
      google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    }
  });
});

// Register API routes
console.log('[SERVER] About to register routes...');
try {
  registerRoutes(app);
  console.log('[SERVER] Routes registered successfully');
} catch (error) {
  console.error('[SERVER] Error registering routes:', error);
  console.error('[SERVER] Error stack:', error.stack);
  throw error;
}

// Serve static files in production AFTER API routes
if (process.env.NODE_ENV === 'production') {
  console.log('[SERVER] Setting up static file serving for production');
  serveStatic(app);
}

// Add standardized error handling middleware
app.use(errorHandler);

  // Start the HTTP server
  const PORT = process.env.PORT || config.port;
  const httpServer = app.listen(PORT, () => {
    console.log(`[Server] Server is running on port ${PORT}`);
    logger.info(`Server running on port ${PORT}`);
  });

  // Add WebSocket upgrade handling
  httpServer.on('upgrade', (request, socket, head) => {
    console.log('[WS] Upgrade request received:', {
      url: request.url,
      headers: request.headers
    });
  });

  // Return the server instance for graceful shutdown
  return httpServer;
}

// Start the server and set up graceful shutdown
let serverInstance: any = null;

startServer()
  .then((httpServer) => {
    serverInstance = httpServer;

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} signal received: shutting down server`);

      if (serverInstance) {
        // First close the server to stop accepting new connections
        serverInstance.close(() => {
          console.log('Server closed');
        });
      }

      try {
        // Clean up application resources
        console.log('Cleaning up application resources...');
        await cleanupServices();
        await cleanupAuth();
        console.log('Application resources cleaned up successfully.');

        // Exit process
        process.exit(0);
      } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Export for testing
export default app;