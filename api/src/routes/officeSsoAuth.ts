/**
 * Office SSO Authentication Routes
 * 
 * POST /api/auth/exchange - Exchange Office SSO token for app session token
 * GET /api/me - Get current user info
 * GET /api/graph/profile - (Optional) Get user profile from Microsoft Graph using OBO
 */

import { Router, Response } from 'express';
import { verifyOfficeToken, AuthenticatedRequest } from '../middleware/officeSsoAuth';
import { generateSessionToken } from '../utils/jwt';
import { CosmosDbClient } from '../db/cosmosClient';
import { ConfidentialClientApplication } from '@azure/msal-node';

export function createOfficeSsoAuthRouter(cosmosClient: CosmosDbClient) {
  const router = Router();

/**
 * POST /api/auth/exchange
 * Exchange Office SSO token for app session JWT
 */
router.post('/exchange', verifyOfficeToken(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oid, tid, name, email } = req.user;

    console.log('[Auth] Exchanging token for user:', email);

    // Get or create user in database
    const userId = oid; // Use Azure AD object ID as user ID
    const tenantId = tid;

    // Check if user exists, create if not
    let user;
    try {
      user = await cosmosClient.getUser(userId, tenantId);
    } catch (err) {
      // User doesn't exist, create new user
      console.log('[Auth] Creating new user:', email);
      user = await cosmosClient.createUser({
        id: userId,
        tenantId,
        email,
        name: name || email,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Generate app session JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const sessionToken = generateSessionToken(
      { userId, tenantId, email },
      jwtSecret
    );

    res.json({
      sessionToken,
      user: {
        id: userId,
        email,
        name: name || email
      }
    });

  } catch (error: any) {
    console.error('[Auth] Exchange failed:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

/**
 * GET /api/me
 * Get current user info from Office SSO token
 */
router.get('/me', verifyOfficeToken(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oid, tid, name, email } = req.user;

    res.json({
      id: oid,
      tenantId: tid,
      name,
      email
    });

  } catch (error: any) {
    console.error('[Auth] Get user failed:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * GET /api/graph/profile
 * (Optional) Get user profile from Microsoft Graph using On-Behalf-Of (OBO) flow
 * 
 * Requirements:
 * 1. AZURE_CLIENT_SECRET must be set
 * 2. Azure AD app must have Microsoft Graph API permissions
 * 3. Office SSO token must have been issued with appropriate scopes
 */
router.get('/graph/profile', verifyOfficeToken(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.AZURE_TENANT_ID || 'common';

    if (!clientSecret) {
      res.status(500).json({ error: 'OBO flow not configured. AZURE_CLIENT_SECRET required.' });
      return;
    }

    // Create MSAL confidential client
    const msalConfig = {
      auth: {
        clientId: clientId!,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret
      }
    };

    const cca = new ConfidentialClientApplication(msalConfig);

    // Exchange Office token for Graph token using OBO
    const oboRequest = {
      oboAssertion: req.user.token,
      scopes: ['https://graph.microsoft.com/User.Read']
    };

    console.log('[Graph] Acquiring token via OBO for user:', req.user.email);
    const oboResponse = await cca.acquireTokenOnBehalfOf(oboRequest);

    if (!oboResponse || !oboResponse.accessToken) {
      throw new Error('Failed to acquire Graph token');
    }

    // Call Microsoft Graph /me endpoint
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${oboResponse.accessToken}`
      }
    });

    if (!graphResponse.ok) {
      throw new Error(`Graph API returned ${graphResponse.status}`);
    }

    const profile = await graphResponse.json();

    res.json({
      profile,
      fromGraph: true
    });

  } catch (error: any) {
    console.error('[Graph] OBO failed:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('AADSTS65001')) {
      res.status(403).json({
        error: 'Consent required for Microsoft Graph access',
        details: 'User or admin must consent to Graph permissions'
      });
      return;
    }

    res.status(500).json({ error: 'Failed to get Graph profile', details: error.message });
  }
});

  return router;
}
