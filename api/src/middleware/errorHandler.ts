import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../types/api';

/**
 * Custom API Error class
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error handling middleware
 * Converts errors to consistent API error responses
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ApiError = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    };
    return res.status(400).json(response);
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    const response: ApiError = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    return res.status(err.statusCode).json(response);
  }

  // Handle Cosmos DB errors
  if ((err as any).code === 404) {
    const response: ApiError = {
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    };
    return res.status(404).json(response);
  }

  // Generic error fallback
  const response: ApiError = {
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
  };
  return res.status(500).json(response);
}

/**
 * Async route handler wrapper
 * Catches promise rejections and passes to error handler
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
