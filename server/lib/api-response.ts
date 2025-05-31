import { Response } from 'express';

/**
 * Standard API response format:
 * {
 *   success: boolean,
 *   data?: any,
 *   error?: string,
 *   message?: string,
 *   errors?: Record<string, string>,
 *   meta?: {
 *     page?: number,
 *     perPage?: number,
 *     total?: number,
 *     totalPages?: number,
 *     ...any other metadata
 *   }
 * }
 */

interface PaginationData {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface ResponseMeta extends Partial<PaginationData> {
  [key: string]: any;
}

export class ApiResponse {
  /**
   * Ensure response has JSON content type
   */
  private static ensureJsonContentType(res: Response): void {
    res.type('application/json');
  }

  /**
   * Send a success response
   */
  public static success<T>(res: Response, data: T, message: string = '', meta?: ResponseMeta): Response {
    this.ensureJsonContentType(res);
    return res.status(200).json({
      success: true,
      data,
      message: message || undefined,
      meta: meta || undefined
    });
  }

  /**
   * Send a created resource response (201)
   */
  public static created<T>(res: Response, data: T, message: string = 'Resource created successfully'): Response {
    this.ensureJsonContentType(res);
    return res.status(201).json({
      success: true,
      data,
      message
    });
  }

  /**
   * Send a no content response (204)
   */
  public static noContent(res: Response): Response {
    // No need to set content type for 204 responses as they have no body
    return res.status(204).send();
  }

  /**
   * Send an error response
   */
  public static error(
    res: Response,
    status: number = 500,
    message: string = 'An error occurred',
    error: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ): Response {
    this.ensureJsonContentType(res);
    return res.status(status).json({
      success: false,
      message,
      error,
      ...(details && { details })
    });
  }

  /**
   * Send a bad request error response (400)
   */
  public static badRequest(
    res: Response,
    message: string = 'Bad request',
    error: string = 'BAD_REQUEST',
    errors?: Record<string, string>
  ): Response {
    return ApiResponse.error(res, 400, message, error, errors ? { errors } : undefined);
  }

  /**
   * Send an unauthorized error response (401)
   */
  public static unauthorized(
    res: Response,
    message: string = 'Authentication required',
    error: string = 'UNAUTHENTICATED'
  ): Response {
    return ApiResponse.error(res, 401, message, error);
  }

  /**
   * Send a forbidden error response (403)
   */
  public static forbidden(
    res: Response,
    message: string = 'You do not have permission to perform this action',
    error: string = 'UNAUTHORIZED',
    details?: any
  ): Response {
    return ApiResponse.error(res, 403, message, error, details);
  }

  /**
   * Send a not found error response (404)
   */
  public static notFound(
    res: Response,
    message: string = 'Resource not found',
    error: string = 'RESOURCE_NOT_FOUND'
  ): Response {
    return ApiResponse.error(res, 404, message, error);
  }

  /**
   * Send a validation error response (422)
   */
  public static validationError(
    res: Response,
    errors: Record<string, string>,
    message: string = 'Validation failed',
    error: string = 'VALIDATION_ERROR'
  ): Response {
    return ApiResponse.error(res, 422, message, error, { errors });
  }

  /**
   * Send a rate limit exceeded error response (429)
   */
  public static tooManyRequests(
    res: Response,
    message: string = 'Rate limit exceeded',
    error: string = 'RATE_LIMIT_EXCEEDED'
  ): Response {
    return ApiResponse.error(res, 429, message, error);
  }

  /**
   * Send a conflict error response (409)
   */
  public static conflict(
    res: Response,
    message: string = 'Resource already exists',
    error: string = 'DUPLICATE_ENTRY'
  ): Response {
    return ApiResponse.error(res, 409, message, error);
  }

  /**
   * Send a service unavailable error response (503)
   */
  public static serviceUnavailable(
    res: Response,
    message: string = 'Service temporarily unavailable',
    error: string = 'SERVICE_UNAVAILABLE'
  ): Response {
    return ApiResponse.error(res, 503, message, error);
  }

  /**
   * Send a bad gateway error response (502)
   */
  public static badGateway(
    res: Response,
    message: string = 'Bad gateway',
    error: string = 'BAD_GATEWAY'
  ): Response {
    return ApiResponse.error(res, 502, message, error);
  }

  /**
   * Send a server error response (500)
   */
  public static serverError(
    res: Response,
    message: string = 'Internal server error',
    error: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ): Response {
    return ApiResponse.error(res, 500, message, error, details);
  }

  /**
   * Send a pagination response
   */
  public static paginate<T>(
    res: Response,
    data: T[],
    page: number,
    perPage: number,
    total: number,
    message: string = ''
  ): Response {
    const totalPages = Math.ceil(total / perPage);
    return ApiResponse.success(res, data, message, {
      page,
      perPage,
      total,
      totalPages
    });
  }
}

// Export default for convenient imports
export default ApiResponse;