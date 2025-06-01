import { Router } from "express";
import { db, pingDb } from "../../db";
import { articles, userUsage } from "@db/schema";
import { requireAuth } from "../auth";
import type { Request, Response } from "express";
import { eq, desc, and, inArray } from "drizzle-orm";
import type { ArticleSettings } from "@/lib/types";
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import ApiResponse from '../lib/api-response';
import { getUserIdsForContext, getActiveContext } from '../utils/team-context';

const expressRouter = Router();

// Get all articles for the current user or team
expressRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, "Authentication required", "UNAUTHORIZED");
    }

    // Get user IDs for the current context (personal or team)
    const userIds = await getUserIdsForContext(req);
    console.log('Fetching articles for context:', { userIds });

    const userArticles = await db
      .select()
      .from(articles)
      .where(inArray(articles.userId, userIds))
      .orderBy(desc(articles.createdAt));

    console.log('Found articles:', userArticles.length);

    // Ensure we're sending JSON
    res.setHeader('Content-Type', 'application/json');
    return ApiResponse.success(res, userArticles, 'Articles retrieved successfully');

  } catch (error) {
    console.error("Error fetching articles:", error);
    res.setHeader('Content-Type', 'application/json');
    return ApiResponse.serverError(
      res,
      "Failed to fetch articles",
      "DATABASE_ERROR",
      { details: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

// Create a new article
expressRouter.post(
  "/",
  requireAuth,
  async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.unauthorized(res, "Authentication required", "UNAUTHORIZED");
    }

    // Get active context (personal or team)
    const { teamId } = await getActiveContext(req);

    // Check user's credits
    let userUsageRecord = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, userId))
      .then(records => records[0]);

    // Create usage record if it doesn't exist
    if (!userUsageRecord) {
      userUsageRecord = await db
        .insert(userUsage)
        .values({
          userId,
          totalArticlesGenerated: 0,
          freeArticlesUsed: 0,
          lastArticleDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning()
        .then(records => records[0]);
    }

    // Check if user has free credits remaining (skip for team context)
    if (!teamId && userUsageRecord.freeArticlesUsed >= 3) {
      return ApiResponse.forbidden(
        res,
        'You have used all your free credits. Please upgrade to continue generating articles',
        'PREMIUM_FEATURE_REQUIRED',
        { requiresUpgrade: true }
      );
    }

    const { title, content, settings, primaryKeyword } = req.body;

    if (!content) {
      return ApiResponse.badRequest(res, "Content is required", "MISSING_CONTENT");
    }

    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute reading speed

    // Start a transaction to ensure data consistency
    const [article] = await db.transaction(async (tx) => {
      // Create the article
      const [newArticle] = await tx
        .insert(articles)
        .values({
          title: title || primaryKeyword || 'Untitled Article',
          content,
          wordCount,
          readingTime,
          creditsUsed: 1, // Default to 1 credit per article
          userId, // Always use the current user's ID as the creator
          settings: settings as ArticleSettings,
          primaryKeyword: primaryKeyword || null,
          status: 'completed',
          projectId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Update usage record - only increment totalArticlesGenerated here
      // freeArticlesUsed will be handled by the usage middleware
      await tx
        .update(userUsage)
        .set({
          totalArticlesGenerated: userUsageRecord.totalArticlesGenerated + 1,
          lastArticleDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userUsage.userId, userId));

      return [newArticle];
    });

    return ApiResponse.created(res, article, 'Article created successfully');

  } catch (err) {
    const error = err as Error;
    console.error("Error creating article:", error);
    return ApiResponse.serverError(
      res,
      "Failed to create article",
      "DATABASE_ERROR",
      { details: error.message || 'Unknown error' }
    );
  }
});

// Get a single article
expressRouter.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, "Authentication required", "UNAUTHORIZED");
    }

    const articleId = parseInt(req.params.id);

    if (isNaN(articleId)) {
      return ApiResponse.badRequest(res, "Invalid article ID", "INVALID_ID");
    }

    // Get user IDs for the current context (personal or team)
    const userIds = await getUserIdsForContext(req);

    const article = await db
      .select()
      .from(articles)
      .where(and(
        eq(articles.id, articleId),
        inArray(articles.userId, userIds)
      ))
      .limit(1);

    if (!article.length) {
      return ApiResponse.notFound(res, "Article not found or you don't have access to it", "ARTICLE_NOT_FOUND");
    }

    return ApiResponse.success(res, article[0], "Article retrieved successfully");

  } catch (error) {
    console.error("Error fetching article:", error);
    return ApiResponse.serverError(
      res,
      "Failed to fetch article",
      "DATABASE_ERROR",
      { details: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

// Update an article
expressRouter.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, "Authentication required", "UNAUTHORIZED");
    }

    const articleId = parseInt(req.params.id);
    if (isNaN(articleId)) {
      return ApiResponse.badRequest(res, "Invalid article ID", "INVALID_ID");
    }

    const { content } = req.body;
    if (!content) {
      return ApiResponse.badRequest(res, "Content is required", "MISSING_CONTENT");
    }

    // Get user IDs for the current context (personal or team)
    const userIds = await getUserIdsForContext(req);

    // Verify article exists and belongs to user or team
    const existingArticle = await db
      .select()
      .from(articles)
      .where(and(
        eq(articles.id, articleId),
        inArray(articles.userId, userIds)
      ))
      .limit(1);

    if (!existingArticle.length) {
      console.log(`Article not found: ID ${articleId} for context ${userIds.join(', ')}`);
      return ApiResponse.notFound(
        res,
        "The article you're trying to update cannot be found or you don't have permission to edit it.",
        "ARTICLE_NOT_FOUND"
      );
    }

    // Calculate new word count and reading time
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Update the article
    const [updatedArticle] = await db
      .update(articles)
      .set({
        content,
        wordCount,
        readingTime,
        updatedAt: new Date()
      })
      .where(eq(articles.id, articleId))
      .returning();

    return ApiResponse.success(res, updatedArticle, "Article updated successfully");

  } catch (error) {
    console.error("Error updating article:", error);
    return ApiResponse.serverError(
      res,
      "Failed to update article",
      "DATABASE_ERROR",
      { details: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

// Export the Express router
export const articleRoutes = expressRouter;

// Export the tRPC router
export const articlesRouter = router({
  getRecent: protectedProcedure.query(async ({ ctx }) => {
    console.log('[TRPC] Fetching recent articles for user:', ctx.user.id);

    try {
      // Test the connection first with detailed logging
      console.log('[TRPC] Testing database connection...');
      const isConnected = await pingDb();
      console.log('[TRPC] Database connection test result:', isConnected);

      if (!isConnected) {
        console.error('[TRPC] Database connection test failed');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection error. Please try again.',
        });
      }

      // Get user IDs for the current context (personal or team)
      const userIds = await getUserIdsForContext(ctx.req);
      console.log('[TRPC] Querying recent articles for context:', { userIds });

      const recentArticles = await db
        .select({
          id: articles.id,
          title: articles.title,
          createdAt: articles.createdAt,
          wordCount: articles.wordCount,
        })
        .from(articles)
        .where(inArray(articles.userId, userIds))
        .orderBy(desc(articles.createdAt))
        .limit(5);

      console.log('[TRPC] Found recent articles:', recentArticles.length);

      return recentArticles.map(article => ({
        ...article,
        createdAt: article.createdAt.toISOString(),
      }));
    } catch (error) {
      console.error('[TRPC] Error in getRecent:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch recent articles',
      });
    }
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get user IDs for the current context (personal or team)
      const userIds = await getUserIdsForContext(ctx.req);

      const userArticles = await db
        .select()
        .from(articles)
        .where(inArray(articles.userId, userIds))
        .orderBy(desc(articles.createdAt));

      return userArticles.map(article => ({
        ...article,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error('[TRPC] Error in list:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch articles',
      });
    }
  })
});