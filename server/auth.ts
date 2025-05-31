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
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;

  if (redisUrl) {
    try {
      console.log('[Auth] Initializing Redis session store...');
      redisClient = createClient({
        url: redisUrl,
        socket: {
          tls: redisUrl.includes('rediss://'),
          rejectUnauthorized: false
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

      await redisClient.connect();
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: 'wordgen:sess:',
        ttl: 7 * 24 * 60 * 60 // 7 days in seconds
      });
      console.log('[Auth] Redis session store initialized successfully');
    } catch (error) {
      console.error('[Auth] Failed to initialize Redis session store:', error);
      console.log('[Auth] Falling back to MemoryStore');
      sessionStore = new MemoryStore({
        checkPeriod: 86400000, // 24 hours
        stale: false,
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
    }
  } else {
    console.log('[Auth] No Redis URL found, using MemoryStore');
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

  // Get session secret from environment variables with fallback
  const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || "development-secret";
  if (process.env.NODE_ENV === 'production' && sessionSecret === 'development-secret') {
    console.warn('WARNING: Using default session secret in production. This is insecure!');
  }

  const isDev = process.env.NODE_ENV !== 'production';

  // Configure CORS for the session
  const corsOrigin = isDev ? ['http://localhost:4002'] : ['https://wordgen.io'];

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: isDev ? 'lax' : 'strict',
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

  app.post("/api/login", (req, res, next) => {
    console.log("[/api/login] Attempt with:", {
      email: req.body.email,
      hasPassword: !!req.body.password,
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      referer: req.headers.referer
    });

    // Validate request body
    if (!req.body.email || !req.body.password) {
      return ApiResponse.badRequest(res, "Email and password are required", "INVALID_CREDENTIALS");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return ApiResponse.badRequest(res, "Invalid email format", "INVALID_EMAIL_FORMAT");
    }

    // Log the session ID before authentication
    console.log("[/api/login] Session before auth:", {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      hasSession: !!req.session
    });

    passport.authenticate("local", async (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        console.error("Login error:", err);
        return ApiResponse.error(res, 500, "An error occurred during login", "LOGIN_ERROR");
      }

      if (!user) {
        console.log("Login failed:", info.message);
        return ApiResponse.badRequest(res, info.message || "Invalid credentials", "INVALID_CREDENTIALS");
      }

      try {
        // Regenerate session to prevent session fixation
        await new Promise<void>((resolve, reject) => {
          req.session.regenerate((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Log in the user
        await new Promise<void>((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Save the session
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        console.log("Login successful for user:", {
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin,
          sessionID: req.sessionID
        });

        // Log the session ID after authentication
        console.log("[/api/login] Session after auth:", {
          sessionID: req.sessionID,
          isAuthenticated: req.isAuthenticated(),
          cookie: req.session?.cookie,
          hasSession: !!req.session
        });

        // Set cache control headers to prevent caching of authenticated responses
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        return ApiResponse.success(res, {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt?.toISOString(),
          updatedAt: user.updatedAt?.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString()
        }, "Login successful");
      } catch (error) {
        console.error("Session handling error:", error);
        return ApiResponse.error(res, 500, "An error occurred during login", "LOGIN_ERROR");
      }
    })(req, res, next);
  });

  app.post("/api/register", async (req, res) => {
    try {
      console.log("Registration attempt:", req.body.email);
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach(issue => {
          errors[issue.path.join('.')] = issue.message;
        });
        return ApiResponse.validationError(res, errors, "Validation failed", "VALIDATION_ERROR");
      }

      const { email, password } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        console.log("Registration failed - email exists:", email);
        return ApiResponse.badRequest(res, "Email is already registered", "EMAIL_EXISTS");
      }

      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          name: result.data.name,
          isAdmin: false,
          subscriptionTier: 'free',
          articleCreditsRemaining: 3,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log("User registered successfully:", email);

      // Manually regenerate the session before login
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error("Session regeneration failed:", err);
            reject(err);
            return;
          }
          resolve();
        });
      });

      await new Promise<void>((resolve, reject) => {
        // Add default values for missing properties
        const userWithDefaults = {
          ...newUser,
          emailNotifications: true,
          hasSeenTour: false
        } as Express.User;
        req.login(userWithDefaults, (err) => {
          if (err) {
            console.error("Auto-login after registration failed:", err);
            reject(err);
            return;
          }
          resolve();
        });
      });

      // Save the session after login
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save failed:", err);
            reject(err);
            return;
          }
          resolve();
        });
      });

      console.log("User logged in after registration:", {
        id: newUser.id,
        email: newUser.email,
        sessionID: req.sessionID
      });

      return ApiResponse.success(res, {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isAdmin: newUser.isAdmin,
        subscriptionTier: newUser.subscriptionTier,
        articleCreditsRemaining: newUser.articleCreditsRemaining,
        subscriptionStartDate: newUser.subscriptionStartDate?.toISOString(),
        subscriptionEndDate: newUser.subscriptionEndDate?.toISOString(),
        createdAt: newUser.createdAt?.toISOString(),
        updatedAt: newUser.updatedAt?.toISOString()
      }, "Registration successful");
    } catch (error: any) {
      console.error("Registration error:", error);
      return ApiResponse.error(res, 500, error.message || "Registration failed", "REGISTRATION_ERROR");
    }
  });

  app.post("/api/logout", (req, res) => {
    try {
      console.log("Logout attempt for user:", req.user?.id);
      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
          return ApiResponse.error(res, 500, "Failed to logout", "LOGOUT_ERROR");
        }
        console.log("Logout successful");
        return ApiResponse.success(res, null, "Logged out successfully");
      });
    } catch (error) {
      console.error("Logout error:", error);
      return ApiResponse.error(res, 500, "Failed to logout", "LOGOUT_ERROR");
    }
  });

  app.get("/api/user", (req, res) => {
    try {
      console.log("[/api/user] Checking authentication:", {
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        cookie: req.headers.cookie
      });

      if (req.isAuthenticated()) {
        const userData = {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          company: req.user.company,
          website: req.user.website,
          timezone: req.user.timezone,
          emailNotifications: req.user.emailNotifications,
          isAdmin: req.user.isAdmin,
          createdAt: req.user.createdAt?.toISOString(),
          updatedAt: req.user.updatedAt?.toISOString(),
          lastLoginAt: req.user.lastLoginAt?.toISOString()
        };

        console.log("[/api/user] Sending user data:", userData);
        return ApiResponse.success(res, userData, "User retrieved successfully");
      }

      console.log("[/api/user] User not authenticated");
      return ApiResponse.unauthorized(res, "Authentication required", "SESSION_EXPIRED");
    } catch (error) {
      console.error("[/api/user] Error:", error);
      return ApiResponse.error(res, 500, "Internal server error", "INTERNAL_SERVER_ERROR");
    }
  });
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