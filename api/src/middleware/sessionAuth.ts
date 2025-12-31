import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/api';
import { verifySessionToken, SessionPayload } from '../utils/jwt';

/**
 * Session authentication middleware
 * Validates JWT session token from Authorization header
 */
export function sessionAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;

  if (!jwtSecret) {
    res.status(500).json({
      error: {
        code: 'SERVER_CONFIG_ERROR',
        message: 'Authentication not configured',
      },
    });
    return;
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'No authentication token provided',
      },
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify and decode JWT
    const session: SessionPayload = verifySessionToken(token, jwtSecret);

    // Set user context on request
    req.user = {
      userId: session.userId,
      tenantId: session.tenantId,
      email: session.email,
      displayName: session.email.split('@')[0], // Fallback display name
    };

    next();
  } catch (error: any) {
    console.error('[SessionAuth] Token verification failed:', error.message);
    
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Invalid or expired session',
      },
    });
    return;
  }
}
