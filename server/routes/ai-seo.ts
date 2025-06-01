import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import ApiResponse from '../lib/api-response';
import { aiSeoService } from '../services/ai-seo.service';
import type { User } from '../types/auth';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const router = Router();

/**
 * Generate SEO-optimized article using AI agents
 */
router.post('/generate-article',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
      }

      const {
        keywords,
        siteUrl,
        targetWordCount = 3000,
        tone = 'professional',
        industry = 'other',
        includeInternalLinks = true,
        includeExternalLinks = true,
        customInstructions
      } = req.body;

      // Validate required fields
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return ApiResponse.badRequest(res, 'Keywords are required', 'MISSING_KEYWORDS');
      }

      console.log('[AI SEO] Starting article generation for user:', req.user.id, 'keywords:', keywords);

      try {
        // Call AI SEO Agent Service
        const result = await aiSeoService.generateArticle({
          keywords,
          siteUrl,
          targetWordCount,
          tone,
          industry,
          userId: req.user.id,
          includeInternalLinks,
          includeExternalLinks,
          customInstructions
        });

        console.log('[AI SEO] Article generation completed:', {
          taskId: result.taskId,
          status: result.status
        });

        return ApiResponse.success(res, result, 'AI SEO article generation started');

      } catch (error: any) {
        console.error('[AI SEO] Generation error:', {
          message: error.message,
          stack: error.stack,
          userId: req.user.id,
          keywords
        });

        // Handle specific service errors
        if (error.status === 503) {
          return ApiResponse.serverError(res, 'AI SEO service is temporarily unavailable. Please try again later.', 'SERVICE_UNAVAILABLE');
        }

        if (error.status === 429) {
          return ApiResponse.tooManyRequests(res, 'Too many requests. Please try again later.', 'RATE_LIMIT_EXCEEDED');
        }

        return ApiResponse.serverError(res, 'Failed to generate AI SEO article. Please try again.', 'GENERATION_FAILED');
      }

    } catch (error: any) {
      console.error('[AI SEO] Request error:', error);
      return ApiResponse.serverError(res, error.message || 'An unexpected error occurred', 'REQUEST_PROCESSING_ERROR');
    }
  }
);

/**
 * Get task status
 */
router.get('/task/:taskId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
      }

      const { taskId } = req.params;

      if (!taskId) {
        return ApiResponse.badRequest(res, 'Task ID is required', 'MISSING_TASK_ID');
      }

      try {
        const taskStatus = await aiSeoService.getTaskStatus(taskId);

        return ApiResponse.success(res, taskStatus, 'Task status retrieved');

      } catch (error: any) {
        console.error('[AI SEO] Task status error:', error);

        if (error.status === 404) {
          return ApiResponse.notFound(res, 'Task not found', 'TASK_NOT_FOUND');
        }

        return ApiResponse.serverError(res, 'Failed to get task status', 'TASK_STATUS_ERROR');
      }

    } catch (error: any) {
      console.error('[AI SEO] Task status request error:', error);
      return ApiResponse.serverError(res, error.message || 'An unexpected error occurred', 'REQUEST_PROCESSING_ERROR');
    }
  }
);

/**
 * Cancel task
 */
router.delete('/task/:taskId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
      }

      const { taskId } = req.params;

      if (!taskId) {
        return ApiResponse.badRequest(res, 'Task ID is required', 'MISSING_TASK_ID');
      }

      try {
        await aiSeoService.cancelTask(taskId);

        return ApiResponse.success(res, { taskId }, 'Task cancelled successfully');

      } catch (error: any) {
        console.error('[AI SEO] Task cancellation error:', error);

        if (error.status === 404) {
          return ApiResponse.notFound(res, 'Task not found', 'TASK_NOT_FOUND');
        }

        if (error.status === 400) {
          return ApiResponse.badRequest(res, 'Cannot cancel completed or failed task', 'TASK_NOT_CANCELLABLE');
        }

        return ApiResponse.serverError(res, 'Failed to cancel task', 'TASK_CANCELLATION_ERROR');
      }

    } catch (error: any) {
      console.error('[AI SEO] Task cancellation request error:', error);
      return ApiResponse.serverError(res, error.message || 'An unexpected error occurred', 'REQUEST_PROCESSING_ERROR');
    }
  }
);

/**
 * Get user's AI SEO tasks
 */
router.get('/tasks',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
      }

      const limit = parseInt(req.query.limit as string) || 10;

      try {
        const tasks = await aiSeoService.getUserTasks(req.user.id, limit);

        return ApiResponse.success(res, tasks, 'User tasks retrieved');

      } catch (error: any) {
        console.error('[AI SEO] Get user tasks error:', error);
        return ApiResponse.serverError(res, 'Failed to get user tasks', 'GET_TASKS_ERROR');
      }

    } catch (error: any) {
      console.error('[AI SEO] Get user tasks request error:', error);
      return ApiResponse.serverError(res, error.message || 'An unexpected error occurred', 'REQUEST_PROCESSING_ERROR');
    }
  }
);

/**
 * Test AI SEO agents (development only)
 */
router.post('/test-agents',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponse.unauthorized(res, 'Authentication required', 'UNAUTHORIZED');
      }

      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return ApiResponse.forbidden(res, 'Test endpoint not available in production', 'PRODUCTION_RESTRICTED');
      }

      const {
        keywords,
        siteUrl,
        targetWordCount = 1000,
        tone = 'professional',
        industry = 'other'
      } = req.body;

      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return ApiResponse.badRequest(res, 'Keywords are required', 'MISSING_KEYWORDS');
      }

      try {
        const testResult = await aiSeoService.testAgents({
          keywords,
          siteUrl,
          targetWordCount,
          tone,
          industry,
          userId: req.user.id,
          includeInternalLinks: true,
          includeExternalLinks: true
        });

        return ApiResponse.success(res, testResult, 'Agent test completed');

      } catch (error: any) {
        console.error('[AI SEO] Agent test error:', error);
        return ApiResponse.serverError(res, 'Agent test failed', 'AGENT_TEST_ERROR');
      }

    } catch (error: any) {
      console.error('[AI SEO] Agent test request error:', error);
      return ApiResponse.serverError(res, error.message || 'An unexpected error occurred', 'REQUEST_PROCESSING_ERROR');
    }
  }
);

export const aiSeoRoutes = router;
