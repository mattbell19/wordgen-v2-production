/**
 * Enhanced Input Validation Middleware
 * Provides comprehensive input validation and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import ApiResponse from '../lib/api-response';
import { ValidationError } from '../lib/error-handler';

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Invalid email format').max(254),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim(),
  url: z.string().url('Invalid URL format').max(2048),
  id: z.number().int().positive('ID must be a positive integer'),
  uuid: z.string().uuid('Invalid UUID format'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens').max(100),
  text: z.string().max(10000, 'Text must be less than 10,000 characters'),
  html: z.string().max(50000, 'HTML content must be less than 50,000 characters'),
  keyword: z.string().min(1, 'Keyword is required').max(200, 'Keyword must be less than 200 characters').trim(),
  wordCount: z.number().int().min(100, 'Word count must be at least 100').max(10000, 'Word count must be less than 10,000'),
};

// Sanitization options
interface SanitizationOptions {
  allowHtml?: boolean;
  stripTags?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
}

/**
 * Sanitize string input to prevent XSS and other attacks
 */
export function sanitizeString(input: string, options: SanitizationOptions = {}): string {
  const {
    allowHtml = false,
    stripTags = true,
    maxLength = 10000,
    trimWhitespace = true
  } = options;

  let sanitized = input;

  // Trim whitespace if requested
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Handle HTML content
  if (allowHtml) {
    // Use DOMPurify to clean HTML while preserving safe tags
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  } else {
    // Remove potentially dangerous characters first
    sanitized = sanitized.replace(/[<>'"&]/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match] || match;
    });

    if (stripTags) {
      // Strip all HTML tags after entity encoding
      sanitized = sanitized.replace(/&lt;[^&]*&gt;/g, '');
    }
  }

  return sanitized;
}

/**
 * Recursively sanitize an object
 */
export function sanitizeObject(obj: any, options: SanitizationOptions = {}): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeString(key, { stripTags: true, maxLength: 100 });
      sanitized[sanitizedKey] = sanitizeObject(value, options);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validation middleware factory
 */
export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}, sanitizationOptions: SanitizationOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: Record<string, string> = {};

      // Sanitize request data first
      if (req.body) {
        req.body = sanitizeObject(req.body, sanitizationOptions);
      }
      if (req.query) {
        req.query = sanitizeObject(req.query, sanitizationOptions);
      }
      if (req.params) {
        req.params = sanitizeObject(req.params, sanitizationOptions);
      }

      // Validate body
      if (schema.body) {
        try {
          req.body = schema.body.parse(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            error.issues.forEach(issue => {
              errors[`body.${issue.path.join('.')}`] = issue.message;
            });
          }
        }
      }

      // Validate query parameters
      if (schema.query) {
        try {
          req.query = schema.query.parse(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            error.issues.forEach(issue => {
              errors[`query.${issue.path.join('.')}`] = issue.message;
            });
          }
        }
      }

      // Validate URL parameters
      if (schema.params) {
        try {
          req.params = schema.params.parse(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            error.issues.forEach(issue => {
              errors[`params.${issue.path.join('.')}`] = issue.message;
            });
          }
        }
      }

      // If there are validation errors, return them
      if (Object.keys(errors).length > 0) {
        return ApiResponse.validationError(res, errors, 'Validation failed', 'VALIDATION_ERROR');
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      return ApiResponse.error(res, 500, 'Validation error occurred', 'VALIDATION_ERROR');
    }
  };
}

/**
 * File upload validation middleware
 */
export function validateFileUpload(options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
} = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    required = false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as any;

    if (!files && required) {
      return ApiResponse.badRequest(res, 'File upload is required', 'FILE_REQUIRED');
    }

    if (!files) {
      return next();
    }

    // Validate each uploaded file
    for (const [fieldName, file] of Object.entries(files)) {
      const fileData = file as any;

      // Check file size
      if (fileData.size > maxSize) {
        return ApiResponse.badRequest(
          res,
          `File ${fieldName} is too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
          'FILE_TOO_LARGE'
        );
      }

      // Check file type
      if (!allowedTypes.includes(fileData.mimetype)) {
        return ApiResponse.badRequest(
          res,
          `File ${fieldName} has invalid type. Allowed types: ${allowedTypes.join(', ')}`,
          'INVALID_FILE_TYPE'
        );
      }

      // Sanitize filename
      if (fileData.name) {
        fileData.name = sanitizeString(fileData.name, { stripTags: true, maxLength: 255 });
      }
    }

    next();
  };
}

/**
 * Request size validation middleware
 */
export function validateRequestSize(maxSize: number = 10 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSize) {
      return ApiResponse.badRequest(
        res,
        `Request too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
        'REQUEST_TOO_LARGE'
      );
    }

    next();
  };
}

/**
 * SQL injection prevention middleware
 */
export function preventSqlInjection(req: Request, res: Response, next: NextFunction) {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(--|\/\*|\*\/|;|'|"|`)/,
    /(\bOR\b|\bAND\b).*?[=<>]/i,
    /\b(WAITFOR|DELAY)\b/i,
    /\b(XP_|SP_)\w+/i
  ];

  // Paths that should be excluded from SQL injection checks (AI-generated content)
  const excludedPaths = [
    'body.content',        // Article content
    'body.title',          // Article titles
    'body.description',    // Article descriptions
    'body.keyword',        // Keywords
    'body.primaryKeyword', // Primary keywords
    'body.callToAction'    // Call to action text
  ];

  function checkForSqlInjection(obj: any, path: string = ''): string | null {
    // Skip checking if this path is excluded (AI-generated content)
    if (excludedPaths.includes(path)) {
      return null;
    }

    if (typeof obj === 'string') {
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(obj)) {
          return `${path}: Potential SQL injection detected`;
        }
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const result = checkForSqlInjection(obj[i], `${path}[${i}]`);
        if (result) return result;
      }
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const result = checkForSqlInjection(value, path ? `${path}.${key}` : key);
        if (result) return result;
      }
    }
    return null;
  }

  // Check body, query, and params for SQL injection patterns
  const bodyCheck = checkForSqlInjection(req.body, 'body');
  const queryCheck = checkForSqlInjection(req.query, 'query');
  const paramsCheck = checkForSqlInjection(req.params, 'params');

  if (bodyCheck || queryCheck || paramsCheck) {
    console.warn('Potential SQL injection attempt detected:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      issue: bodyCheck || queryCheck || paramsCheck,
      timestamp: new Date().toISOString()
    });

    return ApiResponse.badRequest(res, 'Invalid input detected', 'INVALID_INPUT');
  }

  next();
}

export default {
  validateRequest,
  validateFileUpload,
  validateRequestSize,
  preventSqlInjection,
  sanitizeString,
  sanitizeObject,
  commonSchemas
};
