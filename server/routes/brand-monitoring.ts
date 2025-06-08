import express, { Request, Response } from 'express';
import { requireAuth, requireAdmin, asyncHandler, apiRateLimiter } from '../middleware/authMiddleware';
import { checkTeamPermission } from '../middleware/check-team-permission';
import ApiResponse from '../lib/api-response';
import { logger } from '../lib/logger';
import { llmMonitoringService } from '../services/llm-monitoring.service';
import { enhancedMentionAnalysisService } from '../services/enhanced-mention-analysis.service';
import { brandRecommendationService } from '../services/brand-recommendation.service';
import { aiQueryGeneratorService } from '../services/ai-query-generator.service';
import { monitoringSchedulerService } from '../services/monitoring-scheduler.service';
import { z } from 'zod';

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// Validation schemas
const createBrandSchema = z.object({
  brandName: z.string().min(1).max(100, 'Brand name must be 100 characters or less'),
  description: z.string().optional(),
  trackingQueries: z.array(z.string()).min(1, 'At least one tracking query is required').max(50, 'Maximum 50 queries allowed'),
  competitors: z.array(z.string()).max(20, 'Maximum 20 competitors allowed').optional(),
  monitoringFrequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
  teamId: z.number().optional()
});

const updateBrandSchema = z.object({
  brandName: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  trackingQueries: z.array(z.string()).max(50).optional(),
  competitors: z.array(z.string()).max(20).optional(),
  monitoringFrequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
  isActive: z.boolean().optional()
});

const queryGenerationSchema = z.object({
  brandName: z.string().min(1).max(100),
  industry: z.string().optional(),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
  keyProducts: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  count: z.number().min(1).max(50).default(10)
});

const analysisRequestSchema = z.object({
  timeframe: z.object({
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str))
  }),
  analysisDepth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed')
});

const mentionFiltersSchema = z.object({
  platform: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

const jobQueueSchema = z.object({
  jobType: z.enum(['brand_scan', 'query_analysis', 'trend_analysis', 'recommendation_sync', 'competitive_scan', 'health_check']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduledAt: z.string().transform((str) => new Date(str)).optional(),
  config: z.record(z.any()).default({})
});

/**
 * Helper function to validate request body
 */
function validateRequest<T>(schema: z.ZodSchema<T>, data: any): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Invalid request data' };
  }
}

// ==================== BRAND MONITORING CRUD ROUTES ====================

/**
 * GET /api/brand-monitoring
 * Get all brand monitoring configurations for the authenticated user
 */
router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const teamId = req.user!.activeTeamId;

    logger.info(`[BrandMonitoringAPI] Getting brand configurations for user: ${userId}`);

    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId, teamId);

    return ApiResponse.success(res, {
      brands,
      total: brands.length
    }, 'Brand monitoring configurations retrieved successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error getting brand configurations:', error);
    return ApiResponse.error(res, 500, 'Failed to retrieve brand configurations', 'FETCH_ERROR');
  }
}));

/**
 * POST /api/brand-monitoring
 * Create a new brand monitoring configuration
 */
router.post('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const activeTeamId = req.user!.activeTeamId;

    const validation = validateRequest(createBrandSchema, req.body);
    if (!validation.success) {
      return ApiResponse.badRequest(res, validation.error, 'VALIDATION_ERROR');
    }

    const { teamId, ...brandData } = validation.data;
    const finalTeamId = teamId || activeTeamId;

    logger.info(`[BrandMonitoringAPI] Creating brand monitoring for: ${brandData.brandName}`);

    const brand = await llmMonitoringService.createBrandMonitoring({
      ...brandData,
      userId,
      teamId: finalTeamId,
      settings: {}
    });

    // Schedule initial jobs
    await monitoringSchedulerService.scheduleBrandJobs(brand);

    return ApiResponse.success(res, brand, 'Brand monitoring configuration created successfully', 201);

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error creating brand monitoring:', error);
    return ApiResponse.error(res, 500, 'Failed to create brand monitoring configuration', 'CREATE_ERROR');
  }
}));

/**
 * GET /api/brand-monitoring/:id
 * Get a specific brand monitoring configuration
 */
router.get('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const brandId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(brandId)) {
      return ApiResponse.badRequest(res, 'Invalid brand ID', 'INVALID_ID');
    }

    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    const brand = brands.find(b => b.id === brandId);

    if (!brand) {
      return ApiResponse.notFound(res, 'Brand monitoring configuration not found', 'BRAND_NOT_FOUND');
    }

    return ApiResponse.success(res, brand, 'Brand monitoring configuration retrieved successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error getting brand configuration:', error);
    return ApiResponse.error(res, 500, 'Failed to retrieve brand configuration', 'FETCH_ERROR');
  }
}));

/**
 * PUT /api/brand-monitoring/:id
 * Update a brand monitoring configuration
 */
router.put('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const brandId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(brandId)) {
      return ApiResponse.badRequest(res, 'Invalid brand ID', 'INVALID_ID');
    }

    const validation = validateRequest(updateBrandSchema, req.body);
    if (!validation.success) {
      return ApiResponse.badRequest(res, validation.error, 'VALIDATION_ERROR');
    }

    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    if (!brands.find(b => b.id === brandId)) {
      return ApiResponse.notFound(res, 'Brand monitoring configuration not found', 'BRAND_NOT_FOUND');
    }

    logger.info(`[BrandMonitoringAPI] Updating brand monitoring: ${brandId}`);

    const updatedBrand = await llmMonitoringService.updateBrandMonitoring(brandId, validation.data);

    return ApiResponse.success(res, updatedBrand, 'Brand monitoring configuration updated successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error updating brand monitoring:', error);
    return ApiResponse.error(res, 500, 'Failed to update brand monitoring configuration', 'UPDATE_ERROR');
  }
}));

/**
 * DELETE /api/brand-monitoring/:id
 * Delete a brand monitoring configuration
 */
router.delete('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const brandId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(brandId)) {
      return ApiResponse.badRequest(res, 'Invalid brand ID', 'INVALID_ID');
    }

    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    if (!brands.find(b => b.id === brandId)) {
      return ApiResponse.notFound(res, 'Brand monitoring configuration not found', 'BRAND_NOT_FOUND');
    }

    logger.info(`[BrandMonitoringAPI] Deleting brand monitoring: ${brandId}`);

    await llmMonitoringService.deleteBrandMonitoring(brandId, userId);

    return ApiResponse.success(res, null, 'Brand monitoring configuration deleted successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error deleting brand monitoring:', error);
    return ApiResponse.error(res, 500, 'Failed to delete brand monitoring configuration', 'DELETE_ERROR');
  }
}));

// ==================== MENTIONS AND ANALYSIS ROUTES ====================

/**
 * GET /api/brand-monitoring/:id/mentions
 * Get brand mentions with filtering
 */
router.get('/:id/mentions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const brandId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(brandId)) {
      return ApiResponse.badRequest(res, 'Invalid brand ID', 'INVALID_ID');
    }

    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    if (!brands.find(b => b.id === brandId)) {
      return ApiResponse.notFound(res, 'Brand monitoring configuration not found', 'BRAND_NOT_FOUND');
    }

    const validation = validateRequest(mentionFiltersSchema, req.query);
    if (!validation.success) {
      return ApiResponse.badRequest(res, validation.error, 'VALIDATION_ERROR');
    }

    const mentions = await llmMonitoringService.getBrandMentions(brandId, validation.data);

    return ApiResponse.success(res, {
      mentions,
      total: mentions.length,
      filters: validation.data
    }, 'Brand mentions retrieved successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error getting brand mentions:', error);
    return ApiResponse.error(res, 500, 'Failed to retrieve brand mentions', 'FETCH_ERROR');
  }
}));

/**
 * POST /api/brand-monitoring/:id/analyze
 * Generate comprehensive brand analysis report
 */
router.post('/:id/analyze', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const brandId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(brandId)) {
      return ApiResponse.badRequest(res, 'Invalid brand ID', 'INVALID_ID');
    }

    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    if (!brands.find(b => b.id === brandId)) {
      return ApiResponse.notFound(res, 'Brand monitoring configuration not found', 'BRAND_NOT_FOUND');
    }

    const validation = validateRequest(analysisRequestSchema, req.body);
    if (!validation.success) {
      return ApiResponse.badRequest(res, validation.error, 'VALIDATION_ERROR');
    }

    logger.info(`[BrandMonitoringAPI] Generating analysis report for brand: ${brandId}`);

    const report = await brandRecommendationService.generateBrandAnalysisReport(
      brandId,
      validation.data.timeframe
    );

    return ApiResponse.success(res, report, 'Brand analysis report generated successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error generating analysis report:', error);
    return ApiResponse.error(res, 500, 'Failed to generate analysis report', 'ANALYSIS_ERROR');
  }
}));

// ==================== RECOMMENDATIONS ROUTES ====================

/**
 * GET /api/brand-monitoring/:id/recommendations
 * Get brand recommendations
 */
router.get('/:id/recommendations', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const brandId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(brandId)) {
      return ApiResponse.badRequest(res, 'Invalid brand ID', 'INVALID_ID');
    }

    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    if (!brands.find(b => b.id === brandId)) {
      return ApiResponse.notFound(res, 'Brand monitoring configuration not found', 'BRAND_NOT_FOUND');
    }

    const { category, priority, status, limit } = req.query;

    const recommendations = await brandRecommendationService.getBrandRecommendations(brandId, {
      category: category as any,
      priority: priority as any,
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined
    });

    return ApiResponse.success(res, {
      recommendations,
      total: recommendations.length
    }, 'Brand recommendations retrieved successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error getting recommendations:', error);
    return ApiResponse.error(res, 500, 'Failed to retrieve recommendations', 'FETCH_ERROR');
  }
}));

/**
 * PUT /api/brand-monitoring/recommendations/:recommendationId
 * Update recommendation status
 */
router.put('/recommendations/:recommendationId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const recommendationId = parseInt(req.params.recommendationId);

    if (isNaN(recommendationId)) {
      return ApiResponse.badRequest(res, 'Invalid recommendation ID', 'INVALID_ID');
    }

    const { status, progress } = req.body;

    if (!status || !['pending', 'in_progress', 'completed', 'dismissed'].includes(status)) {
      return ApiResponse.badRequest(res, 'Valid status is required', 'INVALID_STATUS');
    }

    const progressValue = typeof progress === 'number' ? progress : 0;

    await brandRecommendationService.updateRecommendationStatus(
      recommendationId,
      status,
      progressValue
    );

    return ApiResponse.success(res, null, 'Recommendation status updated successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error updating recommendation status:', error);
    return ApiResponse.error(res, 500, 'Failed to update recommendation status', 'UPDATE_ERROR');
  }
}));

// ==================== QUERY GENERATION ROUTES ====================

/**
 * POST /api/brand-monitoring/:id/queries/generate
 * Generate new tracking queries for a brand
 */
router.post('/:id/queries/generate', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const brandId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(brandId)) {
      return ApiResponse.badRequest(res, 'Invalid brand ID', 'INVALID_ID');
    }

    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    if (!brands.find(b => b.id === brandId)) {
      return ApiResponse.notFound(res, 'Brand monitoring configuration not found', 'BRAND_NOT_FOUND');
    }

    const { count = 10 } = req.body;

    if (typeof count !== 'number' || count < 1 || count > 50) {
      return ApiResponse.badRequest(res, 'Count must be between 1 and 50', 'INVALID_COUNT');
    }

    logger.info(`[BrandMonitoringAPI] Generating queries for brand: ${brandId}`);

    const result = await aiQueryGeneratorService.generateQueriesForBrand(brandId, count);

    return ApiResponse.success(res, result, 'Queries generated successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error generating queries:', error);
    return ApiResponse.error(res, 500, 'Failed to generate queries', 'GENERATION_ERROR');
  }
}));

/**
 * POST /api/brand-monitoring/queries/generate
 * Generate queries with custom parameters
 */
router.post('/queries/generate', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const validation = validateRequest(queryGenerationSchema, req.body);
    if (!validation.success) {
      return ApiResponse.badRequest(res, validation.error, 'VALIDATION_ERROR');
    }

    logger.info(`[BrandMonitoringAPI] Generating custom queries for: ${validation.data.brandName}`);

    const result = await aiQueryGeneratorService.generateQueries(validation.data);

    return ApiResponse.success(res, result, 'Queries generated successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error generating custom queries:', error);
    return ApiResponse.error(res, 500, 'Failed to generate queries', 'GENERATION_ERROR');
  }
}));

// ==================== JOB QUEUE AND MONITORING ROUTES ====================

/**
 * POST /api/brand-monitoring/:id/jobs
 * Queue a monitoring job for a brand
 */
router.post('/:id/jobs', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const brandId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(brandId)) {
      return ApiResponse.badRequest(res, 'Invalid brand ID', 'INVALID_ID');
    }

    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    if (!brands.find(b => b.id === brandId)) {
      return ApiResponse.notFound(res, 'Brand monitoring configuration not found', 'BRAND_NOT_FOUND');
    }

    const validation = validateRequest(jobQueueSchema, req.body);
    if (!validation.success) {
      return ApiResponse.badRequest(res, validation.error, 'VALIDATION_ERROR');
    }

    const { jobType, priority, scheduledAt, config } = validation.data;

    logger.info(`[BrandMonitoringAPI] Queuing ${jobType} job for brand: ${brandId}`);

    const jobId = await monitoringSchedulerService.queueJob(
      brandId,
      jobType,
      config,
      priority,
      scheduledAt
    );

    return ApiResponse.success(res, { jobId }, 'Job queued successfully', 201);

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error queuing job:', error);
    return ApiResponse.error(res, 500, 'Failed to queue job', 'QUEUE_ERROR');
  }
}));

/**
 * GET /api/brand-monitoring/:id/jobs
 * Get monitoring job history for a brand
 */
router.get('/:id/jobs', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const brandId = parseInt(req.params.id);
    const userId = req.user!.id;

    if (isNaN(brandId)) {
      return ApiResponse.badRequest(res, 'Invalid brand ID', 'INVALID_ID');
    }

    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    if (!brands.find(b => b.id === brandId)) {
      return ApiResponse.notFound(res, 'Brand monitoring configuration not found', 'BRAND_NOT_FOUND');
    }

    const { limit = 50 } = req.query;
    const limitNum = parseInt(limit as string) || 50;

    const jobs = await llmMonitoringService.getMonitoringJobs(brandId, limitNum);

    return ApiResponse.success(res, {
      jobs,
      total: jobs.length
    }, 'Job history retrieved successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error getting job history:', error);
    return ApiResponse.error(res, 500, 'Failed to retrieve job history', 'FETCH_ERROR');
  }
}));

/**
 * DELETE /api/brand-monitoring/jobs/:jobId
 * Cancel a pending job
 */
router.delete('/jobs/:jobId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);

    if (isNaN(jobId)) {
      return ApiResponse.badRequest(res, 'Invalid job ID', 'INVALID_ID');
    }

    await monitoringSchedulerService.cancelJob(jobId);

    return ApiResponse.success(res, null, 'Job cancelled successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error cancelling job:', error);
    return ApiResponse.error(res, 500, 'Failed to cancel job', 'CANCEL_ERROR');
  }
}));

// ==================== SYSTEM STATUS ROUTES ====================

/**
 * GET /api/brand-monitoring/system/status
 * Get monitoring system status
 */
router.get('/system/status', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const schedulerStatus = monitoringSchedulerService.getStatus();
    const queueStats = await monitoringSchedulerService.getQueueStats();
    const platforms = llmMonitoringService.getSupportedPlatforms();

    return ApiResponse.success(res, {
      scheduler: schedulerStatus,
      queue: queueStats,
      platforms: platforms.map(p => ({
        name: p.name,
        enabled: p.enabled,
        rateLimitPerMinute: p.rateLimitPerMinute
      }))
    }, 'System status retrieved successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error getting system status:', error);
    return ApiResponse.error(res, 500, 'Failed to retrieve system status', 'STATUS_ERROR');
  }
}));

// ==================== ADMIN ROUTES ====================

/**
 * POST /api/brand-monitoring/admin/scheduler/start
 * Start the monitoring scheduler (admin only)
 */
router.post('/admin/scheduler/start', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    await monitoringSchedulerService.start();
    return ApiResponse.success(res, null, 'Monitoring scheduler started successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error starting scheduler:', error);
    return ApiResponse.error(res, 500, 'Failed to start monitoring scheduler', 'START_ERROR');
  }
}));

/**
 * POST /api/brand-monitoring/admin/scheduler/stop
 * Stop the monitoring scheduler (admin only)
 */
router.post('/admin/scheduler/stop', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    await monitoringSchedulerService.stop();
    return ApiResponse.success(res, null, 'Monitoring scheduler stopped successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error stopping scheduler:', error);
    return ApiResponse.error(res, 500, 'Failed to stop monitoring scheduler', 'STOP_ERROR');
  }
}));

/**
 * GET /api/brand-monitoring/admin/queue/stats
 * Get detailed queue statistics (admin only)
 */
router.get('/admin/queue/stats', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  try {
    const stats = await monitoringSchedulerService.getQueueStats();
    const status = monitoringSchedulerService.getStatus();

    return ApiResponse.success(res, {
      ...stats,
      scheduler: status
    }, 'Queue statistics retrieved successfully');

  } catch (error) {
    logger.error('[BrandMonitoringAPI] Error getting queue stats:', error);
    return ApiResponse.error(res, 500, 'Failed to retrieve queue statistics', 'STATS_ERROR');
  }
}));

export { router as brandMonitoringRoutes };