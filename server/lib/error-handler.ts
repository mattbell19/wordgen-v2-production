import { Request, Response, NextFunction } from 'express';

// Define custom error types for different scenarios
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR', isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.isOperational = isOperational; // Indicates if this is an expected error
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: string = 'UNAUTHENTICATED') {
    super(message, 401, code, true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action', code: string = 'UNAUTHORIZED') {
    super(message, 403, code, true);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string>;

  constructor(message: string = 'Validation failed', errors: Record<string, string> = {}, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code, true);
    this.errors = errors;
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(resource: string, id?: string | number, code: string = 'RESOURCE_NOT_FOUND') {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    super(message, 404, code, true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', code: string = 'DATABASE_ERROR') {
    super(message, 500, code, true);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error', code: string = 'EXTERNAL_SERVICE_ERROR') {
    super(`${service}: ${message}`, 502, code, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', code: string = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, code, true);
  }
}

// Error handling middleware for Express
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    status: (err as AppError).status,
    code: (err as AppError).code,
    path: req.path,
    method: req.method
  });

  // Always set content type to application/json for API routes
  if (req.path.startsWith('/api/')) {
    res.type('application/json');
  }

  // If the error is one of our application errors
  if (err instanceof AppError) {
    if (req.path.startsWith('/api/')) {
      return res.status(err.status).json({
        success: false,
        error: err.code,
        message: err.message,
        ...(err instanceof ValidationError && { errors: err.errors }),
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    }
    return res.status(err.status).send(err.message);
  }

  // For unknown errors, return a generic error in production
  const statusCode = 500;
  if (req.path.startsWith('/api/')) {
    return res.status(statusCode).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  }
  return res.status(statusCode).send('An unexpected error occurred');
};

// Async handler to catch exceptions in async route handlers
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Utility to format validation errors from Zod
export const formatZodErrors = (errors: any): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};

  if (errors && errors.issues) {
    for (const issue of errors.issues) {
      const path = issue.path.join('.');
      formattedErrors[path] = issue.message;
    }
  }

  return formattedErrors;
};

// Global error catcher for unhandled Promise rejections
export const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Do not exit the process in production, just log the error
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // In production, we might want to do some cleanup and restart the process
    if (process.env.NODE_ENV === 'production') {
      // Allow the process to finish any ongoing requests
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
};