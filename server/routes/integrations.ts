import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middlewares/authMiddleware";
import { Integration, AuthenticatedRequest, WhereClause } from "../types";

const router = Router();

// Get all integrations for the current user
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const integrations = await db.query.integrations.findMany({
    where: (integrations: Integration, { eq }: WhereClause) => eq(integrations.userId, req.user.id)
  });
  res.json(integrations);
});

// Add a new integration
router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { type, config } = req.body;
  const integration = await db.insert(db.integrations).values({
    type,
    config,
    userId: req.user.id
  });
  res.json(integration);
});

// Delete an integration
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  await db.delete(db.integrations).where(
    (integrations: Integration, { eq, and }: WhereClause) => 
      and(eq(integrations.id, parseInt(req.params.id)), eq(integrations.userId, req.user.id))
  );
  res.json({ success: true });
});

export const integrationRoutes = router; 