import { Router } from 'express';
import { z } from 'zod';
import { LLMMonitoringService } from '../services/llm-monitoring.service.js';
import { BrandAnalysisService } from '../services/brand-analysis.service.js';
import { OptimizationEngine } from '../services/optimization-engine.service.js';
import { requireAuth } from '../middleware/consolidated-auth.js';
import { validateRequest } from '../middleware/validate-request.js';
import { logger } from '../lib/logger.js';
import { 
  insertBrandMonitoringSchema,
  selectBrandMonitoringSchema,
  type InsertBrandMonitoring,
  type SelectBrandMonitoring 
} from '../../db/schema.js';

const router = Router();
const llmMonitoringService = new LLMMonitoringService();
const brandAnalysisService = new BrandAnalysisService();
const optimizationEngine = new OptimizationEngine();

// Apply auth middleware to all routes
router.use(requireAuth);

// Validation schemas
const brandIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive())
});

const dateRangeSchema = z.object({
  startDate: z.string().transform(val => new Date(val)),
  endDate: z.string().transform(val => new Date(val))
}).refine(data => data.startDate <= data.endDate, {
  message: "Start date must be before end date"
});

const paginationSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50).pipe(z.number().int().min(1).max(100)),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0).pipe(z.number().int().min(0))
});

const mentionFiltersSchema = z.object({
  platform: z.enum(['openai', 'anthropic', 'google', 'other']).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

// Brand Management Routes

/**
 * POST /api/llm-seo/brands
 * Create a new brand monitoring configuration
 */
router.post('/brands', validateRequest(insertBrandMonitoringSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const brandData: Omit<InsertBrandMonitoring, 'id' | 'createdAt' | 'updatedAt'> = {
      ...req.body,
      userId,
      teamId: req.user.activeTeamId || null
    };

    const result = await llmMonitoringService.createBrandMonitoring(brandData);
    
    logger.info(`Brand monitoring created: ${result.id} for user: ${userId}`);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating brand monitoring:', error);
    res.status(500).json({ 
      error: 'Failed to create brand monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/llm-seo/brands
 * Get all brand monitoring configurations for the user
 */
router.get('/brands', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const teamId = req.user.activeTeamId || undefined;
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId, teamId);
    
    res.json(brands);
  } catch (error) {
    logger.error('Error fetching brand monitoring:', error);
    res.status(500).json({ 
      error: 'Failed to fetch brand monitoring configurations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/llm-seo/brands/:id
 * Get specific brand monitoring configuration
 */
router.get('/brands/:id', validateRequest(brandIdSchema, 'params'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const brandId = req.params.id as unknown as number;
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    const brand = brands.find(b => b.id === brandId);

    if (!brand) {
      return res.status(404).json({ error: 'Brand monitoring configuration not found' });
    }

    res.json(brand);
  } catch (error) {
    logger.error('Error fetching brand monitoring:', error);
    res.status(500).json({ 
      error: 'Failed to fetch brand monitoring configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/llm-seo/brands/:id
 * Update brand monitoring configuration
 */
router.put('/brands/:id', 
  validateRequest(brandIdSchema, 'params'),
  validateRequest(insertBrandMonitoringSchema.partial()),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const brandId = req.params.id as unknown as number;
      
      // Verify ownership
      const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
      const existingBrand = brands.find(b => b.id === brandId);
      
      if (!existingBrand) {
        return res.status(404).json({ error: 'Brand monitoring configuration not found' });
      }

      const result = await llmMonitoringService.updateBrandMonitoring(brandId, req.body);
      
      logger.info(`Brand monitoring updated: ${brandId} by user: ${userId}`);
      res.json(result);
    } catch (error) {
      logger.error('Error updating brand monitoring:', error);
      res.status(500).json({ 
        error: 'Failed to update brand monitoring configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/llm-seo/brands/:id
 * Delete brand monitoring configuration
 */
router.delete('/brands/:id', validateRequest(brandIdSchema, 'params'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const brandId = req.params.id as unknown as number;
    
    // Verify ownership before deletion
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    const existingBrand = brands.find(b => b.id === brandId);
    
    if (!existingBrand) {
      return res.status(404).json({ error: 'Brand monitoring configuration not found' });
    }

    await llmMonitoringService.deleteBrandMonitoring(brandId, userId);
    
    logger.info(`Brand monitoring deleted: ${brandId} by user: ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting brand monitoring:', error);
    res.status(500).json({ 
      error: 'Failed to delete brand monitoring configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Monitoring Routes

/**
 * POST /api/llm-seo/monitoring/:brandId/start
 * Start monitoring campaign for a brand
 */
router.post('/monitoring/:brandId/start', validateRequest(brandIdSchema, 'params'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const brandId = req.params.brandId as unknown as number;
    
    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    const brand = brands.find(b => b.id === brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Create and execute monitoring job
    const job = await llmMonitoringService.createMonitoringJob(brandId, 'mention_scan');
    
    // Execute job asynchronously
    llmMonitoringService.executeMonitoringJob(job.id).catch(error => {
      logger.error(`Monitoring job ${job.id} failed:`, error);
    });

    res.status(202).json({ 
      message: 'Monitoring job started',
      jobId: job.id,
      status: 'running'
    });
  } catch (error) {
    logger.error('Error starting monitoring:', error);
    res.status(500).json({ 
      error: 'Failed to start monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/llm-seo/monitoring/:brandId/status
 * Get monitoring status for a brand
 */
router.get('/monitoring/:brandId/status', validateRequest(brandIdSchema, 'params'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const brandId = req.params.brandId as unknown as number;
    
    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    const brand = brands.find(b => b.id === brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const jobs = await llmMonitoringService.getMonitoringJobs(brandId, 10);
    const latestJob = jobs[0];

    res.json({
      isActive: brand.isActive,
      monitoringFrequency: brand.monitoringFrequency,
      lastJobStatus: latestJob?.status || 'none',
      lastJobCompleted: latestJob?.completedAt || null,
      recentJobs: jobs.slice(0, 5)
    });
  } catch (error) {
    logger.error('Error getting monitoring status:', error);
    res.status(500).json({ 
      error: 'Failed to get monitoring status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/llm-seo/monitoring/:brandId/pause
 * Pause monitoring for a brand
 */
router.post('/monitoring/:brandId/pause', validateRequest(brandIdSchema, 'params'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const brandId = req.params.brandId as unknown as number;
    
    // Verify ownership and update
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    const brand = brands.find(b => b.id === brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    await llmMonitoringService.updateBrandMonitoring(brandId, { isActive: false });

    res.json({ message: 'Monitoring paused', isActive: false });
  } catch (error) {
    logger.error('Error pausing monitoring:', error);
    res.status(500).json({ 
      error: 'Failed to pause monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Analytics Routes

/**
 * GET /api/llm-seo/analytics/:brandId/dashboard
 * Get comprehensive analytics dashboard data
 */
router.get('/analytics/:brandId/dashboard',
  validateRequest(brandIdSchema, 'params'),
  validateRequest(dateRangeSchema.partial(), 'query'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const brandId = req.params.brandId as unknown as number;
      
      // Verify ownership
      const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
      const brand = brands.find(b => b.id === brandId);
      
      if (!brand) {
        return res.status(404).json({ error: 'Brand not found' });
      }

      // Default to last 30 days if no date range provided
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const analytics = await brandAnalysisService.getBrandAnalytics(brandId, { startDate, endDate });
      const healthScore = await brandAnalysisService.calculateBrandHealthScore(brandId);
      const insights = await brandAnalysisService.generateBrandInsights(brandId);

      res.json({
        analytics,
        healthScore,
        insights,
        dateRange: { startDate, endDate }
      });
    } catch (error) {
      logger.error('Error getting analytics dashboard:', error);
      res.status(500).json({ 
        error: 'Failed to get analytics dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/llm-seo/analytics/:brandId/mentions
 * Get brand mentions with filtering
 */
router.get('/analytics/:brandId/mentions',
  validateRequest(brandIdSchema, 'params'),
  validateRequest(mentionFiltersSchema.merge(paginationSchema), 'query'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const brandId = req.params.brandId as unknown as number;
      
      // Verify ownership
      const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
      const brand = brands.find(b => b.id === brandId);
      
      if (!brand) {
        return res.status(404).json({ error: 'Brand not found' });
      }

      const mentions = await llmMonitoringService.getBrandMentions(brandId, {
        platform: req.query.platform as string,
        sentiment: req.query.sentiment as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit as unknown as number,
        offset: req.query.offset as unknown as number
      });

      res.json({
        mentions,
        pagination: {
          limit: req.query.limit,
          offset: req.query.offset,
          total: mentions.length
        }
      });
    } catch (error) {
      logger.error('Error getting brand mentions:', error);
      res.status(500).json({ 
        error: 'Failed to get brand mentions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/llm-seo/analytics/:brandId/competitors
 * Compare with competitors
 */
router.get('/analytics/:brandId/competitors',
  validateRequest(brandIdSchema, 'params'),
  validateRequest(dateRangeSchema.partial(), 'query'),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const brandId = req.params.brandId as unknown as number;
      
      // Verify ownership
      const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
      const brand = brands.find(b => b.id === brandId);
      
      if (!brand) {
        return res.status(404).json({ error: 'Brand not found' });
      }

      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const competitorAnalysis = await brandAnalysisService.compareWithCompetitors(
        brandId,
        brand.competitors || [],
        { startDate, endDate }
      );

      res.json({
        competitors: competitorAnalysis,
        dateRange: { startDate, endDate }
      });
    } catch (error) {
      logger.error('Error getting competitor analysis:', error);
      res.status(500).json({ 
        error: 'Failed to get competitor analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Platform Management Routes

/**
 * GET /api/llm-seo/platforms/supported
 * Get list of supported LLM platforms
 */
router.get('/platforms/supported', async (req, res) => {
  try {
    const platforms = llmMonitoringService.getSupportedPlatforms();
    res.json({ platforms });
  } catch (error) {
    logger.error('Error getting supported platforms:', error);
    res.status(500).json({ 
      error: 'Failed to get supported platforms',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/llm-seo/platforms/test-connection
 * Test connection to an LLM platform
 */
router.post('/platforms/test-connection', 
  validateRequest(z.object({
    platform: z.enum(['openai', 'anthropic'])
  })),
  async (req, res) => {
    try {
      const { platform } = req.body;
      const isConnected = await llmMonitoringService.testPlatformConnection(platform);
      
      res.json({ 
        platform,
        connected: isConnected,
        message: isConnected ? 'Connection successful' : 'Connection failed'
      });
    } catch (error) {
      logger.error('Error testing platform connection:', error);
      res.status(500).json({ 
        error: 'Failed to test platform connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Optimization Routes

/**
 * GET /api/llm-seo/optimization/:brandId/report
 * Generate comprehensive optimization report
 */
router.get('/optimization/:brandId/report', validateRequest(brandIdSchema, 'params'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const brandId = req.params.brandId as unknown as number;
    
    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    const brand = brands.find(b => b.id === brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const report = await optimizationEngine.generateOptimizationReport(brandId);
    
    res.json(report);
  } catch (error) {
    logger.error('Error generating optimization report:', error);
    res.status(500).json({ 
      error: 'Failed to generate optimization report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/llm-seo/optimization/:brandId/recommendations
 * Get stored optimization recommendations
 */
router.get('/optimization/:brandId/recommendations', validateRequest(brandIdSchema, 'params'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const brandId = req.params.brandId as unknown as number;
    
    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    const brand = brands.find(b => b.id === brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const recommendations = await optimizationEngine.getStoredRecommendations(brandId);
    
    res.json({ recommendations });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to get recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/llm-seo/optimization/recommendations/:id/status
 * Update recommendation status
 */
router.put('/optimization/recommendations/:id/status', 
  validateRequest(z.object({
    id: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive())
  }), 'params'),
  validateRequest(z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'dismissed'])
  })),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const recommendationId = req.params.id as unknown as number;
      const { status } = req.body;

      const result = await optimizationEngine.updateRecommendationStatus(recommendationId, status);
      
      res.json(result);
    } catch (error) {
      logger.error('Error updating recommendation status:', error);
      res.status(500).json({ 
        error: 'Failed to update recommendation status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/llm-seo/optimization/:brandId/roi-projections
 * Get ROI projections for optimization recommendations
 */
router.get('/optimization/:brandId/roi-projections', validateRequest(brandIdSchema, 'params'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const brandId = req.params.brandId as unknown as number;
    
    // Verify ownership
    const brands = await llmMonitoringService.getBrandMonitoringByUser(userId);
    const brand = brands.find(b => b.id === brandId);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const projections = await optimizationEngine.generateROIProjections(brandId);
    
    res.json(projections);
  } catch (error) {
    logger.error('Error generating ROI projections:', error);
    res.status(500).json({ 
      error: 'Failed to generate ROI projections',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
router.use((error: Error, req: any, res: any, next: any) => {
  logger.error('LLM SEO API Error:', error);
  
  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

export { router as llmSeoRoutes };