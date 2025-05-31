import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../lib/api-response';

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  public errors: Record<string, string>;
  
  constructor(message: string, errors: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Permission denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ApiError extends Error {
  constructor(message: string = 'External API error') {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log the error
  console.error('Global error handler caught:', {
    error: err.message,
    stack: err.stack,
    name: err.name,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Handle specific error types
  if (err instanceof ValidationError) {
    return ApiResponse.validationError(res, err.errors, err.message);
  }

  if (err instanceof NotFoundError) {
    return ApiResponse.notFound(res, err.message);
  }

  if (err instanceof UnauthorizedError) {
    return ApiResponse.unauthorized(res, err.message);
  }

  if (err instanceof ForbiddenError) {
    return ApiResponse.forbidden(res, err.message);
  }

  if (err instanceof ConflictError) {
    return ApiResponse.conflict(res, err.message);
  }

  if (err instanceof RateLimitError) {
    return ApiResponse.tooManyRequests(res, err.message);
  }

  if (err instanceof DatabaseError) {
    return ApiResponse.serverError(res, err.message, 'DATABASE_ERROR');
  }

  if (err instanceof ApiError) {
    return ApiResponse.badGateway(res, err.message, 'API_ERROR');
  }

  // Handle Drizzle ORM errors
  if (err.name === 'DrizzleError') {
    return ApiResponse.serverError(res, 'Database operation failed', 'DATABASE_ERROR');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token', 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired', 'TOKEN_EXPIRED');
  }

  // Handle other common errors
  if (err.code === 'ECONNREFUSED') {
    return ApiResponse.serviceUnavailable(res, 'Service unavailable', 'CONNECTION_REFUSED');
  }

  // Default to internal server error
  return ApiResponse.serverError(res, err.message || 'An unexpected error occurred');
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandler;
