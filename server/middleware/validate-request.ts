import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import ApiResponse from '../lib/api-response';

/**
 * Middleware to validate request body against a Zod schema
 * @param schema Zod schema to validate against
 */
export function validateRequest<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.errors.map(error => ({
          path: error.path.join('.'),
          message: error.message
        }));
        
        return ApiResponse.badRequest(
          res, 
          'Validation error', 
          'VALIDATION_ERROR', 
          { errors }
        );
      }
      
      // Replace req.body with validated data
      req.body = result.data;
      next();
    } catch (error: any) {
      return ApiResponse.badRequest(
        res, 
        error.message || 'Invalid request data', 
        'VALIDATION_ERROR'
      );
    }
  };
}
