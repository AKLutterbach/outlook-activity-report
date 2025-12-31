import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/api';
import { TenantRepository, UserRepository } from '../db';
import { CosmosDbClient } from '../db/cosmosClient';

/**
 * Mock authentication middleware for local development
 * 
 * In production, this would be replaced with OAuth/JWT validation.
 * For local dev, it reads USER_EMAIL from env and creates a dev user.
 */
export function createMockAuthMiddleware(cosmosClient: CosmosDbClient) {
  const tenantRepo = new TenantRepository(cosmosClient);
  const userRepo = new UserRepository(cosmosClient);

  // Dev tenant and user from environment
  const DEV_TENANT_ID = 'dev-tenant';
  const DEV_USER_EMAIL = process.env.USER_EMAIL || 'dev@example.com';
  const DEV_USER_ID = `user-${DEV_USER_EMAIL.replace(/[^a-z0-9]/gi, '-')}`;
  const DEV_USER_NAME = process.env.USER_NAME || 'Dev User';

  let initialized = false;

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Initialize dev tenant and user on first request
      if (!initialized) {
        await tenantRepo.upsert(DEV_TENANT_ID, 'Development Tenant');
        await userRepo.upsert(DEV_USER_ID, DEV_TENANT_ID, DEV_USER_EMAIL, DEV_USER_NAME);
        initialized = true;
        console.log(`[MockAuth] Initialized dev user: ${DEV_USER_EMAIL}`);
      }

      // Set user context on request
      req.user = {
        userId: DEV_USER_ID,
        tenantId: DEV_TENANT_ID,
        email: DEV_USER_EMAIL,
        displayName: DEV_USER_NAME,
      };

      next();
    } catch (error) {
      console.error('[MockAuth] Failed to initialize dev user:', error);
      res.status(500).json({
        error: {
          code: 'AUTH_INIT_FAILED',
          message: 'Failed to initialize authentication',
        },
      });
    }
  };
}
