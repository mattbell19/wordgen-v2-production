import { Router } from 'express';
import { db } from '@db';
import { projects } from '@db/schema';
import { requireAuth } from '../auth';
import { eq, desc, inArray, and } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { router, protectedProcedure } from '../trpc';
import ApiResponse from '../lib/api-response';
import { getUserIdsForContext, getActiveContext } from '../utils/team-context';

const expressRouter = Router();

// Get all projects for the current user or team
expressRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiResponse.unauthorized(res, "Authentication required", "UNAUTHORIZED");
    }

    // Get user IDs for the current context (personal or team)
    const userIds = await getUserIdsForContext(req);
    console.log('Fetching projects for context:', { userIds });

    const userProjects = await db
      .select()
      .from(projects)
      .where(inArray(projects.userId, userIds));

    return ApiResponse.success(res, userProjects, 'Projects retrieved successfully');

  } catch (error) {
    console.error("Error fetching projects:", error);
    return ApiResponse.serverError(
      res,
      "Failed to fetch projects",
      "DATABASE_ERROR",
      { details: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

export const projectRoutes = expressRouter;

export const projectsRouter = router({
  getRecent: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get user IDs for the current context (personal or team)
      const userIds = await getUserIdsForContext(ctx.req);
      console.log('[TRPC] Querying recent projects for context:', { userIds });

      const recentProjects = await db
        .select({
          id: projects.id,
          name: projects.name,
          updatedAt: projects.updatedAt,
          status: projects.status,
        })
        .from(projects)
        .where(inArray(projects.userId, userIds))
        .orderBy(desc(projects.updatedAt))
        .limit(5);

      console.log('[TRPC] Found recent projects:', recentProjects.length);

      return recentProjects.map(project => ({
        ...project,
        updatedAt: project.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error('[TRPC] Error in getRecent projects:', error);
      throw new Error('Failed to fetch recent projects');
    }
  }),
});
