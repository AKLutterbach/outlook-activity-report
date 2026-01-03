import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { generatePKCEChallenge, generateState } from '../auth/pkce';
import { cosmosClient } from '../db/cosmosClient';

// Temporary state storage (use Cosmos container for production)
const pkceStateContainer = cosmosClient.database('outlookweekly').container('pkce-state');

const authStart: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    const { verifier, challenge } = generatePKCEChallenge();
    const state = generateState();
    
    // Store verifier keyed by state (5 min TTL)
    await pkceStateContainer.items.create({
      id: state,
      verifier,
      createdAt: new Date(),
      ttl: 300 // 5 minutes
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
    
    context.res = {
      status: 302,
      headers: { Location: authUrl.toString() }
    };
  } catch (err: any) {
    context.log.error('Auth start failed:', err);
    context.res = {
      status: 500,
      body: { error: 'Failed to initiate auth' }
    };
  }
};

export default authStart;
