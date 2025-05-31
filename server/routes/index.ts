import express, { Router } from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from '../router';
import { createContext } from '../trpc';
import { articleRoutes } from './articles';
import { aiRoutes } from './ai';
import seoAuditRoutes from './seo-audit';
import { wordRoutes } from './words';
import userConsolidatedRouter from './user-consolidated';
import gscRoutes from './gsc';
import gscDebugRoutes from './gsc-debug';
import gscDirectRoutes from './gsc-direct';
import testRoutes from './test';
import scrapingRoutes from './scraping';
import bulkRoutes from './bulk';

// Configure passport local strategy
export function registerRoutes(app: express.Express): void {
  console.log('[ROUTES] Starting routes registration...');

  // Create router
  const router = Router();

  // Log all requests to this router
  router.use((req, res, next) => {
    console.log(`[ROUTER] ${req.method} ${req.baseUrl}${req.path}`);
    next();
  });

  // CSP violation reporting endpoint
  router.post('/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
    console.error('[CSP] Violation:', {
      ...req.body['csp-report'],
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    res.status(204).end();
  });

  // Health check endpoints
  const healthCheck = (req: express.Request, res: express.Response) => {
    console.log('[HEALTH] Health check endpoint called');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  };

  // Register health check endpoints
  router.get('/health', healthCheck);
  router.get('/', healthCheck);

  // Mount routes
  console.log('[ROUTES] Mounting routes under /api');
  router.use('/articles', articleRoutes);
  router.use('/ai', aiRoutes);
  router.use('/words', wordRoutes);
  router.use('/seo-audit', seoAuditRoutes);
  router.use('/user', userConsolidatedRouter);
  router.use('/gsc', gscRoutes);
  router.use('/gsc-debug', gscDebugRoutes);
  router.use('/gsc-direct', gscDirectRoutes);
  router.use('/test', testRoutes);
  router.use('/scraping', scrapingRoutes); // Register scraping routes
  router.use('/bulk', bulkRoutes);
  console.log('Routes registered');

  // Mount all routes under /api
  app.use('/api', router);

  // Mount tRPC router
  app.use('/api/trpc', trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }));

  // Also mount health check at root level
  app.get('/health', healthCheck);
  app.get('/', healthCheck);

  console.log('[ROUTES] Routes registered successfully');

  // Log registered routes
  console.log('[ROUTES] Available routes:');
  console.log('GET /');
  console.log('GET /health');
  console.log('GET /api/health');
  console.log('POST /api/csp-report');
  console.log('GET /api/words/lists');
  console.log('POST /api/words/lists');
  console.log('POST /api/words/save');
  console.log('DELETE /api/words/lists/:id');
  console.log('DELETE /api/words/words/:id');
  console.log('POST /api/seo-audit');
  console.log('GET /api/seo-audit/:taskId');
  console.log('GET /api/seo-audit/:taskId/pages');
  console.log('GET /api/seo-audit/:taskId/resources');
  console.log('GET /api/seo-audit/:taskId/links');
  console.log('GET /api/seo-audit/:taskId/duplicate-tags');
  console.log('DELETE /api/seo-audit/:taskId');
  console.log('POST /api/seo-audit/instant');
  console.log('POST /api/usage/sync');
}