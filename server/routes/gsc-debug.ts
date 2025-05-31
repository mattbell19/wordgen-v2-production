import { Router } from 'express';
import type { Request, Response } from 'express';
import ApiResponse from '../lib/api-response';

const router = Router();

// Debug route (no auth required)
router.get('/', (req: Request, res: Response) => {
  console.log('GSC debug route called');
  return ApiResponse.success(res, { message: 'GSC debug route working' });
});

export default router;
