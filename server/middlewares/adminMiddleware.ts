import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-expect-error user is added by auth middleware
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify admin status from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        isAdmin: true
      }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 