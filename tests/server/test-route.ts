import express from 'express';
import type { Request, Response } from 'express';

const router = express.Router();

router.get('/test-direct', (req: Request, res: Response) => {
  console.log('Test direct route called');
  res.json({ message: 'Test direct route working' });
});

export default router;
