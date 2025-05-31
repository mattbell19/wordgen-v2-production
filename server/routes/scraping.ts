import { Router } from 'express';
import { ScrapingService } from '../services/scraping.service';
import { requireAuth } from '../middleware/authMiddleware';
import { db } from '@db';
import { scrapingTasks } from '@db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Request, Response } from 'express';
import ApiResponse from '../lib/api-response';

const router = Router();
const scrapingService = new ScrapingService();

// Get all sitemap reports for the current user
router.get('/reports', requireAuth, async (req: Request, res: Response) => {
  try {
    const reports = await db.query.scrapingTasks.findMany({
      where: eq(scrapingTasks.userId, req.user!.id),
      orderBy: [desc(scrapingTasks.createdAt)],
    });

    // Set content type to application/json
    res.type('application/json');

    return ApiResponse.success(res, reports);
  } catch (error) {
    console.error('Error fetching sitemap reports:', error);
    return ApiResponse.serverError(res, 'Failed to fetch sitemap reports', 'DATABASE_ERROR');
  }
});

router.post('/analyze-site', requireAuth, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    // Set content type to application/json
    res.type('application/json');

    if (!url) {
      return ApiResponse.badRequest(res, 'URL is required', 'MISSING_URL');
    }

    // Create a new scraping task
    const [task] = await db.insert(scrapingTasks)
      .values({
        userId: req.user!.id,
        domain: url,
        status: 'processing',
        metadata: {}
      })
      .returning();

    // Mock sitemap XML response instead of fetching
    console.log('Mocking sitemap for:', url);

    // Create a simple mock sitemap XML
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${url}/about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${url}/contact</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

    // For testing, uncomment this to simulate a failure
    // const sitemapXml = null;

    if (!sitemapXml) {
      await db.update(scrapingTasks)
        .set({
          status: 'failed',
          lastRunAt: new Date(),
          metadata: { error: 'Could not fetch sitemap XML' }
        })
        .where(eq(scrapingTasks.id, task.id));

      return ApiResponse.error(res, 404, 'Could not fetch sitemap XML', 'SITEMAP_NOT_FOUND');
    }

    // Update task with the sitemap XML
    await db.update(scrapingTasks)
      .set({
        status: 'completed',
        sitemapXml,
        lastRunAt: new Date(),
        metadata: {
          xmlLength: sitemapXml.length,
          fetchedAt: new Date().toISOString()
        }
      })
      .where(eq(scrapingTasks.id, task.id));

    return ApiResponse.success(res, {
      taskId: task.id,
      sitemapXml
    });
  } catch (error) {
    console.error('Error analyzing site:', error);
    return ApiResponse.serverError(res, 'Failed to analyze site', 'PROCESSING_ERROR');
  }
});

router.get('/results/:taskId', requireAuth, async (req: Request, res: Response) => {
  // Set content type to application/json
  res.type('application/json');
  try {
    const taskId = parseInt(req.params.taskId);
    const task = await db.query.scrapingTasks.findFirst({
      where: eq(scrapingTasks.id, taskId)
    });

    if (!task) {
      return ApiResponse.notFound(res, 'Task not found', 'TASK_NOT_FOUND');
    }

    // Check if user owns this task
    if (task.userId !== req.user!.id) {
      return ApiResponse.forbidden(res, 'Not authorized to view this task', 'UNAUTHORIZED_ACCESS');
    }

    return ApiResponse.success(res, task);
  } catch (error) {
    console.error('Error fetching scraping results:', error);
    return ApiResponse.serverError(res, 'Failed to fetch scraping results', 'DATABASE_ERROR');
  }
});

export default router;