import express from 'express';
import { articleRoutes } from './articles';
import bulkRoutes from './bulk';
import { keywordRoutes } from './keywords';
import { projectRoutes } from './projects';
import seoRoutes from './seo';
import { sitemapRoutes } from './sitemap';
import { teamRoutes } from './teams';
import { wordRoutes } from './words';
import queueRouter from './queue.routes';
import scrapingRoutes from './scraping';
import gscRoutes from './gsc';
import stripeRouter from './stripe.routes';
import { adminRouter } from './admin';
import { integrationRoutes } from './integrations';
import webflowRouter from './webflow';
import { aiRoutes } from './ai';

export const apiRouter = express.Router();

// Register all API routes
apiRouter.use('/articles', articleRoutes);
apiRouter.use('/bulk', bulkRoutes);
apiRouter.use('/keywords', keywordRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/seo', seoRoutes);
apiRouter.use('/sitemap', sitemapRoutes);
apiRouter.use('/teams', teamRoutes);
apiRouter.use('/words', wordRoutes);
apiRouter.use('/queue', queueRouter);
apiRouter.use('/scraping', scrapingRoutes);
apiRouter.use('/gsc', gscRoutes);
apiRouter.use('/stripe', stripeRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/integrations', integrationRoutes);
apiRouter.use('/webflow', webflowRouter);
apiRouter.use('/ai', aiRoutes);

export default apiRouter; 