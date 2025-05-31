import { Router } from 'express';
import { db } from '@db';
import { articles, projects } from '@db/schema';
import { generateArticle } from '../services/article.service';
import type { User } from '../types/auth';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '../auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import { QueueManagerService } from '../services/queue-manager.service';
import { ApiResponse } from '../utils/api-response';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const router = Router();

// Initialize the queue manager service
const queueManager = QueueManagerService.getInstance();

// Create project and generate articles in bulk
router.post('/generate', requireAuth, subscriptionMiddleware.checkPremiumAccess, subscriptionMiddleware.checkCredits, async (req, res) => {
  try {
    // Log authentication information for debugging
    console.log('[Bulk Generator] Request authentication:', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id,
      headers: {
        cookie: req.headers.cookie ? 'Present' : 'Missing',
        origin: req.headers.origin,
        referer: req.headers.referer
      }
    });

    // Double check authentication
    if (!req.isAuthenticated() || !req.user) {
      console.error('[Bulk Generator] Authentication check failed:', {
        isAuthenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        sessionID: req.sessionID
      });
      return ApiResponse.unauthorized(res, 'Session expired. Please log in again.', 'SESSION_EXPIRED');
    }

    // Ensure session is active and update expiry
    if (req.session) {
      req.session.touch();
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('[Bulk Generator] Failed to save session:', err);
            reject(err);
            return;
          }
          resolve();
        });
      });
    }

    // Validate request body
    const { projectName, projectDescription, keywords, settings } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return ApiResponse.badRequest(res, 'Keywords array is required and must not be empty', 'INVALID_REQUEST');
    }

    // Create project
    const [project] = await db
      .insert(projects)
      .values({
        userId: req.user.id,
        name: projectName,
        description: projectDescription || '',
        status: 'pending',
        totalKeywords: keywords.length,
        completedKeywords: 0,
        settings: settings || {},
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create queue for article generation
    const queue = await queueManager.createQueue({
      userId: req.user.id,
      projectId: project.id,
      totalItems: keywords.length,
      type: 'article_generation'
    });

    // Add items to queue
    await queueManager.addItems(queue.id, keywords.map(keyword => ({
      keyword,
      settings: {
        ...settings,
        userId: req.user.id,
        projectId: project.id
      }
    })));

    // Touch session again before sending response
    if (req.session) {
      req.session.touch();
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('[Bulk Generator] Failed to save session:', err);
            reject(err);
            return;
          }
          resolve();
        });
      });
    }

    // Set cache control headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Set cookie with same settings as session
    if (req.sessionID) {
      res.cookie('sessionId', req.sessionID, {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      });
    }

    return ApiResponse.success(res, {
      project,
      queue,
      creditsAvailable: req.user.articleCreditsRemaining,
      creditsRequired: keywords.length
    }, 'Article generation queued successfully');

  } catch (error) {
    console.error('[Bulk Generator] Error:', error);
    return ApiResponse.error(res, 500, 'Failed to generate articles', 'GENERATION_ERROR');
  }
});

// Get queue status
router.get('/queue/:id', requireAuth, async (req, res) => {
  try {
    const queueId = parseInt(req.params.id);
    if (isNaN(queueId)) {
      return res.status(400).json({
        ok: false,
        message: 'Invalid queue ID'
      });
    }

    // Get queue status
    const queue = await queueManager.getQueue(queueId);
    if (!queue) {
      return res.status(404).json({
        ok: false,
        message: 'Queue not found'
      });
    }

    // Check if the queue belongs to the user
    if (queue.userId !== req.user?.id) {
      return res.status(403).json({
        ok: false,
        message: 'Unauthorized'
      });
    }

    // Get completed articles for this queue
    const completedArticles = await db.query.articles.findMany({
      where: eq(articles.projectId, queue.items?.[0]?.settings?.projectId || 0),
    });

    res.json({
      ok: true,
      queue: {
        id: queue.id,
        status: queue.status,
        progress: queue.progress,
        totalItems: queue.totalItems,
        completedItems: queue.completedItems,
        failedItems: queue.failedItems,
        createdAt: queue.createdAt,
        updatedAt: queue.updatedAt,
        completedAt: queue.completedAt
      },
      items: queue.items,
      articles: completedArticles
    });
  } catch (error: any) {
    console.error('Queue status error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to get queue status',
      details: error.message || 'Unknown error occurred'
    });
  }
});

// Get all queues for the user
router.get('/queues', requireAuth, async (req, res) => {
  try {
    // Get all queues for the user
    const queues = await queueManager.getUserQueues(req.user?.id || 0);

    res.json({
      ok: true,
      queues: queues.map(queue => ({
        id: queue.id,
        status: queue.status,
        progress: queue.progress,
        totalItems: queue.totalItems,
        completedItems: queue.completedItems,
        failedItems: queue.failedItems,
        createdAt: queue.createdAt,
        updatedAt: queue.updatedAt,
        completedAt: queue.completedAt,
        batchName: queue.batchName
      }))
    });
  } catch (error: any) {
    console.error('Get queues error:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to get queues',
      details: error.message || 'Unknown error occurred'
    });
  }
});

// Check if user has enough credits for bulk operation
router.post('/check-credits', requireAuth, async (req, res) => {
  // Log authentication information for debugging
  console.log('[Check Credits] Authentication info:', {
    isAuthenticated: req.isAuthenticated?.() || false,
    userId: req.user?.id,
    sessionID: req.sessionID,
    headers: {
      cookie: req.headers.cookie ? 'Present' : 'Missing',
      origin: req.headers.origin,
      referer: req.headers.referer
    }
  });
  // Force JSON response type
  res.type('json');

  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { keywordCount } = req.body;

    // Validate input
    if (!keywordCount || typeof keywordCount !== 'number' || keywordCount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid keyword count is required'
      });
    }

    // Get subscription with plan details
    const subResult = await db.execute(sql`
      SELECT s.*, p.article_limit
      FROM subscriptions s
      LEFT JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = ${req.user.id}
      AND s.status = 'active'
      AND (s.cancel_at_period_end = false OR s.cancel_at_period_end IS NULL)
    `);

    const subscription = subResult.rows && subResult.rows.length > 0
      ? subResult.rows[0]
      : null;

    // Get usage with raw SQL to bypass column name issues
    const usageResult = await db.execute(sql`
      SELECT * FROM user_usage WHERE user_id = ${req.user.id}
    `);

    let usage = usageResult.rows && usageResult.rows.length > 0
      ? usageResult.rows[0]
      : null;

    if (!usage) {
      // Create initial usage record using raw SQL
      await db.execute(sql`
        INSERT INTO user_usage (
          user_id,
          total_articles_generated,
          free_articles_used,
          free_keyword_reports_used,
          total_keywords_analyzed,
          total_word_count,
          credits_used,
          payg_credits,
          created_at,
          updated_at
        ) VALUES (
          ${req.user.id}, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
        )
      `);

      // Re-fetch usage after creation
      const newUsageResult = await db.execute(sql`
        SELECT * FROM user_usage WHERE user_id = ${req.user.id}
      `);

      usage = newUsageResult.rows && newUsageResult.rows.length > 0
        ? newUsageResult.rows[0]
        : null;
    }

    // Calculate available credits
    const totalArticlesGenerated = usage?.total_articles_generated || 0;
    const freeArticlesUsed = usage?.free_articles_used || 0;

    const availableCredits = subscription
      ? Number(subscription.article_limit || 0) - Number(totalArticlesGenerated)
      : 3 - Number(freeArticlesUsed);

    // Return credit information
    res.json({
      success: true,
      availableCredits,
      requiredCredits: keywordCount,
      hasEnoughCredits: availableCredits >= keywordCount,
      isPremium: !!subscription
    });
  } catch (error: any) {
    console.error('Credit check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check credits',
      details: error.message || 'Unknown error occurred'
    });
  }
});

export default router;