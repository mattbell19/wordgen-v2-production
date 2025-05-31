import { Router } from 'express';
import type { Request, Response } from 'express';
import ApiResponse from '../lib/api-response';

const router = Router();

/**
 * Test route
 * GET /api/test
 */
router.get('/', (req: Request, res: Response) => {
  console.log('Test route called');
  return ApiResponse.success(res, { message: 'Test route working' });
});

export default router;
