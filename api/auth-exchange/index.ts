import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import * as msal from '@azure/msal-node';
import { createMsalClient, saveMsalCache } from '../auth/msalCache';
import { cosmosClient } from '../db/cosmosClient';
import jwt from 'jsonwebtoken';

const pkceStateContainer = cosmosClient.database('outlookweekly').container('pkce-state');

const authExchange: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    const { code, state } = req.body;
    
    if (!code || !state) {
      context.res = { status: 400, body: { error: 'Missing code or state' } };
      return;
    }
    
    // Retrieve and delete verifier
    const stateRecord = await pkceStateContainer.item(state, state).read();
    if (!stateRecord.resource) {
      context.res = { status: 400, body: { error: 'Invalid or expired state' } };
      return;
    }
    
    const { verifier } = stateRecord.resource;
    await pkceStateContainer.item(state, state).delete();
    
    // Get tenant from code (will be in token claims after exchange)
    const redirectUri = `${process.env.SWA_URL}/auth-callback.html`;
    
    const tokenCache = new msal.TokenCache();
    const msalClient = createMsalClient('organizations', tokenCache);
    
    const tokenRequest: msal.AuthorizationCodeRequest = {
      code,
      scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'Calendars.Read', 'offline_access'],
      redirectUri,
      codeVerifier: verifier
    };
    
    const response = await msalClient.acquireTokenByCode(tokenRequest);
    
    if (!response?.account) {
      throw new Error('No account in token response');
    }
    
    const tenantId = response.account.tenantId;
    const userId = response.account.homeAccountId; // Use homeAccountId as stable user identifier
    const email = response.account.username;
    
    // Save MSAL cache (includes refresh token internally)
    await saveMsalCache(tenantId, userId, tokenCache);
    
    // Create session token (HttpOnly cookie)
    const sessionToken = jwt.sign(
      { tenantId, userId, email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    context.res = {
      status: 200,
      headers: {
        'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`
      },
      body: { userId, email, tenantId }
    };
  } catch (err: any) {
    context.log.error('Token exchange failed:', err);
    context.res = {
      status: 500,
      body: { error: 'Token exchange failed', details: err.message }
    };
  }
};

export default authExchange;
