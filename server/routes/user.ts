import express from 'express';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { db } from '@db';
import { users, userUsage, articles } from '@db/schema';
import { requireAuth, asyncHandler } from '../middleware/authMiddleware';
import { eq, desc, sql } from 'drizzle-orm';
import ApiResponse from '../lib/api-response';
import { ResourceNotFoundError } from '../lib/error-handler';

// tRPC Router
export const userRouter = router({
  profile: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        subscriptionTier: users.subscriptionTier,
        articleCreditsRemaining: users.articleCreditsRemaining,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.id, ctx.user.id));

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }),

  usage: protectedProcedure.query(async ({ ctx }) => {
    let [usage] = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, ctx.user.id));

    if (!usage) {
      [usage] = await db
        .insert(userUsage)
        .values({
          userId: ctx.user.id,
          totalArticlesGenerated: 0,
          freeArticlesUsed: 0,
          totalKeywordsAnalyzed: 0,
          totalWordCount: 0,
          lastArticleDate: null,
          lastKeywordDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
    }

    return usage;
  }),

  recentArticles: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        id: articles.id,
        title: articles.title,
        createdAt: articles.createdAt,
        wordCount: articles.wordCount
      })
      .from(articles)
      .where(eq(articles.userId, ctx.user.id))
      .orderBy(desc(articles.createdAt))
      .limit(5);
  })
});

// Express Router (with improved error handling)
const expressRouter = express.Router();

// Get user profile (both /api/user and /api/user/profile)
expressRouter.get(['/', '/profile'], requireAuth, asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isAdmin: users.isAdmin,
      subscriptionTier: users.subscriptionTier,
      articleCreditsRemaining: users.articleCreditsRemaining,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(eq(users.id, req.user.id));

  if (!user) {
    return ApiResponse.notFound(res, 'User not found', 'USER_NOT_FOUND');
  }

  return ApiResponse.success(res, user);
}));

// Get user usage stats
expressRouter.get('/usage', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
  }

  try {
    let [usage] = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, req.user.id));

    if (!usage) {
      // Create a usage record if it doesn't exist
      [usage] = await db
        .insert(userUsage)
        .values({
          userId: req.user.id,
          totalArticlesGenerated: 0,
          freeArticlesUsed: 0,
          totalKeywordsAnalyzed: 0,
          totalWordCount: 0,
          lastArticleDate: null,
          lastKeywordDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
    }

    return ApiResponse.success(res, usage);
  } catch (error: any) {
    console.error('Error fetching or creating user usage:', error);

    // Provide fallback data if database fails
    return ApiResponse.success(res, {
      id: 0,
      userId: req.user.id,
      totalArticlesGenerated: 0,
      freeArticlesUsed: 0,
      freeKeywordReportsUsed: 0,
      totalKeywordsAnalyzed: 0,
      totalWordCount: 0,
      articlesUsed: 0,
      creditsUsed: 0,
      paygCredits: 0,
      lastArticleDate: null,
      lastKeywordDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}));

// Get recent articles
expressRouter.get('/recent-articles', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
  }

  const recentArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      createdAt: articles.createdAt,
      wordCount: articles.wordCount
    })
    .from(articles)
    .where(eq(articles.userId, req.user.id))
    .orderBy(desc(articles.createdAt))
    .limit(5);

  return ApiResponse.success(res, recentArticles);
}));

// Sync user usage data
expressRouter.post('/sync', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
  }

  try {
    // Get the latest usage data from various sources
    const [currentUsage] = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, req.user.id));

    if (!currentUsage) {
      // Create a usage record if it doesn't exist
      const [newUsage] = await db
        .insert(userUsage)
        .values({
          userId: req.user.id,
          totalArticlesGenerated: 0,
          freeArticlesUsed: 0,
          totalKeywordsAnalyzed: 0,
          totalWordCount: 0,
          lastArticleDate: null,
          lastKeywordDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return ApiResponse.success(res, newUsage, 'Usage data initialized');
    }

    // Count articles
    const [articleStats] = await db
      .select({
        count: sql`count(${articles.id})`,
        totalWords: sql`sum(${articles.wordCount})`
      })
      .from(articles)
      .where(eq(articles.userId, req.user.id));

    // Get the most recent article date
    const [latestArticle] = await db
      .select({ createdAt: articles.createdAt })
      .from(articles)
      .where(eq(articles.userId, req.user.id))
      .orderBy(desc(articles.createdAt))
      .limit(1);

    // Update the usage record with the latest data
    const [updatedUsage] = await db
      .update(userUsage)
      .set({
        totalArticlesGenerated: articleStats?.count ? Number(articleStats.count) : 0,
        totalWordCount: articleStats?.totalWords ? Number(articleStats.totalWords) : 0,
        lastArticleDate: latestArticle?.createdAt || null,
        updatedAt: new Date()
      })
      .where(eq(userUsage.userId, req.user.id))
      .returning();

    return ApiResponse.success(res, updatedUsage, 'Usage data synced successfully');
  } catch (error: any) {
    console.error('Error syncing user usage data:', error);
    return ApiResponse.error(res, 500, 'Failed to sync usage data', 'SYNC_ERROR');
  }
}));

// Update user profile
expressRouter.put('/profile', requireAuth, asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
  }

  const { name, email } = req.body;
  const updateData: Record<string, any> = {};

  // Only update fields that were provided
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) {
    // Check if email is already in use by another user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser && existingUser.id !== req.user.id) {
      return ApiResponse.badRequest(res, 'Email is already in use', 'EMAIL_EXISTS');
    }

    updateData.email = email;
  }

  if (Object.keys(updateData).length === 0) {
    return ApiResponse.badRequest(res, 'No valid fields to update', 'INVALID_UPDATE');
  }

  // Always update the updatedAt timestamp
  updateData.updatedAt = new Date();

  try {
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, req.user.id))
      .returning();

    if (!updatedUser) {
      return ApiResponse.notFound(res, 'User not found', 'USER_NOT_FOUND');
    }

    return ApiResponse.success(res, {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      isAdmin: updatedUser.isAdmin,
      createdAt: updatedUser.createdAt?.toISOString(),
      updatedAt: updatedUser.updatedAt?.toISOString()
    }, 'Profile updated successfully');
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return ApiResponse.error(res, 500, 'Failed to update profile', 'UPDATE_ERROR');
  }
}));

export const userRoutes = expressRouter;