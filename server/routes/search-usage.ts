import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { searchUsageService } from '../services/search-usage.service';
import ApiResponse from '../lib/api-response';

const router = Router();

// Get user's search usage
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
    }

    const usage = await searchUsageService.getUserSearchUsage(req.user.id);
    
    return ApiResponse.success(res, { 
      searchesUsed: usage.searchesUsed,
      searchLimit: usage.searchLimit,
      remaining: Math.max(0, usage.searchLimit - usage.searchesUsed),
      lastResetDate: usage.lastResetDate
    }, 'Search usage retrieved successfully');
    
  } catch (error: any) {
    console.error('Error retrieving search usage:', error);
    return ApiResponse.serverError(res, error.message || 'Failed to retrieve search usage', 'USAGE_RETRIEVAL_ERROR');
  }
});

export const searchUsageRoutes = router;
