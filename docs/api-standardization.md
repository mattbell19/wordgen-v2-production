# API Response Standardization

This document outlines the plan for standardizing API responses across all endpoints in the WordGen v2 application.

## Current Issues

1. Inconsistent response formats across different endpoints
2. Lack of standardized error codes
3. Inconsistent HTTP status code usage
4. Missing or inconsistent error messages

## Standardized Response Format

All API responses should follow this standard format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data goes here
  },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Optional additional error details
  }
}
```

## Standard Error Codes

We will use the following standardized error codes:

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `UNAUTHORIZED` | User is not authenticated | 401 |
| `FORBIDDEN` | User does not have permission | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_SERVER_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `DUPLICATE_ENTRY` | Resource already exists | 409 |
| `INVALID_TOKEN` | Invalid or expired token | 401 |
| `SESSION_EXPIRED` | User session has expired | 401 |
| `MISSING_PARAMETER` | Required parameter is missing | 400 |
| `INVALID_PARAMETER` | Parameter has invalid value | 400 |
| `API_ERROR` | External API error | 502 |

## Implementation Plan

### 1. Create/Update ApiResponse Utility

Update the existing `ApiResponse` utility to support all standard response formats and error codes:

```typescript
// server/lib/api-response.ts
export default class ApiResponse {
  static success(res, data, message = '') {
    return res.json({
      success: true,
      data,
      message
    });
  }

  static error(res, status, message, errorCode, details = null) {
    return res.status(status).json({
      success: false,
      error: errorCode,
      message,
      ...(details ? { details } : {})
    });
  }

  static unauthorized(res, message = 'Authentication required', errorCode = 'UNAUTHORIZED') {
    return this.error(res, 401, message, errorCode);
  }

  static forbidden(res, message = 'Permission denied', errorCode = 'FORBIDDEN') {
    return this.error(res, 403, message, errorCode);
  }

  static notFound(res, message = 'Resource not found', errorCode = 'NOT_FOUND') {
    return this.error(res, 404, message, errorCode);
  }

  static badRequest(res, message = 'Invalid request', errorCode = 'VALIDATION_ERROR') {
    return this.error(res, 400, message, errorCode);
  }

  static conflict(res, message = 'Resource already exists', errorCode = 'DUPLICATE_ENTRY') {
    return this.error(res, 409, message, errorCode);
  }

  static tooManyRequests(res, message = 'Too many requests', errorCode = 'RATE_LIMIT_EXCEEDED') {
    return this.error(res, 429, message, errorCode);
  }

  static serverError(res, message = 'Internal server error', errorCode = 'INTERNAL_SERVER_ERROR') {
    return this.error(res, 500, message, errorCode);
  }

  static serviceUnavailable(res, message = 'Service temporarily unavailable', errorCode = 'SERVICE_UNAVAILABLE') {
    return this.error(res, 503, message, errorCode);
  }
}
```

### 2. Update Routes

Update all routes to use the standardized ApiResponse utility:

1. Update authentication routes
2. Update article routes
3. Update word routes
4. Update AI routes
5. Update SEO audit routes

### 3. Update Error Handling Middleware

Create or update the global error handling middleware to use the standardized format:

```typescript
// server/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../lib/api-response';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Global error handler caught:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return ApiResponse.badRequest(res, err.message, 'VALIDATION_ERROR');
  }

  if (err.name === 'UnauthorizedError') {
    return ApiResponse.unauthorized(res, err.message, 'UNAUTHORIZED');
  }

  if (err.name === 'NotFoundError') {
    return ApiResponse.notFound(res, err.message, 'NOT_FOUND');
  }

  // Default to internal server error
  return ApiResponse.serverError(res, 'An unexpected error occurred', 'INTERNAL_SERVER_ERROR');
}
```

### 4. Update Client-Side Error Handling

Update the client-side code to handle the standardized error responses:

```typescript
// client/src/lib/api-utils.ts
export async function fetchJSON<T = any>(url: string, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || `API Error: ${response.status}`);
    (error as any).status = response.status;
    (error as any).errorCode = data.error;
    (error as any).details = data.details;
    throw error;
  }

  return data.data;
}
```

### 5. Add Error Boundary Components

Create or update error boundary components to display user-friendly error messages:

```tsx
// client/src/components/error-boundary.tsx
import React from 'react';
import { ErrorDisplay } from './ui/error-display';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred'}
          errorCode={(this.state.error as any)?.errorCode || 'UNKNOWN_ERROR'}
        />
      );
    }

    return this.props.children;
  }
}
```

## Testing Plan

1. Test all endpoints with valid inputs to ensure success responses follow the standard format
2. Test all endpoints with invalid inputs to ensure error responses follow the standard format
3. Test client-side error handling to ensure errors are properly displayed to the user
4. Test error boundary components to ensure they catch and display errors properly

## Conclusion

By implementing these changes, we will ensure that all API responses follow a consistent format, making it easier for the client to handle responses and display appropriate messages to the user. This will improve the overall user experience and make the application more maintainable.
