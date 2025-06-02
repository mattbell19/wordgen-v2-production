import { Router } from 'express';
import { db } from '@db';
import { articles, keywordLists, savedKeywords, userUsage } from '@db/schema';
import { requireAuth } from '../middleware/authMiddleware';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import ApiResponse from '../lib/api-response';
import type { Request, Response } from 'express';

const router = Router();

/**
 * Get article generation analytics for dashboard charts
 */
router.get('/articles', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const userId = req.user.id;
    console.log(`[Dashboard Analytics] Getting article analytics for user ${userId}`);

    // Get articles from the last 12 months grouped by month
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyArticles = await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${articles.createdAt})`,
        count: sql<number>`COUNT(*)::int`,
        totalWords: sql<number>`COALESCE(SUM(${articles.wordCount}), 0)::int`
      })
      .from(articles)
      .where(
        and(
          eq(articles.userId, userId),
          gte(articles.createdAt, twelveMonthsAgo)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${articles.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${articles.createdAt})`);

    // Fill in missing months with zero values
    const chartData = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM format
      
      const existingData = monthlyArticles.find(item => 
        item.month && item.month.startsWith(monthKey)
      );

      chartData.push({
        name: date.toLocaleDateString('en-US', { month: 'short' }),
        articles: existingData?.count || 0,
        words: existingData?.totalWords || 0,
        date: monthKey
      });
    }

    // Get total stats
    const totalStats = await db
      .select({
        totalArticles: sql<number>`COUNT(*)::int`,
        totalWords: sql<number>`COALESCE(SUM(${articles.wordCount}), 0)::int`
      })
      .from(articles)
      .where(eq(articles.userId, userId));

    const stats = totalStats[0] || { totalArticles: 0, totalWords: 0 };

    return ApiResponse.success(res, {
      chartData,
      totalArticles: stats.totalArticles,
      totalWords: stats.totalWords,
      hasData: stats.totalArticles > 0
    });

  } catch (error) {
    console.error('[Dashboard Analytics] Error getting article analytics:', error);
    return ApiResponse.serverError(res, 'Failed to get article analytics', 'DATABASE_ERROR');
  }
});

/**
 * Get keyword research analytics for dashboard charts
 */
router.get('/keywords', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const userId = req.user.id;
    console.log(`[Dashboard Analytics] Getting keyword analytics for user ${userId}`);

    // Get keyword lists from the last 12 months grouped by month
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyKeywordLists = await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${keywordLists.createdAt})`,
        count: sql<number>`COUNT(*)::int`
      })
      .from(keywordLists)
      .where(
        and(
          eq(keywordLists.userId, userId),
          gte(keywordLists.createdAt, twelveMonthsAgo)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${keywordLists.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${keywordLists.createdAt})`);

    // Get saved keywords count by month
    const monthlySavedKeywords = await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${savedKeywords.createdAt})`,
        count: sql<number>`COUNT(*)::int`
      })
      .from(savedKeywords)
      .where(
        and(
          eq(savedKeywords.userId, userId),
          gte(savedKeywords.createdAt, twelveMonthsAgo)
        )
      )
      .groupBy(sql`DATE_TRUNC('month', ${savedKeywords.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${savedKeywords.createdAt})`);

    // Fill in missing months with zero values
    const chartData = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM format
      
      const existingLists = monthlyKeywordLists.find(item => 
        item.month && item.month.startsWith(monthKey)
      );

      const existingKeywords = monthlySavedKeywords.find(item => 
        item.month && item.month.startsWith(monthKey)
      );

      chartData.push({
        name: date.toLocaleDateString('en-US', { month: 'short' }),
        keywords: existingLists?.count || 0,
        searches: existingKeywords?.count || 0,
        date: monthKey
      });
    }

    // Get total stats
    const totalKeywordLists = await db
      .select({
        count: sql<number>`COUNT(*)::int`
      })
      .from(keywordLists)
      .where(eq(keywordLists.userId, userId));

    const totalSavedKeywords = await db
      .select({
        count: sql<number>`COUNT(*)::int`
      })
      .from(savedKeywords)
      .where(eq(savedKeywords.userId, userId));

    const totalLists = totalKeywordLists[0]?.count || 0;
    const totalKeywords = totalSavedKeywords[0]?.count || 0;

    return ApiResponse.success(res, {
      chartData,
      totalKeywordLists: totalLists,
      totalSavedKeywords: totalKeywords,
      hasData: totalLists > 0 || totalKeywords > 0
    });

  } catch (error) {
    console.error('[Dashboard Analytics] Error getting keyword analytics:', error);
    return ApiResponse.serverError(res, 'Failed to get keyword analytics', 'DATABASE_ERROR');
  }
});

/**
 * Get recent activity for dashboard
 */
router.get('/recent-activity', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const userId = req.user.id;

    // Get recent articles
    const recentArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        createdAt: articles.createdAt,
        wordCount: articles.wordCount,
        type: sql<string>`'article'`
      })
      .from(articles)
      .where(eq(articles.userId, userId))
      .orderBy(desc(articles.createdAt))
      .limit(5);

    // Get recent keyword lists
    const recentKeywordLists = await db
      .select({
        id: keywordLists.id,
        title: keywordLists.name,
        createdAt: keywordLists.createdAt,
        wordCount: sql<number>`NULL`,
        type: sql<string>`'keyword_list'`
      })
      .from(keywordLists)
      .where(eq(keywordLists.userId, userId))
      .orderBy(desc(keywordLists.createdAt))
      .limit(5);

    // Combine and sort by date
    const allActivity = [...recentArticles, ...recentKeywordLists]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return ApiResponse.success(res, {
      recentActivity: allActivity.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString()
      }))
    });

  } catch (error) {
    console.error('[Dashboard Analytics] Error getting recent activity:', error);
    return ApiResponse.serverError(res, 'Failed to get recent activity', 'DATABASE_ERROR');
  }
});

/**
 * Get dashboard summary stats
 */
router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    const userId = req.user.id;

    // Get user usage data
    const [usage] = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, userId));

    // Get counts from actual tables
    const [articleCount] = await db
      .select({
        count: sql<number>`COUNT(*)::int`
      })
      .from(articles)
      .where(eq(articles.userId, userId));

    const [keywordListCount] = await db
      .select({
        count: sql<number>`COUNT(*)::int`
      })
      .from(keywordLists)
      .where(eq(keywordLists.userId, userId));

    const [savedKeywordCount] = await db
      .select({
        count: sql<number>`COUNT(*)::int`
      })
      .from(savedKeywords)
      .where(eq(savedKeywords.userId, userId));

    return ApiResponse.success(res, {
      totalArticles: articleCount?.count || 0,
      totalKeywordLists: keywordListCount?.count || 0,
      totalSavedKeywords: savedKeywordCount?.count || 0,
      totalWordCount: usage?.totalWordCount || 0,
      lastArticleDate: usage?.lastArticleDate,
      lastKeywordDate: usage?.lastKeywordDate
    });

  } catch (error) {
    console.error('[Dashboard Analytics] Error getting summary stats:', error);
    return ApiResponse.serverError(res, 'Failed to get summary stats', 'DATABASE_ERROR');
  }
});

export default router;
