import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import ApiResponse from '../lib/api-response';
import { db } from '../../db';
import { userUsage } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';

const router = Router();

/**
 * Sync user usage data
 * POST /api/user/sync
 */
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'SESSION_EXPIRED');
    }

    // Get user usage data
    const usageData = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, req.user.id));

    // If no usage data exists, create it
    if (usageData.length === 0) {
      await db
        .insert(userUsage)
        .values({
          userId: req.user.id,
          articlesUsed: 0,
          wordsGenerated: 0,
          keywordsGenerated: 0,
          seoAuditsRun: 0
        });

      return ApiResponse.success(res, {
        articlesUsed: 0,
        wordsGenerated: 0,
        keywordsGenerated: 0,
        seoAuditsRun: 0
      }, 'User usage data created');
    }

    // Return existing usage data
    return ApiResponse.success(res, usageData[0], 'User usage data retrieved');
  } catch (error) {
    console.error('Error syncing user usage data:', error);
    return ApiResponse.serverError(res, 'Failed to sync user usage data', 'USER_SYNC_ERROR');
  }
});

export default router;
