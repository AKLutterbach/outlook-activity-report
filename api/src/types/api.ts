import { Request } from 'express';

/**
 * Authenticated user context
 */
export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  displayName?: string;
}

/**
 * Extended Express Request with user context
 */
export interface AuthRequest extends Request {
  user: AuthUser;
}

/**
 * API Error Response
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * API Success Response (generic)
 */
export interface ApiResponse<T = any> {
  data: T;
}
