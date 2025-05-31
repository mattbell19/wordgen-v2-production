import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "@db";
import { users, articles, settings, subscriptions } from "@db/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { subDays } from "date-fns";

// Create a middleware to check admin status
const adminMiddleware = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.isAdmin) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be an admin to access this resource",
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  analytics: adminMiddleware.query(async () => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // Get user growth data for the last 30 days
    const userGrowth = await db.execute(sql`
      WITH RECURSIVE dates AS (
        SELECT DATE(${thirtyDaysAgoStr}) as date
        UNION ALL
        SELECT DATE(date, '+1 day')
        FROM dates
        WHERE date < DATE('now')
      )
      SELECT 
        dates.date::text,
        COUNT(${users.id})::int as count
      FROM dates
      LEFT JOIN ${users} ON DATE(${users.createdAt}::timestamp) <= dates.date
      GROUP BY dates.date
      ORDER BY dates.date ASC
    `);

    // Get content metrics
    const contentMetrics = await db.execute(sql`
      SELECT 
        COUNT(*)::int as total_articles,
        ROUND(AVG(${articles.wordCount}))::int as average_word_count,
        SUM(${articles.wordCount})::bigint as total_word_count,
        (SUM(CASE WHEN ${articles.status} = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))::float as generation_success_rate
      FROM ${articles}
      WHERE ${articles.createdAt} >= ${thirtyDaysAgoStr}::timestamp
    `);

    // Get user metrics
    const userMetrics = await db.execute(sql`
      WITH active_users AS (
        SELECT DISTINCT ${articles.userId}
        FROM ${articles}
        WHERE ${articles.createdAt} >= ${thirtyDaysAgoStr}::timestamp
      )
      SELECT 
        (SELECT COUNT(*)::int FROM ${users}) as total_users,
        (SELECT COUNT(*)::int FROM active_users) as active_users,
        (SELECT COUNT(*)::float FROM ${articles}) / (SELECT COUNT(*)::float FROM ${users}) as average_articles_per_user
    `);

    return {
      success: true,
      data: {
        userGrowth: (userGrowth as any[]).map(row => ({
          date: row.date,
          count: Number(row.count)
        })),
        contentMetrics: {
          totalArticles: Number((contentMetrics as any[])[0].total_articles),
          averageWordCount: Number((contentMetrics as any[])[0].average_word_count),
          totalWordCount: Number((contentMetrics as any[])[0].total_word_count),
          generationSuccessRate: Number((contentMetrics as any[])[0].generation_success_rate)
        },
        userMetrics: {
          totalUsers: Number((userMetrics as any[])[0].total_users),
          activeUsers: Number((userMetrics as any[])[0].active_users),
          averageArticlesPerUser: Number((userMetrics as any[])[0].average_articles_per_user)
        }
      }
    };
  }),

  settings: adminMiddleware.query(async () => {
    const [systemSettings] = await db
      .select()
      .from(settings)
      .limit(1);

    if (!systemSettings) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "System settings not found",
      });
    }

    return {
      success: true,
      data: systemSettings,
    };
  }),

  updateSettings: adminMiddleware
    .input(
      z.object({
        siteName: z.string(),
        maxArticlesPerUser: z.number(),
        allowNewRegistrations: z.boolean(),
        requireEmailVerification: z.boolean(),
        maintenanceMode: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const [updatedSettings] = await db
        .update(settings)
        .set({
          siteName: input.siteName,
          maxArticlesPerUser: input.maxArticlesPerUser,
          allowNewRegistrations: input.allowNewRegistrations,
          requireEmailVerification: input.requireEmailVerification,
          maintenanceMode: input.maintenanceMode,
          updatedAt: new Date(),
        })
        .returning();

      return {
        success: true,
        data: updatedSettings,
      };
    }),

  users: adminMiddleware.query(async () => {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        subscriptionTier: users.subscriptionTier,
        articleCreditsRemaining: users.articleCreditsRemaining,
        subscriptionStartDate: users.subscriptionStartDate,
        subscriptionEndDate: users.subscriptionEndDate,
        status: users.status,
        lastLoginDate: users.lastLoginDate,
        totalArticlesGenerated: users.totalArticlesGenerated,
      })
      .from(users)
      .orderBy(users.createdAt);

    return {
      success: true,
      data: allUsers,
    };
  }),

  updateUser: adminMiddleware
    .input(
      z.object({
        userId: z.number(),
        isAdmin: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const [updatedUser] = await db
        .update(users)
        .set({
          isAdmin: input.isAdmin,
          updatedAt: new Date(),
        })
        .where(sql`${users.id} = ${input.userId}`)
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        success: true,
        data: updatedUser,
      };
    }),

  updateUserSubscription: adminMiddleware
    .input(
      z.object({
        userId: z.number(),
        tier: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const [updatedUser] = await db
        .update(users)
        .set({
          subscriptionTier: input.tier,
          updatedAt: new Date(),
        })
        .where(sql`${users.id} = ${input.userId}`)
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        success: true,
        data: updatedUser,
      };
    }),

  updateUserCredits: adminMiddleware
    .input(
      z.object({
        userId: z.number(),
        credits: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const [updatedUser] = await db
        .update(users)
        .set({
          articleCreditsRemaining: input.credits,
          updatedAt: new Date(),
        })
        .where(sql`${users.id} = ${input.userId}`)
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        success: true,
        data: updatedUser,
      };
    }),

  updateUserStatus: adminMiddleware
    .input(
      z.object({
        userId: z.number(),
        status: z.enum(["active", "suspended", "pending"]),
      })
    )
    .mutation(async ({ input }) => {
      const [updatedUser] = await db
        .update(users)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(sql`${users.id} = ${input.userId}`)
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        success: true,
        data: updatedUser,
      };
    }),
});