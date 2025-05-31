import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data: any = null, message: string = 'Success') {
    return res.status(200).json({
      success: true,
      data,
      message
    });
  }

  static error(res: Response, status: number = 500, message: string = 'Internal server error', code: string = 'INTERNAL_ERROR', data: any = null) {
    return res.status(status).json({
      success: false,
      message,
      code,
      data
    });
  }

  static unauthorized(res: Response, message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    return this.error(res, 401, message, code);
  }

  static forbidden(res: Response, message: string = 'Forbidden', code: string = 'FORBIDDEN', data: any = null) {
    return this.error(res, 403, message, code, data);
  }

  static badRequest(res: Response, message: string = 'Bad request', code: string = 'BAD_REQUEST', data: any = null) {
    return this.error(res, 400, message, code, data);
  }

  static notFound(res: Response, message: string = 'Not found', code: string = 'NOT_FOUND') {
    return this.error(res, 404, message, code);
  }
}

export default ApiResponse; 