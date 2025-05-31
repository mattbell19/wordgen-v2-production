import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { subscriptions, subscriptionPlans, userUsage } from "@db/schema";
import { eq, and } from "drizzle-orm";

export async function checkUsageLimits(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip usage check for non-authenticated routes
    if (!req.user?.id) {
      return next();
    }

    const userId = req.user.id;

    // Get current user's usage
    const [usage] = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, userId));

    // If no usage record exists, create one
    if (!usage) {
      await db.insert(userUsage).values({
        userId,
        totalArticlesGenerated: 0,
        freeArticlesUsed: 0,
        freeKeywordReportsUsed: 0,
        totalKeywordsAnalyzed: 0,
        totalWordCount: 0,
      });
      return next();
    }

    // Get active subscription if any
    const [subscription] = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      );

    // Check usage based on subscription status
    if (subscription) {
      // Paid subscription checks
      const { plan } = subscription;

      if (req.path.includes("/api/articles")) {
        if (plan.articleLimit && usage.totalArticlesGenerated >= plan.articleLimit) {
          return res.status(403).json({
            error: "usage_limit_exceeded",
            message: "You have reached your monthly article generation limit",
            limit: plan.articleLimit,
            used: usage.totalArticlesGenerated,
            upgrade: true
          });
        }
      }

      if (req.path.includes("/api/keywords")) {
        if (plan.keywordReportLimit && usage.totalKeywordsAnalyzed >= plan.keywordReportLimit) {
          return res.status(403).json({
            error: "usage_limit_exceeded",
            message: "You have reached your monthly keyword report limit",
            limit: plan.keywordReportLimit,
            used: usage.totalKeywordsAnalyzed,
            upgrade: true
          });
        }
      }
    } else {
      // Free tier checks
      if (req.path.includes("/api/articles")) {
        console.log('[Usage] Checking free tier article usage:', {
          userId: userId,
          freeArticlesUsed: usage.freeArticlesUsed,
          limit: 3
        });
        
        if (usage.freeArticlesUsed >= 3) {
          return res.status(403).json({
            error: "free_tier_limit_exceeded",
            message: "You have used all your free articles. Please upgrade to continue.",
            limit: 3,
            used: usage.freeArticlesUsed,
            upgrade: true,
            plans: [
              {
                name: "Pay-As-You-Go",
                price: 5,
                description: "$5 per article"
              },
              {
                name: "Starter Plan",
                price: 75,
                description: "$75/month for 25 articles"
              }
            ]
          });
        }
      }

      if (req.path.includes("/api/keywords")) {
        if (usage.freeKeywordReportsUsed >= 1) {
          return res.status(403).json({
            error: "free_tier_limit_exceeded",
            message: "You have used your free keyword report. Please upgrade to continue.",
            limit: 1,
            used: usage.freeKeywordReportsUsed,
            upgrade: true,
            plans: [
              {
                name: "Starter Plan",
                price: 75,
                description: "Includes 10 keyword reports/month"
              }
            ]
          });
        }
      }
    }

    next();
  } catch (error: any) {
    console.error("[Usage] Error checking usage limits:", error);
    // Don't block the request on usage check errors
    next();
  }
}

export async function trackUsage(req: Request, res: Response, next: NextFunction) {
  // Skip tracking for non-authenticated routes
  if (!req.user?.id) {
    return next();
  }

  const userId = req.user.id;

  // Ensure user has a usage record
  const [usage] = await db
    .select()
    .from(userUsage)
    .where(eq(userUsage.userId, userId));

  if (!usage) {
    await db.insert(userUsage).values({
      userId,
      totalArticlesGenerated: 0,
      freeArticlesUsed: 0,
      freeKeywordReportsUsed: 0,
      totalKeywordsAnalyzed: 0,
      totalWordCount: 0,
    });
  }

  // Store the original end function
  const originalEnd = res.end;
  const originalJson = res.json;

  // Override the end function
  res.end = function (this: Response, ...args: any[]) {
    // Only track successful requests
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Track usage based on the endpoint
      if (req.path.includes("/api/articles")) {
        void db.transaction(async (tx) => {
          console.log('[Usage] Starting usage tracking transaction for article generation');
          
          // Get subscription status
          const [subscription] = await tx
            .select({
              subscription: subscriptions,
              plan: subscriptionPlans,
            })
            .from(subscriptions)
            .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
            .where(
              and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.status, "active")
              )
            );

          console.log('[Usage] Subscription status:', subscription ? 'Active' : 'Free tier');

          const [usage] = await tx
            .select()
            .from(userUsage)
            .where(eq(userUsage.userId, userId));

          console.log('[Usage] Current usage state:', {
            userId,
            totalArticlesGenerated: usage?.totalArticlesGenerated,
            freeArticlesUsed: usage?.freeArticlesUsed
          });

          if (usage) {
            const updateData: any = {
              lastArticleDate: new Date(),
              updatedAt: new Date(),
            };

            // Only increment freeArticlesUsed if user doesn't have an active subscription
            if (!subscription) {
              updateData.freeArticlesUsed = usage.freeArticlesUsed + 1;
              console.log(`[Usage] Incrementing free articles used for user ${userId} from ${usage.freeArticlesUsed} to ${usage.freeArticlesUsed + 1}`);
            }

            await tx
              .update(userUsage)
              .set(updateData)
              .where(eq(userUsage.userId, userId));

            console.log('[Usage] Updated usage record:', updateData);
          }
        });
      }

      if (req.path.includes("/api/keywords")) {
        void db.transaction(async (tx) => {
          const [subscription] = await tx
            .select({
              subscription: subscriptions,
              plan: subscriptionPlans,
            })
            .from(subscriptions)
            .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
            .where(
              and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.status, "active")
              )
            );

          const [usage] = await tx
            .select()
            .from(userUsage)
            .where(eq(userUsage.userId, userId));

          if (usage) {
            const updateData: any = {
              totalKeywordsAnalyzed: usage.totalKeywordsAnalyzed + 1,
              lastKeywordDate: new Date(),
              updatedAt: new Date(),
            };

            // Only increment freeKeywordReportsUsed if user doesn't have an active subscription
            if (!subscription) {
              updateData.freeKeywordReportsUsed = usage.freeKeywordReportsUsed + 1;
            }

            await tx
              .update(userUsage)
              .set(updateData)
              .where(eq(userUsage.userId, userId));
          }
        });
      }
    }

    // Call the original end function
    return originalEnd.apply(this, args);
  };

  // Override the json function to maintain the chain
  res.json = function (this: Response, body: any) {
    originalJson.call(this, body);
    return this;
  };

  next();
}