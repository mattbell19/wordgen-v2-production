import { Request, Response, NextFunction } from "express";
import type { SelectUser } from "@db/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('[requireAuth] Checking authentication:', {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id,
      cookie: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({
        ok: false,
        message: 'Authentication required',
        isAuthenticated: false
      });
    }
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      ok: false,
      message: 'Internal server error',
      isAuthenticated: false
    });
  }
};