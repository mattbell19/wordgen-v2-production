import { Router } from 'express';
import { db } from '@db';
import { articles, userUsage } from '@db/schema';
import { requireAuth } from '../middleware/authMiddleware';
import { count, eq, sum } from 'drizzle-orm';
import ApiResponse from '../lib/api-response';
import type { Request, Response } from 'express';

const router = Router();

/**
 * Synchronize user usage data with actual database counts
 * This ensures the dashboard shows accurate statistics
 */
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const userId = req.user.id;
    console.log(`[Usage Sync] Syncing usage data for user ${userId}`);

    // Get article counts and total word count
    const articleStats = await db
      .select({
        totalArticles: count(),
        totalWordCount: sum(articles.wordCount)
      })
      .from(articles)
      .where(eq(articles.userId, userId));

    const totalArticles = articleStats[0]?.totalArticles || 0;
    const totalWordCount = articleStats[0]?.totalWordCount || 0;

    // Get the most recent article date
    const recentArticles = await db
      .select({
        createdAt: articles.createdAt
      })
      .from(articles)
      .where(eq(articles.userId, userId))
      .orderBy(articles.createdAt, 'desc')
      .limit(1);

    const lastArticleDate = recentArticles[0]?.createdAt || null;

    // Update or create usage record
    let [usage] = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, userId));

    if (usage) {
      // Update existing record
      [usage] = await db
        .update(userUsage)
        .set({
          totalArticlesGenerated: totalArticles,
          totalWordCount: totalWordCount,
          lastArticleDate: lastArticleDate,
          updatedAt: new Date()
        })
        .where(eq(userUsage.userId, userId))
        .returning();
    } else {
      // Create new record
      [usage] = await db
        .insert(userUsage)
        .values({
          userId: userId,
          totalArticlesGenerated: totalArticles,
          freeArticlesUsed: Math.min(totalArticles, 3), // Assume up to 3 free articles used
          totalKeywordsAnalyzed: 0,
          totalWordCount: totalWordCount,
          lastArticleDate: lastArticleDate,
          lastKeywordDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
    }

    return ApiResponse.success(res, usage, 'Usage data synchronized successfully');
  } catch (error) {
    console.error('[Usage Sync] Error:', error);
    return ApiResponse.error(res, 500, 'Failed to synchronize usage data', 'SYNC_ERROR');
  }
});

export default router;
