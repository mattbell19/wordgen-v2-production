import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import ApiResponse from './lib/api-response';
import cors from 'cors';

const scryptAsync = promisify(scrypt);
const MemoryStore = createMemoryStore(session);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends SelectUser {
      emailNotifications: boolean;
      hasSeenTour: boolean;
    }
  }
}

// Initialize Redis client for session store
let redisClient: any = null;
let sessionStore: any = null;

async function initializeSessionStore() {
  // Check for Redis URL from various Heroku Redis add-ons
  const redisUrl = process.env.REDIS_URL ||
                   process.env.REDIS_TLS_URL ||
                   process.env.REDISCLOUD_URL ||
                   process.env.REDISTOGO_URL;

  if (redisUrl) {
    try {
      console.log('[Auth] Initializing Redis session store with URL:', redisUrl.replace(/\/\/.*@/, '//***:***@'));

      // Parse Redis URL to handle different formats
      const isSecure = redisUrl.includes('rediss://');

      redisClient = createClient({
        url: redisUrl,
        socket: {
          tls: isSecure,
          rejectUnauthorized: false,
          connectTimeout: 10000,
          lazyConnect: true
        },
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('[Auth] Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('[Auth] Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            console.error('[Auth] Redis max attempts reached');
            return undefined;
          }
          // Reconnect after
          return Math.min(options.attempt * 100, 3000);
        }
      });

      redisClient.on('error', (err: any) => {
        console.error('[Auth] Redis client error:', err);
      });

      redisClient.on('connect', () => {
        console.log('[Auth] Redis client connected successfully');
      });

      redisClient.on('ready', () => {
        console.log('[Auth] Redis client ready');
      });

      redisClient.on('end', () => {
        console.log('[Auth] Redis client connection ended');
      });

      await redisClient.connect();
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: 'wordgen:sess:',
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds
        disableTouch: false,
        disableTTL: false
      });
      console.log('[Auth] Redis session store initialized successfully');
    } catch (error) {
      console.error('[Auth] Failed to initialize Redis session store:', error);
      console.log('[Auth] Falling back to MemoryStore (sessions will not persist across restarts)');
      sessionStore = new MemoryStore({
        checkPeriod: 86400000, // 24 hours
        stale: false,
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }
  } else {
    console.log('[Auth] No Redis URL found, using MemoryStore (sessions will not persist across restarts)');
    console.log('[Auth] Available Redis environment variables:', {
      REDIS_URL: !!process.env.REDIS_URL,
      REDIS_TLS_URL: !!process.env.REDIS_TLS_URL,
      REDISCLOUD_URL: !!process.env.REDISCLOUD_URL,
      REDISTOGO_URL: !!process.env.REDISTOGO_URL
    });
    sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
      stale: false,
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
}

export async function setupAuth(app: Express) {
  // Initialize session store first
  await initializeSessionStore();

  // Get session secret from environment variables - REQUIRED
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  if (sessionSecret === 'development-secret' || sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be a strong random string of at least 32 characters');
  }

  const isDev = process.env.NODE_ENV !== 'production';

  // Configure CORS for the session
  const corsOrigin = isDev
    ? ['http://localhost:4002']
    : [
        'https://wordgen.io',
        'https://wordgen-v2-production-15d78da87625.herokuapp.com'
      ];

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: isDev ? 'lax' : 'lax', // Use 'lax' for better compatibility
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    },
    rolling: true, // Refresh session with each request
    proxy: isDev ? false : true
  };

  // Log session configuration for debugging
  const storeType = redisClient ? 'RedisStore' : 'MemoryStore';
  console.log('[Auth] Session configuration:', {
    store: storeType,
    cookieSecure: sessionSettings.cookie?.secure,
    cookieSameSite: sessionSettings.cookie?.sameSite,
    cookieMaxAge: sessionSettings.cookie?.maxAge,
    resave: sessionSettings.resave,
    saveUninitialized: sessionSettings.saveUninitialized,
    proxy: sessionSettings.proxy,
    rolling: sessionSettings.rolling
  });

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  // Initialize express session
  app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
  }));
  
  // Set security headers
  app.use((req, res, next) => {
    // Don't cache authenticated responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Remove the SameSite cookie modifier middleware as we're handling it in the session config
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      // Log session info for debugging
      console.log('[Auth] Request session:', {
        path: req.path,
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated(),
        cookie: req.session?.cookie
      });
      next();
    });
  }

  // Add session check middleware
  app.use((req, res, next) => {
    const path = req.path.toLowerCase();

    // Skip auth check for auth-related and public routes
    if (
      path === '/auth' ||
      path === '/login' ||
      path === '/auth/' ||
      path === '/login/' ||
      path.startsWith('/auth/') ||
      path.startsWith('/login/') ||
      path === '/api/login' ||
      path === '/api/register' ||
      path === '/api/health' ||
      path === '/api/csp-report' ||
      path === '/api/gsc-debug' ||
      path.startsWith('/api/gsc/auth') ||
      path === '/api/gsc/callback' ||
      path === '/api/gsc/status' ||
      path === '/api/gsc/sites' ||
      path.startsWith('/api/gsc/sites/') ||
      path === '/api/gsc/performance' ||
      path === '/api/gsc/keywords' ||
      path === '/api/gsc/pages' ||
      path === '/api/test' ||
      path === '/health' ||
      path === '/' ||
      path === '/pricing' ||
      path.startsWith('/assets/') ||
      path.startsWith('/static/') ||
      req.method === 'OPTIONS'
    ) {
      console.log(`[AUTH] Skipping auth check for public path: ${path}`);
      return next();
    }

    // Check if session is valid
    if (!req.isAuthenticated()) {
      // Log debug information
      console.log(`[AUTH] Unauthenticated request redirecting to /auth: ${req.path}`, {
        originalUrl: req.originalUrl
      });

      // If it's an API request, return JSON error
      if (req.path.startsWith('/api/')) {
        return ApiResponse.unauthorized(res, 'Session expired or invalid. Please log in again.', 'SESSION_EXPIRED');
      }

      // For non-API requests, redirect to auth page
      return res.redirect('/auth');
    }

    // Update session expiry
    if (req.session) {
      req.session.touch();
    }

    next();
  });

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log("Login attempt for:", email);
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            console.log("User not found:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          const isMatch = await crypto.compare(password, user.password);
          if (!isMatch) {
            console.log("Password mismatch for:", email);
            return done(null, false, { message: "Invalid email or password" });
          }

          // Update last login time
          try {
            await db
              .update(users)
              .set({ lastLoginDate: new Date() })
              .where(eq(users.id, user.id));
          } catch (updateError) {
            console.warn("Failed to update last login time:", updateError);
          }

          console.log("Login successful for:", email, "isAdmin:", user.isAdmin);
          // Add default values for missing properties
          const userWithDefaults = {
            ...user,
            emailNotifications: true,
            hasSeenTour: false
          } as Express.User;
          return done(null, userWithDefaults);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.warn("User not found during deserialization:", id);
        return done(null, false);
      }

      // Add default values for missing properties
      const userWithDefaults = {
        ...user,
        emailNotifications: true,
        hasSeenTour: false
      } as Express.User;
      done(null, userWithDefaults);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  // Login route moved to server/routes/auth.ts

  // All authentication routes moved to server/routes/auth.ts
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Log detailed authentication information
    console.log('[requireAuth] Checking authentication:', {
      path: req.path,
      method: req.method,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id,
      headers: {
        cookie: req.headers.cookie ? 'Present' : 'Missing',
        origin: req.headers.origin,
        referer: req.headers.referer,
        host: req.headers.host
      }
    });

    // Check if session exists but is not authenticated
    if (req.sessionID && !req.isAuthenticated()) {
      console.warn('[requireAuth] Session exists but not authenticated:', {
        sessionID: req.sessionID,
        path: req.path
      });

      // Try to regenerate the session
      req.session.regenerate((err) => {
        if (err) {
          console.error('[requireAuth] Failed to regenerate session:', err);
          return ApiResponse.unauthorized(res, 'Session expired. Please log in again.', 'SESSION_EXPIRED');
        }

        // If still not authenticated after regeneration, return unauthorized
        if (!req.isAuthenticated()) {
          return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
        }

        // If authentication succeeded after regeneration, continue
        next();
      });
      return;
    }

    // Standard authentication check
    if (!req.isAuthenticated()) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    // Save the session to ensure it's persisted
    req.session.save((err) => {
      if (err) {
        console.error('[requireAuth] Failed to save session:', err);
      }
      next();
    });
  } catch (error) {
    console.error("Auth middleware error:", error);
    return ApiResponse.error(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
  }
};

// Export cleanup function for graceful shutdown
export async function cleanupAuth(): Promise<void> {
  if (redisClient) {
    try {
      console.log('[Auth] Closing Redis connection...');
      await redisClient.quit();
      console.log('[Auth] Redis connection closed successfully');
    } catch (error) {
      console.error('[Auth] Error closing Redis connection:', error);
    }
  }
}