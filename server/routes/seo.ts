import { Router } from 'express';
import { db } from '@db';
import { and, eq, desc } from 'drizzle-orm';
import type { InferModel } from 'drizzle-orm';
import { 
  seoAuditTasks, 
  seoAuditResults,
  seoAuditIssues,
  insertSeoAuditTaskSchema,
} from '@db/schema';
import { seoService } from '../services/seo.service';
import type { Request, Response } from 'express';
import type { User } from '../types/auth';
import { requireAuth } from '../auth';
import { SeoAuditService } from '../services/data-for-seo/seo-audit.service';
import { z } from 'zod';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const router = Router();
const seoAuditService = new SeoAuditService();

type SeoAuditTask = InferModel<typeof seoAuditTasks, 'select'> & {
  results?: Array<InferModel<typeof seoAuditResults, 'select'>>;
};

// Create a new audit task
router.post('/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { domain, path, schedule } = await insertSeoAuditTaskSchema.parseAsync(req.body);

    // Create task using SEO service
    let seoTask;
    try {
      seoTask = await seoService.createAuditTask(domain, path);
    } catch (error: any) {
      console.error('SEO task creation failed:', error);
      return res.status(500).json({ 
        ok: false,
        message: 'Failed to create audit task',
        details: error.message
      });
    }

    // Store task in database
    const [task] = await db.insert(seoAuditTasks).values({
      userId: req.user!.id,
      domain,
      path,
      schedule,
      dataForSeoTaskId: seoTask.id,
      status: 'pending',
      ...(schedule && {
        nextRunAt: new Date(Date.now() + (schedule === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000),
      }),
    }).returning();

    res.json({ ok: true, task });
  } catch (error: any) {
    console.error('Failed to create audit task:', error);
    res.status(400).json({ 
      ok: false,
      message: 'Failed to create audit task',
      details: error.issues?.map((i: any) => i.message).join(', ')
    });
  }
});

// Get all audit tasks for the user
router.get('/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const tasks = await db.select().from(seoAuditTasks)
      .where(eq(seoAuditTasks.userId, req.user!.id))
      .orderBy(desc(seoAuditTasks.createdAt));

    // Check ready tasks
    let readyTasks: string[] = [];
    try {
      readyTasks = await seoService.checkReadyTasks();
    } catch (error) {
      console.warn('Non-critical error checking ready tasks:', error);
      // Continue with empty ready tasks array
    }

    // Update task statuses
    const updatedTasks = tasks.map((task: SeoAuditTask) => ({
      ...task,
      status: task.dataForSeoTaskId && readyTasks.includes(task.dataForSeoTaskId) 
        ? 'ready' 
        : task.status === 'pending' && task.createdAt < new Date(Date.now() - 24 * 60 * 60 * 1000)
          ? 'failed' // Mark as failed if pending for more than 24 hours
          : task.status
    }));

    // Update any expired tasks in the database
    const expiredTasks = updatedTasks.filter(task => 
      task.status === 'failed' && 
      tasks.find(t => t.id === task.id)?.status !== 'failed'
    );

    if (expiredTasks.length > 0) {
      await Promise.all(expiredTasks.map(task =>
        db.update(seoAuditTasks)
          .set({ status: 'failed' })
          .where(eq(seoAuditTasks.id, task.id))
      ));
    }

    res.json({ ok: true, tasks: updatedTasks });
  } catch (error: any) {
    console.error('Failed to fetch audit tasks:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to fetch audit tasks',
      details: error.message
    });
  }
});

// Get a specific audit task with its latest result
router.get('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const task = await db.select()
      .from(seoAuditTasks)
      .where(and(
        eq(seoAuditTasks.id, parseInt(req.params.id)),
        eq(seoAuditTasks.userId, req.user!.id)
      ))
      .limit(1);

    const taskResult = task[0];

    if (!taskResult) {
      return res.status(404).json({ ok: false, message: 'Task not found' });
    }

    res.json({ ok: true, task: taskResult });
  } catch (error: any) {
    console.error('Failed to fetch audit task:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'Failed to fetch audit task',
      details: error.message
    });
  }
});

// Process an audit task result
router.post('/tasks/:id/process', requireAuth, async (req: Request, res: Response) => {
  try {
    const [task] = await db.select()
      .from(seoAuditTasks)
      .where(and(
        eq(seoAuditTasks.id, parseInt(req.params.id)),
        eq(seoAuditTasks.userId, req.user!.id)
      ))
      .limit(1);

    if (!task || !task.dataForSeoTaskId) {
      return res.status(404).json({ ok: false, message: 'Task not found' });
    }

    // Get task status and summary
    const taskStatus = await seoService.getTaskStatus(task.dataForSeoTaskId);

    if (!taskStatus.ready) {
      // Update task status if needed
      if (task.status === 'pending') {
        await db.update(seoAuditTasks)
          .set({ status: 'processing' })
          .where(eq(seoAuditTasks.id, task.id));
      }
      return res.status(202).json({ 
        ok: true,
        message: 'Audit is still processing',
        status: taskStatus.status
      });
    }

    // Get task summary
    const summary = await seoService.getTaskSummary(task.dataForSeoTaskId);
    if (!summary) {
      throw new Error('Failed to get task summary');
    }

    // Store the result
    const [result] = await db.insert(seoAuditResults).values({
      taskId: task.id,
      totalPages: summary.total_pages,
      healthScore: summary.onpage_score,
      criticalIssues: summary.issues.critical,
      warnings: summary.issues.warnings,
      passed: summary.issues.passed,
      onPageData: summary,
    }).returning();

    // Update task status
    await db.update(seoAuditTasks)
      .set({ 
        status: 'completed',
        lastRunAt: new Date(),
        ...(task.schedule && {
          nextRunAt: new Date(Date.now() + (task.schedule === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000),
        }),
      })
      .where(eq(seoAuditTasks.id, task.id));

    res.json({ ok: true, result });
  } catch (error: any) {
    console.error('Failed to process audit result:', error);

    // Update task status to failed
    try {
      await db.update(seoAuditTasks)
        .set({ status: 'failed' })
        .where(eq(seoAuditTasks.id, parseInt(req.params.id)));
    } catch (updateError) {
      console.error('Failed to update task status:', updateError);
    }

    res.status(500).json({ 
      ok: false,
      message: 'Failed to process audit result',
      details: error.message
    });
  }
});

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
 * POST /api/seo/audit
 */
router.post('/audit', requireAuth, async (req: Request, res: Response) => {
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

    // Create audit task
    const task = await seoAuditService.createAuditTask(target, req.user.id, dataForSeoOptions);

    res.status(201).json({
      success: true,
      message: 'SEO audit task created successfully',
      data: {
        id: task.id,
        taskId: task.taskId,
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
 * Get SEO audit task status and summary
 * GET /api/seo/audit/:taskId
 */
router.get('/audit/:taskId', requireAuth, async (req: Request, res: Response) => {
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

    // Retrieve audit status
    const { status, progress, summary } = await seoAuditService.getAuditStatus(taskId);

    res.status(200).json({
      success: true,
      data: {
        taskId,
        status,
        progress,
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
 * GET /api/seo/audit/:taskId/pages
 */
router.get('/audit/:taskId/pages', requireAuth, async (req: Request, res: Response) => {
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

    // Retrieve audit pages
    const pages = await seoAuditService.getAuditPages(taskId, limit, offset);

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
 * GET /api/seo/audit/:taskId/resources
 */
router.get('/audit/:taskId/resources', requireAuth, async (req: Request, res: Response) => {
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
 * GET /api/seo/audit/:taskId/links
 */
router.get('/audit/:taskId/links', requireAuth, async (req: Request, res: Response) => {
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
 * GET /api/seo/audit/:taskId/duplicate-tags
 */
router.get('/audit/:taskId/duplicate-tags', requireAuth, async (req: Request, res: Response) => {
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
 * DELETE /api/seo/audit/:taskId
 */
router.delete('/audit/:taskId', requireAuth, async (req: Request, res: Response) => {
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

    // Cancel audit task
    const success = await seoAuditService.cancelAuditTask(taskId);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'SEO audit task canceled successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to cancel SEO audit task',
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
 * POST /api/seo/instant-audit
 */
router.post('/instant-audit', requireAuth, async (req: Request, res: Response) => {
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