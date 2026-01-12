/**
 * Azure Functions v4 Programming Model Entry Point
 * All HTTP functions are registered here
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

// ==================== HEALTH CHECK (NO DEPENDENCIES) ====================
// This function MUST load successfully even if Cosmos/MSAL/env are broken
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (): Promise<HttpResponseInit> => {
    return {
      status: 200,
      jsonBody: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version
      }
    };
  }
});

// ==================== LAZY-LOADED DEPENDENCIES ====================
// Import these only after health endpoint is registered
import { cosmosClient } from './db/cosmosClient';
import { reportRunRepository } from './db/repositories';
import { generatePKCEChallenge, generateState } from './auth/pkce';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { QueueClient } from '@azure/storage-queue';
import * as msal from '@azure/msal-node';
import { createMsalClient, saveMsalCache } from './auth/msalCache';

// Lazy init - will only crash if these functions are called, not at module load
let db: any;
let pkceStateContainer: any;
function getDb() {
  if (!db) {
    db = cosmosClient.client.database(process.env.COSMOS_DATABASE || 'OutlookReports');
    pkceStateContainer = db.container('pkce-state');
  }
  return { db, pkceStateContainer };
}

// Helper function
function parseCookies(cookieHeader: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

// ==================== AUTH FUNCTIONS ====================

app.http('auth-start', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/start',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const { verifier, challenge } = generatePKCEChallenge();
      const state = generateState();
      
      const { pkceStateContainer } = getDb();
      await pkceStateContainer.items.create({
        id: state,
        verifier,
        createdAt: new Date(),
        ttl: 300
      });
      
      const tenantId = process.env.ENTRA_TENANT_ID || 'organizations';
      const clientId = process.env.ENTRA_CLIENT_ID;
      const redirectUri = `${process.env.SWA_URL}/auth-callback.html`;
      
      const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
      authUrl.searchParams.set('client_id', clientId!);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('scope', 'User.Read Mail.Read Mail.ReadWrite Calendars.Read offline_access');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', challenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('prompt', 'select_account');
      
      return {
        status: 302,
        headers: { Location: authUrl.toString() }
      };
    } catch (err: any) {
      context.error('Auth start failed:', err);
      return {
        status: 500,
        jsonBody: { error: 'Failed to initiate auth' }
      };
    }
  }
});

app.http('auth-exchange', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/exchange',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = await req.json() as any;
      const { code, state } = body;
      
      if (!code || !state) {
        return { status: 400, jsonBody: { error: 'Missing code or state' } };
      }
      
      const { pkceStateContainer } = getDb();
      const stateRecord = await pkceStateContainer.item(state, state).read();
      if (!stateRecord.resource) {
        return { status: 400, jsonBody: { error: 'Invalid or expired state' } };
      }
      
      const { verifier } = stateRecord.resource;
      await pkceStateContainer.item(state, state).delete();
      
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
      const userId = response.account.homeAccountId;
      const email = response.account.username;
      
      await saveMsalCache(tenantId, userId, tokenCache);
      
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
});

app.http('auth-signout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/signout',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    return {
      status: 200,
      headers: {
        'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
      },
      jsonBody: { success: true }
    };
  }
});

// ==================== USER FUNCTIONS ====================

app.http('me', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = parseCookies(cookieHeader);
      const sessionToken = cookies['session'];
      
      if (!sessionToken) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } };
      }
      
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as any;
      
      return {
        status: 200,
        jsonBody: {
          userId: decoded.userId,
          email: decoded.email,
          tenantId: decoded.tenantId
        }
      };
    } catch (err) {
      return { status: 401, jsonBody: { error: 'Invalid session' } };
    }
  }
});

app.http('me-generate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'me/generate',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = parseCookies(cookieHeader);
      const sessionToken = cookies['session'];
      
      if (!sessionToken) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } };
      }
      
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as any;
      const { tenantId, userId, email } = decoded;
      
      const body = await req.json() as any;
      const { windowStart, windowEnd, cadence } = body;
      
      const runId = uuidv4();
      await reportRunRepository.create({
        id: runId,
        tenantId,
        userId,
        cadence: cadence || 'weekly',
        windowStart: new Date(windowStart || Date.now() - 7 * 24 * 60 * 60 * 1000),
        windowEnd: new Date(windowEnd || Date.now()),
        status: 'QUEUED' as any,
        createdAt: new Date()
      });
      
      const queueClient = new QueueClient(
        process.env.AZURE_STORAGE_CONNECTION_STRING!,
        'report-generation'
      );
      
      const message = Buffer.from(JSON.stringify({
        runId,
        tenantId,
        userId,
        email,
        windowStart,
        windowEnd,
        cadence
      })).toString('base64');
      
      await queueClient.sendMessage(message);
      
      return {
        status: 202,
        jsonBody: { runId, status: 'QUEUED' }
      };
    } catch (err: any) {
      context.error('Generate failed:', err);
      return {
        status: 500,
        jsonBody: { error: 'Failed to queue generation', details: err.message }
      };
    }
  }
});

app.http('me-runs', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me/runs',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = parseCookies(cookieHeader);
      const sessionToken = cookies['session'];
      
      if (!sessionToken) {
        return { status: 401, jsonBody: { error: 'Unauthorized' } };
      }
      
      const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as any;
      const { tenantId, userId } = decoded;
      
      const runs = await reportRunRepository.findByUser(tenantId, userId);
      
      return {
        status: 200,
        jsonBody: { runs }
      };
    } catch (err: any) {
      context.error('Failed to fetch runs:', err);
      return {
        status: 500,
        jsonBody: { error: 'Failed to fetch runs' }
      };
    }
  }
});

export default app;
