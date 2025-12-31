/**
 * Office SSO Token Verification Middleware
 * 
 * Validates Office SSO access tokens from OfficeRuntime.auth.getAccessToken
 * 
 * Azure AD App Registration Requirements:
 * 1. Create an Azure AD app registration
 * 2. Under "Expose an API":
 *    - Set Application ID URI to: api://<your-domain>/<client-id>
 *      For local dev: api://localhost:3001/<client-id>
 *    - Add a scope: access_as_user (User.Read or similar)
 * 3. Under "API permissions":
 *    - Add Microsoft Graph delegated permissions (User.Read, Mail.Read, etc.)
 * 4. Under "Authentication":
 *    - Add SPA platform with redirect URI: https://localhost:3001
 * 5. Note your Client ID and Tenant ID for env vars
 * 
 * Environment Variables Required:
 * - AZURE_CLIENT_ID: Your Azure AD app (client) ID
 * - AZURE_TENANT_ID: Your Azure AD tenant ID (or "common", "organizations", "consumers")
 * - AZURE_CLIENT_SECRET: (Optional, only needed for OBO flow)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'common';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;

if (!AZURE_CLIENT_ID) {
  console.error('⚠️  AZURE_CLIENT_ID not set. Office SSO validation will fail.');
}

// JWKS client for Microsoft identity platform
const jwksUri = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`;
const client = jwksClient({
  jwksUri,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

/**
 * Get signing key for JWT verification
 */
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify Office SSO token
 */
export function verifyOfficeToken(options: {
  requireScopes?: string[];
  acceptAudience?: string[]; // Additional accepted audiences
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No authorization token provided' });
        return;
      }

      const token = authHeader.substring(7);

      // Verify and decode token
      const decoded: any = await new Promise((resolve, reject) => {
        jwt.verify(
          token,
          getKey,
          {
            audience: [
              AZURE_CLIENT_ID!,
              `api://${AZURE_CLIENT_ID}`,
              `api://localhost:3001/${AZURE_CLIENT_ID}`,
              ...(options.acceptAudience || [])
            ],
            issuer: [
              `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`,
              `https://sts.windows.net/${AZURE_TENANT_ID}/`
            ],
            algorithms: ['RS256']
          },
          (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded);
          }
        );
      });

      // Check required scopes if specified
      if (options.requireScopes && options.requireScopes.length > 0) {
        const tokenScopes = decoded.scp?.split(' ') || [];
        const hasRequiredScope = options.requireScopes.some(scope =>
          tokenScopes.includes(scope)
        );

        if (!hasRequiredScope) {
          res.status(403).json({
            error: 'Insufficient permissions',
            requiredScopes: options.requireScopes
          });
          return;
        }
      }

      // Attach user info to request
      (req as any).user = {
        oid: decoded.oid, // Object ID (user ID in Azure AD)
        tid: decoded.tid, // Tenant ID
        name: decoded.name,
        email: decoded.preferred_username || decoded.upn || decoded.email,
        scopes: decoded.scp?.split(' ') || [],
        appId: decoded.appid || decoded.azp,
        token // Store original token for OBO if needed
      };

      console.log('[Office SSO] Token verified for user:', (req as any).user.email);
      next();

    } catch (error: any) {
      console.error('[Office SSO] Token verification failed:', error.message);

      if (error.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token expired' });
        return;
      }

      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

/**
 * TypeScript type for authenticated request
 */
export interface AuthenticatedRequest extends Request {
  user: {
    oid: string;
    tid: string;
    name?: string;
    email: string;
    scopes: string[];
    appId?: string;
    token: string;
  };
}
