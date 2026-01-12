import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as msal from '@azure/msal-node';
import { createMsalClient, saveMsalCache } from '../src/auth/msalCache';
import { cosmosClient } from '../src/db/cosmosClient';
import jwt from 'jsonwebtoken';

const pkceStateContainer = cosmosClient.database('outlookweekly').container('pkce-state');

async function authExchange(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await req.json() as any;
    const { code, state } = body;
    
    if (!code || !state) {
      return { status: 400, jsonBody: { error: 'Missing code or state' } };
    }
    
    // Retrieve and delete verifier
    const stateRecord = await pkceStateContainer.item(state, state).read();
    if (!stateRecord.resource) {
      return { status: 400, jsonBody: { error: 'Invalid or expired state' } };
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
    
    return {
      status: 200,
      headers: {
        'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`
      },
      jsonBody: { userId, email, tenantId }
    };
  } catch (err: any) {
    context.error('Token exchange failed:', err);
    return {
      status: 500,
      jsonBody: { error: 'Token exchange failed', details: err.message }
    };
  }
}

app.http('auth-exchange', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/exchange',
  handler: authExchange
});
