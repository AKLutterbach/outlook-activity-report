import jwt from 'jsonwebtoken';

/**
 * JWT session token utilities
 * Creates and verifies session tokens for API authentication
 */

export interface SessionPayload {
  userId: string;
  tenantId: string;
  email: string;
}

/**
 * Generate a JWT session token
 * @param payload - User session data
 * @param secret - JWT secret from environment
 * @param expiresIn - Token expiration (default: 7 days)
 * @returns JWT token string
 */
export function generateSessionToken(
  payload: SessionPayload,
  secret: string,
  expiresIn: string = '7d'
): string {
  if (!secret) {
    throw new Error('JWT secret not configured');
  }

  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'outlook-weekly-api',
    audience: 'outlook-weekly-addin',
  });
}

/**
 * Verify and decode a JWT session token
 * @param token - JWT token string
 * @param secret - JWT secret from environment
 * @returns Decoded session payload
 */
export function verifySessionToken(
  token: string,
  secret: string
): SessionPayload {
  if (!secret) {
    throw new Error('JWT secret not configured');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'outlook-weekly-api',
      audience: 'outlook-weekly-addin',
    }) as SessionPayload;

    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Session expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid session token');
    }
    throw error;
  }
}
