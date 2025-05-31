import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { sql } from 'drizzle-orm';
import type { User } from '../types/auth';
import { errorHandler } from '../services/error-handler.service';
import { ApiResponse } from '../utils/api-response';

// Helper function to safely access usage fields with proper column names
function safeUsage(usage: any) {
  return {
    id: usage?.id || 0,
    userId: usage?.user_id || 0,
    totalArticlesGenerated: usage?.total_articles_generated || 0,
    freeArticlesUsed: usage?.free_articles_used || 0,
    creditsUsed: usage?.credits_used || 0,
    paygCredits: usage?.payg_credits || 0
  };
}

declare global {
  namespace Express {
    interface User extends Omit<SelectUser, 'emailNotifications' | 'hasSeenTour'> {
      emailNotifications: boolean;
      hasSeenTour: boolean;
    }
  }
}

interface RequestWithUser extends Omit<Request, 'user'> {
  usage?: any;
  subscription?: any;
  user?: User;
  creditInfo?: {
    availableCredits: number;
    requiredCredits: number;
    isBulkOperation: boolean;
  };
}

export const subscriptionMiddleware = {
  /**
   * Middleware to check if user has premium access
   */
  async checkPremiumAccess(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get user details including credits
      const userResult = await db.execute(sql`
        SELECT * FROM users WHERE id = ${req.user.id}
      `);

      const user = userResult.rows && userResult.rows.length > 0
        ? userResult.rows[0]
        : null;

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
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

      const subscriptionData = subResult.rows && subResult.rows.length > 0
        ? subResult.rows[0]
        : null;

      // Get or create usage record
      let usageResult = await db.execute(sql`
        SELECT * FROM user_usage WHERE user_id = ${req.user.id}
      `);

      let usage = usageResult.rows && usageResult.rows.length > 0
        ? usageResult.rows[0]
        : null;

      // Create usage record if it doesn't exist
      if (!usage) {
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
            ${user.id}, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
          )
        `);

        // Re-fetch usage after creation
        usageResult = await db.execute(sql`
          SELECT * FROM user_usage WHERE user_id = ${req.user.id}
        `);

        usage = usageResult.rows && usageResult.rows.length > 0
          ? usageResult.rows[0]
          : null;
      }

      req.usage = usage;
      req.subscription = subscriptionData;

      // Use safe usage accessor to avoid property access errors
      const safeUsageData = safeUsage(usage);

      // Allow access if user has an active subscription or has free credits remaining
      const articleCreditsRemaining = user.article_credits_remaining ?? 3;
      if (!subscriptionData && safeUsageData.freeArticlesUsed >= articleCreditsRemaining) {
        return res.status(403).json({
          error: 'Premium feature',
          message: 'This feature requires a subscription or available credits',
          requiresUpgrade: true,
          freeCreditsUsed: safeUsageData.freeArticlesUsed,
          totalFreeCredits: articleCreditsRemaining
        });
      }

      next();
    } catch (error) {
      console.error('[Subscription Middleware] Check premium access error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Middleware to check if user has available credits
   */
  async checkCredits(req: Request, res: Response, next: NextFunction) {
    try {
      // Ensure authentication
      if (!req.isAuthenticated() || !req.user) {
        return ApiResponse.unauthorized(res, 'Authentication required', 'AUTH_REQUIRED');
      }

      // Ensure session is active and update expiry
      if (req.session) {
        req.session.touch();
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Failed to save session in checkCredits middleware:', err);
              reject(err);
              return;
            }
            resolve();
          });
        });
      }

      // Get body parameters
      const { keywords } = req.body;
      const keywordCount = keywords?.length || 1;
      
      // Get subscription status
      const subscription = await getActiveSubscription(req.user.id);
      
      // Get usage data
      const usage = await getUserUsage(req.user.id);
      
      // Calculate available credits
      let availableCredits = 0;
      let isPremium = false;
      
      if (subscription) {
        // Premium user
        isPremium = true;
        availableCredits = subscription.articleLimit - usage.totalArticlesGenerated;
      } else {
        // Free user
        availableCredits = FREE_ARTICLES_LIMIT - usage.freeArticlesUsed;
      }
      
      // Store credit info in request for later use
      req.creditInfo = {
        availableCredits,
        requiredCredits: keywordCount,
        hasEnoughCredits: availableCredits >= keywordCount,
        isPremium
      };
      
      // Check if user has enough credits
      if (availableCredits < keywordCount) {
        return ApiResponse.forbidden(res, 
          `You need ${keywordCount} credits but only have ${availableCredits} available.`, 
          'INSUFFICIENT_CREDITS', {
            availableCredits,
            requiredCredits: keywordCount,
            hasEnoughCredits: false,
            isPremium
          });
      }
      
      // Proceed to next middleware/route handler
      next();
    } catch (error) {
      console.error('Credit check error:', error);
      return ApiResponse.error(res, 500, 'Failed to check credits', 'INTERNAL_ERROR');
    }
  },

  /**
   * Middleware to decrement credits and log usage
   */
  async trackUsage(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user?.id || !user.email) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { subscription } = req;

      // Get current usage with raw SQL
      const usageResult = await db.execute(sql`
        SELECT * FROM user_usage WHERE user_id = ${user.id}
      `);

      const usage = usageResult.rows && usageResult.rows.length > 0
        ? usageResult.rows[0]
        : null;

      if (!usage) {
        return res.status(500).json({ error: 'Usage record not found' });
      }

      // Use safe accessor
      const safeUsageData = safeUsage(usage);

      if (subscription) {
        // Use raw SQL to update the usage for subscribed users
        await db.execute(sql`
          UPDATE user_usage SET
            total_articles_generated = total_articles_generated + 1,
            credits_used = credits_used + 1,
            last_article_date = NOW(),
            updated_at = NOW()
          WHERE user_id = ${user.id}
        `);

        // Check if user is approaching credit limit (80% used)
        if (Number(safeUsageData.totalArticlesGenerated) + 1 >= Number(subscription.article_limit || 0) * 0.8) {
          await errorHandler.notifyUser({
            userId: user.id,
            userEmail: user.email,
            type: 'credit_limit',
            details: {
              currentUsage: Number(safeUsageData.totalArticlesGenerated) + 1,
              limit: Number(subscription.article_limit),
              remainingCredits: Number(subscription.article_limit || 0) - (Number(safeUsageData.totalArticlesGenerated) + 1)
            }
          });
        }
      } else {
        // For free tier users, track total articles and free articles used
        await db.execute(sql`
          UPDATE user_usage SET
            total_articles_generated = total_articles_generated + 1,
            free_articles_used = free_articles_used + 1,
            last_article_date = NOW(),
            updated_at = NOW()
          WHERE user_id = ${user.id}
        `);

        // Notify if free credits are running low (2 or fewer remaining)
        if (3 - (Number(safeUsageData.freeArticlesUsed) + 1) <= 2) {
          await errorHandler.notifyUser({
            userId: user.id,
            userEmail: user.email,
            type: 'credit_limit',
            details: {
              currentUsage: Number(safeUsageData.freeArticlesUsed),
              isFree: true,
              remainingCredits: 3 - Number(safeUsageData.freeArticlesUsed)
            }
          });
        }
      }

      // Log article usage with raw SQL
      await db.execute(sql`
        INSERT INTO article_usage (
          user_id,
          article_id,
          used_at,
          created_at
        ) VALUES (
          ${user.id},
          ${req.body.articleId || null},
          NOW(),
          NOW()
        )
      `);

      next();
    } catch (error) {
      console.error('[Subscription Middleware] Track usage error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Middleware to refresh monthly credits
   */
  async refreshMonthlyCredits(req: RequestWithUser, res: Response, next: NextFunction) {
    try {
      // Get all active subscriptions that need credit refresh using raw SQL
      const activeSubscriptionsResult = await db.execute(sql`
        SELECT s.*, sp.article_limit
        FROM subscriptions s
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        WHERE s.status = 'active'
        AND (s.cancel_at_period_end = false OR s.cancel_at_period_end IS NULL)
        AND s.current_period_end >= NOW()
      `);

      const activeSubscriptions = activeSubscriptionsResult.rows || [];

      // Process each subscription
      await Promise.all(
        activeSubscriptions.map(async (subscription) => {
          // Reset credits to 0 with raw SQL (using credits_used instead of articles_used)
          await db.execute(sql`
            UPDATE user_usage SET
              credits_used = 0,
              updated_at = NOW()
            WHERE user_id = ${subscription.user_id}
          `);

          // Update subscription period
          await db.execute(sql`
            UPDATE subscriptions SET
              current_period_start = ${subscription.current_period_end},
              current_period_end = ${new Date(subscription.current_period_end.getTime() + 30 * 24 * 60 * 60 * 1000)},
              updated_at = NOW()
            WHERE id = ${subscription.id}
          `);
        })
      );

      next();
    } catch (error) {
      console.error('[Subscription Middleware] Refresh credits error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};