import { Router } from 'express';
import passport from 'passport';
import { asyncHandler } from '../middleware/authMiddleware';
import { ValidationError } from '../lib/error-handler';
import ApiResponse from '../lib/api-response';
import { authRateLimiter } from '../middleware/authMiddleware';
import { formatZodErrors } from '../lib/error-handler';
import { insertUserSchema, users, passwordResetTokens } from '@db/schema';
import { db } from '@db';
import { eq, and, isNull } from 'drizzle-orm';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { z } from 'zod';
import { sendEmail } from '../services/email';

const scryptAsync = promisify(scrypt);
const router = Router();

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

// Add rate limiting to auth endpoints
router.use(authRateLimiter);

// Get current user route
router.get('/me', asyncHandler(async (req, res) => {
  if (!req.isAuthenticated()) {
    return ApiResponse.unauthorized(res, 'Session expired or invalid. Please log in again.', 'SESSION_EXPIRED');
  }

  // Check if database is available
  if (!db) {
    console.warn("Database not available - user info disabled in development");
    return ApiResponse.error(res, 503, "Database not available. Please deploy to Heroku to test user info.", "DATABASE_UNAVAILABLE");
  }

  const user = req.user;
  return ApiResponse.success(res, {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
    lastLoginDate: user.lastLoginDate?.toISOString()
  }, "User session valid");
}));

// Login route
router.post('/login', asyncHandler(async (req, res, next) => {
  console.log("[/api/login] Attempt with:", {
    email: req.body.email,
    hasPassword: !!req.body.password
  });

  // Check if database is available
  if (!db) {
    console.warn("Database not available - login disabled in development");
    return ApiResponse.error(res, 503, "Database not available. Please deploy to Heroku to test login.", "DATABASE_UNAVAILABLE");
  }

  if (!req.body.email || !req.body.password) {
    return ApiResponse.badRequest(res, "Email and password are required", "INVALID_CREDENTIALS");
  }

  passport.authenticate('local', async (err: any, user: Express.User | false, info: { message: string }) => {
    if (err) {
      console.error("Login error:", err);
      return ApiResponse.error(res, 500, "An error occurred during login", "LOGIN_ERROR");
    }

    if (!user) {
      console.log("Login failed:", info.message);
      return ApiResponse.badRequest(res, info.message || "Invalid credentials", "INVALID_CREDENTIALS");
    }

    // Regenerate session to prevent session fixation
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

    // Login the user
    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          reject(err);
          return;
        }
        resolve();
      });
    });

    // Save the session
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

    console.log("Login successful for user:", {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      sessionID: req.sessionID
    });

    // Set cache control headers
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
      lastLoginDate: user.lastLoginDate?.toISOString()
    }, "Login successful");
  })(req, res, next);
}));

// Register route
router.post('/register', asyncHandler(async (req, res) => {
  console.log("Registration attempt:", req.body.email);

  // Check if database is available
  if (!db) {
    console.warn("Database not available - registration disabled in development");
    return ApiResponse.error(res, 503, "Database not available. Please deploy to Heroku to test registration.", "DATABASE_UNAVAILABLE");
  }

  const result = insertUserSchema.safeParse(req.body);
  if (!result.success) {
    const errors = formatZodErrors(result.error);
    return ApiResponse.validationError(res, errors, "Validation failed", "VALIDATION_ERROR");
  }

  const { email, password } = result.data;

  try {
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

    // Regenerate session to prevent session fixation
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

    // Login the user
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

    // Save the session
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
}));

// Logout route
router.post('/logout', (req, res) => {
  const wasAuthenticated = req.isAuthenticated();
  
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return ApiResponse.error(res, 500, "An error occurred during logout", "LOGOUT_ERROR");
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return ApiResponse.error(res, 500, "An error occurred during logout", "LOGOUT_ERROR");
      }
      
      res.clearCookie('sessionId');
      return ApiResponse.success(res, null, wasAuthenticated ? "Logout successful" : "No active session");
    });
  });
});

// Check authentication status
router.get('/check', (req, res) => {
  return ApiResponse.success(res, {
    isAuthenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      isAdmin: req.user!.isAdmin
    } : null
  });
});

// Schema for password reset request
const resetPasswordRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Request password reset
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const result = resetPasswordRequestSchema.safeParse(req.body);
  if (!result.success) {
    const errors = formatZodErrors(result.error);
    return ApiResponse.validationError(res, errors, "Validation failed", "VALIDATION_ERROR");
  }

  const { email } = result.data;

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always return success even if user doesn't exist (for security)
  if (!user) {
    return ApiResponse.success(res, null, "If an account exists with that email, a password reset link has been sent");
  }

  try {
    // Generate token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

    // Save token to database
    await db
      .insert(passwordResetTokens)
      .values({
        userId: user.id,
        token,
        expiresAt,
        createdAt: new Date(),
      });

    // Send email with reset link
    await sendEmail({
      to: email,
      subject: 'Password Reset',
      text: `Click this link to reset your password: ${process.env.CLIENT_URL}/reset-password?token=${token}`,
      html: `<p>Click <a href="${process.env.CLIENT_URL}/reset-password?token=${token}">here</a> to reset your password.</p>`,
    });

    return ApiResponse.success(res, null, "If an account exists with that email, a password reset link has been sent");
  } catch (error: any) {
    console.error("Error sending password reset:", error);
    return ApiResponse.error(res, 500, "Failed to send password reset email", "EMAIL_ERROR");
  }
}));

// Schema for password reset
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Reset password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) {
    const errors = formatZodErrors(result.error);
    return ApiResponse.validationError(res, errors, "Validation failed", "VALIDATION_ERROR");
  }

  const { token, password } = result.data;

  // Find valid token
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  if (!resetToken) {
    return ApiResponse.badRequest(res, "Invalid or expired token", "INVALID_TOKEN");
  }

  // Check if token is expired
  if (resetToken.expiresAt < new Date()) {
    return ApiResponse.badRequest(res, "Token has expired", "EXPIRED_TOKEN");
  }

  try {
    // Hash new password
    const hashedPassword = await crypto.hash(password);

    // Update user's password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, resetToken.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({
        usedAt: new Date()
      })
      .where(eq(passwordResetTokens.id, resetToken.id));

    return ApiResponse.success(res, null, "Password has been reset successfully");
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return ApiResponse.error(res, 500, "Failed to reset password", "RESET_ERROR");
  }
}));

export const authRoutes = router; 