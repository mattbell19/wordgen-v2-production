import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { articleRoutes } from "./routes/articles";
import { projectRoutes } from "./routes/projects";
import teamRoutes from "./routes/teams/index";
import { keywordRoutes } from "./routes/keywords";
import { aiRoutes } from "./routes/ai";
import { userRoutes } from "./routes/user";
import { setupAuth } from "./auth";
import bulkRoutes from "./routes/bulk";
import seoRoutes from "./routes/seo";
import scrapingRoutes from "./routes/scraping";
import { wordRoutes } from "./routes/words";
import { sitemapRoutes } from "./routes/sitemap";
import { searchUsageRoutes } from "./routes/search-usage";
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { createContext } from './trpc';

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    ws.on("error", console.error);
  });

  // First setup auth middleware
  setupAuth(app);

  // Register tRPC router
  app.use('/api/trpc', trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }));

  // Register API routes
  app.use("/api/articles", articleRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/teams", teamRoutes);
  app.use("/api/keywords", keywordRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/bulk", bulkRoutes);
  app.use("/api/seo", seoRoutes);
  app.use("/api/scraping", scrapingRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/words", wordRoutes);
  app.use("/api/sitemap", sitemapRoutes);
  app.use("/api/search-usage", searchUsageRoutes);

  return httpServer;
}