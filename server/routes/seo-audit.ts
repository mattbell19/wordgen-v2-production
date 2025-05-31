import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware';
import { SeoAuditService } from '../services/data-for-seo/seo-audit.service';
import { taskManager } from '../services/data-for-seo/task-manager.service';
import { z } from 'zod';
import type { Request, Response } from 'express';

// Initialize router
const router = Router();
const seoAuditService = new SeoAuditService();

// Validation schemas
const auditTaskSchema = z.object({
  target: z.string().url('Must be a valid URL'),
  maxCrawlPages: z.number().min(1).max(1000).default(100),
  options: z.object({
    loadResources: z.boolean().default(true),
    enableJavaScript: z.boolean().default(true),
    enableBrowserRendering: z.boolean().default(true),
    storeRawHtml: z.boolean().default(false),
    checkSpell: z.boolean().default(false),
    calculateKeywordDensity: z.boolean().default(false),
  }).optional(),
});

const taskIdSchema = z.object({
  taskId: z.string().min(1),
});

/**
 * Create a new SEO audit task
 * POST /api/seo-audit
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = auditTaskSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const { target, maxCrawlPages, options } = validation.data;

    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Map options to DataForSEO format
    const dataForSeoOptions = {
      max_crawl_pages: maxCrawlPages,
      load_resources: options?.loadResources,
      enable_javascript: options?.enableJavaScript,
      enable_browser_rendering: options?.enableBrowserRendering,
      store_raw_html: options?.storeRawHtml,
      check_spell: options?.checkSpell,
      calculate_keyword_density: options?.calculateKeywordDensity,
    };

    // Create managed task using the task manager
    const task = await taskManager.createTask(target, req.user.id, dataForSeoOptions);

    res.status(201).json({
      success: true,
      message: 'SEO audit task created successfully',
      data: {
        id: task.id,
        target: task.target,
        status: task.status,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating SEO audit task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create SEO audit task',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get all SEO audit tasks for the current user
 * GET /api/seo-audit
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get tasks for the user
    const tasks = taskManager.getUserTasks(req.user.id);

    // Map tasks to a simpler format for the response
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      target: task.target,
      status: task.status,
      progress: task.progress || 0,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt,
      error: task.error,
    }));

    res.status(200).json({
      success: true,
      data: formattedTasks,
    });
  } catch (error) {
    console.error('Error getting SEO audit tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SEO audit tasks',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get SEO audit task status and summary
 * GET /api/seo-audit/:taskId
 */
router.get('/:taskId', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate task ID
    const validation = taskIdSchema.safeParse({ taskId: req.params.taskId });
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
        errors: validation.error.errors,
      });
    }

    const { taskId } = validation.data;

    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get the task
    const task = taskManager.getTask(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if the task belongs to the user
    if (task.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this task',
      });
    }

    // If the task doesn't have a DataForSEO task ID yet or is not in progress, return just the task info
    if (!task.taskId || task.status !== 'in_progress') {
      return res.status(200).json({
        success: true,
        data: {
          id: task.id,
          target: task.target,
          status: task.status,
          progress: task.progress || 0,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          completedAt: task.completedAt,
          error: task.error,
        },
      });
    }

    // Retrieve audit status and summary from DataForSEO
    const { status, progress, summary } = await seoAuditService.getAuditStatus(task.taskId);

    // Update the task with the latest status info
    task.status = status;
    task.progress = progress || 0;
    task.updatedAt = new Date();
    if (status === 'completed') {
      task.completedAt = new Date();
    }

    res.status(200).json({
      success: true,
      data: {
        id: task.id,
        taskId: task.taskId,
        target: task.target,
        status: task.status,
        progress: task.progress || 0,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
        error: task.error,
        summary,
      },
    });
  } catch (error) {
    console.error('Error getting SEO audit status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SEO audit status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get SEO audit pages
 * GET /api/seo-audit/:taskId/pages
 */
router.get('/:taskId/pages', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate task ID
    const validation = taskIdSchema.safeParse({ taskId: req.params.taskId });
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
        errors: validation.error.errors,
      });
    }

    const { taskId } = validation.data;
    const limit = parseInt(req.query.limit as string || '100', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get the task
    const task = taskManager.getTask(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if the task belongs to the user
    if (task.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this task',
      });
    }

    // Check if the task has a DataForSEO task ID
    if (!task.taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task has not been submitted to DataForSEO yet',
      });
    }

    // Retrieve audit pages
    const pages = await seoAuditService.getAuditPages(task.taskId, limit, offset);

    res.status(200).json({
      success: true,
      data: pages,
    });
  } catch (error) {
    console.error('Error getting SEO audit pages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SEO audit pages',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get SEO audit resources
 * GET /api/seo-audit/:taskId/resources
 */
router.get('/:taskId/resources', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate task ID
    const validation = taskIdSchema.safeParse({ taskId: req.params.taskId });
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
        errors: validation.error.errors,
      });
    }

    const { taskId } = validation.data;
    const limit = parseInt(req.query.limit as string || '100', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    // Retrieve audit resources
    const resources = await seoAuditService.getAuditResources(taskId, limit, offset);

    res.status(200).json({
      success: true,
      data: resources,
    });
  } catch (error) {
    console.error('Error getting SEO audit resources:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SEO audit resources',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get SEO audit links
 * GET /api/seo-audit/:taskId/links
 */
router.get('/:taskId/links', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate task ID
    const validation = taskIdSchema.safeParse({ taskId: req.params.taskId });
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
        errors: validation.error.errors,
      });
    }

    const { taskId } = validation.data;
    const limit = parseInt(req.query.limit as string || '100', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    // Retrieve audit links
    const links = await seoAuditService.getAuditLinks(taskId, limit, offset);

    res.status(200).json({
      success: true,
      data: links,
    });
  } catch (error) {
    console.error('Error getting SEO audit links:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SEO audit links',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get SEO audit duplicate tags
 * GET /api/seo-audit/:taskId/duplicate-tags
 */
router.get('/:taskId/duplicate-tags', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate task ID
    const validation = taskIdSchema.safeParse({ taskId: req.params.taskId });
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
        errors: validation.error.errors,
      });
    }

    const { taskId } = validation.data;
    const limit = parseInt(req.query.limit as string || '100', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    // Retrieve audit duplicate tags
    const duplicateTags = await seoAuditService.getAuditDuplicateTags(taskId, limit, offset);

    res.status(200).json({
      success: true,
      data: duplicateTags,
    });
  } catch (error) {
    console.error('Error getting SEO audit duplicate tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get SEO audit duplicate tags',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Cancel SEO audit task
 * DELETE /api/seo-audit/:taskId
 */
router.delete('/:taskId', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate task ID
    const validation = taskIdSchema.safeParse({ taskId: req.params.taskId });
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
        errors: validation.error.errors,
      });
    }

    const { taskId } = validation.data;

    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get the task
    const task = taskManager.getTask(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if the task belongs to the user
    if (task.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this task',
      });
    }

    // Cancel the task
    const success = await taskManager.cancelTask(taskId);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'SEO audit task canceled successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to cancel SEO audit task, it may already be completed or failed',
      });
    }
  } catch (error) {
    console.error('Error canceling SEO audit task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel SEO audit task',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get instant page audit
 * POST /api/seo-audit/instant
 */
router.post('/instant', requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const url = z.string().url('Must be a valid URL').parse(req.body.url);

    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get audit options
    const options = req.body.options || {};

    // Get instant page audit
    const audit = await seoAuditService.getInstantPageAudit(url, options);

    res.status(200).json({
      success: true,
      data: audit,
    });
  } catch (error) {
    console.error('Error getting instant page audit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get instant page audit',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router; 