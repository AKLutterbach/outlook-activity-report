import { Router, Request, Response } from 'express';
import { DateTime } from 'luxon';
import { CosmosDbClient } from '../db/cosmosClient';
import { TenantRepository, UserRepository, UserTokenRepository } from '../db';
import { encryptToken } from '../utils/tokenEncryption';
import { generateSessionToken } from '../utils/jwt';

const MICROSOFT_AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const SCOPES = ['offline_access', 'User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Calendars.Read'];

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

interface UserInfo {
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail: string;
}

/**
 * Create OAuth authentication router
 */
export function createAuthRouter(cosmosClient: CosmosDbClient) {
  const router = Router();
  const tenantRepo = new TenantRepository(cosmosClient);
  const userRepo = new UserRepository(cosmosClient);
  const tokenRepo = new UserTokenRepository(cosmosClient);

  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const redirectUri = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3001/auth/callback';
  const encryptionSecret = process.env.ENCRYPTION_SECRET || process.env.SESSION_SECRET;
  const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;

  /**
   * GET /auth/login
   * Redirects user to Microsoft authorization endpoint
   */
  router.get('/login', (_req: Request, res: Response): void => {
    if (!clientId) {
      res.status(500).send('OAuth not configured - AZURE_CLIENT_ID missing');
      return;
    }

    const scopes = [
      'offline_access',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Calendars.Read',
      'https://graph.microsoft.com/User.Read',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      response_mode: 'query',
      prompt: 'select_account',
    });

    const authUrl = `${MICROSOFT_AUTHORIZE_URL}?${params.toString()}`;
    
    console.log('[OAuth] Redirecting to Microsoft login');
    res.redirect(authUrl);
  });

  /**
   * GET /auth/callback
   * Handles OAuth callback, exchanges code for tokens
   */
  router.get('/callback', async (req: Request, res: Response): Promise<void> => {
    const { code, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('[OAuth] Error from Microsoft:', error, error_description);
      
      if (error === 'admin_consent_required') {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Admin Consent Required</title>
            <style>
              body { font-family: sans-serif; padding: 40px; text-align: center; }
              .error { color: #d13438; }
            </style>
          </head>
          <body>
            <h2 class="error">Admin Consent Required</h2>
            <p>Your organization requires admin approval for this app.</p>
            <p>Please contact your IT administrator.</p>
            <button onclick="window.close()">Close</button>
          </body>
          </html>
        `);
      }

      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; }
            .error { color: #d13438; }
          </style>
        </head>
        <body>
          <h2 class="error">Authentication Failed</h2>
          <p>${error_description || 'An error occurred during authentication'}</p>
          <button onclick="window.close()">Close</button>
        </body>
        </html>
      `);
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Authorization code missing');
    }

    if (!clientId || !clientSecret) {
      return res.status(500).send('OAuth not configured');
    }

    try {
      console.log('[OAuth] Exchanging code for tokens');
      
      // Exchange authorization code for tokens
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('[OAuth] Token exchange failed:', errorData);
        throw new Error(errorData.error_description || 'Token exchange failed');
      }

      const tokens: TokenResponse = await tokenResponse.json();
      
      console.log('[OAuth] Tokens obtained, fetching user info');

      // Get user info from Microsoft Graph
      const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo: UserInfo = await userInfoResponse.json();
      
      console.log('[OAuth] User info:', { id: userInfo.id, email: userInfo.userPrincipalName });

      // Create or update tenant
      const tenantId = `tenant-${userInfo.id}`;
      await tenantRepo.upsert(tenantId, userInfo.displayName || 'Microsoft 365 User');

      // Create or update user
      const userId = `user-${userInfo.id}`;
      const email = userInfo.mail || userInfo.userPrincipalName;
      await userRepo.upsert(userId, tenantId, email, userInfo.displayName);

      // Encrypt and store refresh token
      if (!encryptionSecret || !jwtSecret) {
        throw new Error('Encryption/JWT secrets not configured');
      }

      const encryptedRefreshToken = encryptToken(tokens.refresh_token, encryptionSecret);
      
      // Check if user already has a token, update or create
      const existingToken = await tokenRepo.getLatestForUser(userId);
      if (existingToken) {
        await tokenRepo.update(existingToken.id, userId, {
          encryptedRefreshToken,
          scopes: SCOPES,
          tokenExpiry: undefined, // Refresh tokens don't expire
          updatedAt: DateTime.utc().toISO(),
        });
      } else {
        await tokenRepo.create(
          userId,
          tenantId,
          encryptedRefreshToken,
          SCOPES,
          undefined
        );
      }

      console.log('[OAuth] User and tokens stored successfully');

      // Generate session JWT
      const sessionToken = generateSessionToken(
        { userId, tenantId, email },
        jwtSecret
      );

      // Set CSP header to allow inline scripts
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"
      );

      // Return success page that posts message to opener and closes
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; }
            .success { color: #107c10; }
          </style>
        </head>
        <body>
          <h2 class="success">✓ Authentication Successful</h2>
          <p>Redirecting...</p>
          <script type="text/javascript">
            (function() {
              console.log('[Callback] Sending postMessage to opener');
              
              const payload = {
                type: 'auth-success',
                sessionToken: '${sessionToken}',
                email: '${email}'
              };
              
              try {
                // Try Office.js messageParent first (for desktop clients)
                if (typeof Office !== 'undefined' && Office.context && Office.context.ui && Office.context.ui.messageParent) {
                  console.log('[Callback] Using Office.context.ui.messageParent');
                  Office.context.ui.messageParent(JSON.stringify(payload));
                } 
                // Redirect to add-in main page with token in URL hash
                else {
                  console.log('[Callback] Redirecting to add-in with token in hash');
                  const redirectUrl = '${process.env.FRONTEND_URL || 'https://localhost:3001'}#auth=' + encodeURIComponent(JSON.stringify(payload));
                  window.location.href = redirectUrl;
                }
              } catch (err) {
                console.error('[Callback] Error sending message:', err);
                document.body.innerHTML += '<p style="color: red;">Error: ' + err.message + '</p>';
              }
            })();
          </script>
        </body>
        </html>
      `);
    } catch (error: any) {
      console.error('[OAuth] Callback error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; }
            .error { color: #d13438; }
          </style>
        </head>
        <body>
          <h2 class="error">Authentication Error</h2>
          <p>${error.message || 'An unexpected error occurred'}</p>
          <button onclick="window.close()">Close</button>
        </body>
        </html>
      `);
    }
  });

  return router;
}
