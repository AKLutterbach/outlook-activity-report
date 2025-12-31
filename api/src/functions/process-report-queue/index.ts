import { AzureFunction, Context } from '@azure/functions';
import { Client } from '@microsoft/microsoft-graph-client';
import { loadMsalCache, saveMsalCache, createMsalClient } from '../../auth/msalCache';
import { reportRunRepository } from '../../db/repositories';

const processReportQueue: AzureFunction = async (context: Context, queueItem: any): Promise<void> => {
  const { runId, tenantId, userId, email } = queueItem;
  
  try {
    context.log(`Processing report ${runId} for user ${email}`);
    
    // Load MSAL cache
    const tokenCache = await loadMsalCache(tenantId, userId);
    if (!tokenCache) {
      throw new Error('No token cache found - user must reconnect');
    }
    
    const msalClient = createMsalClient(tenantId, tokenCache);
    
    // Acquire token silently
    const accounts = await msalClient.getTokenCache().getAllAccounts();
    const account = accounts.find(a => a.homeAccountId === userId);
    
    if (!account) {
      throw new Error('Account not found in cache');
    }
    
    const tokenResponse = await msalClient.acquireTokenSilent({
      account,
      scopes: ['Mail.ReadWrite', 'Calendars.Read']
    });
    
    // Save updated cache (refresh token may have been refreshed)
    await saveMsalCache(tenantId, userId, msalClient.getTokenCache());
    
    // Create Graph client
    const graphClient = Client.init({
      authProvider: (done) => {
        done(null, tokenResponse.accessToken);
      }
    });
    
    // Create draft email (static HTML for now)
    const draft = await graphClient.api('/me/messages').post({
      subject: `Weekly Report - ${new Date().toLocaleDateString()}`,
      body: {
        contentType: 'HTML',
        content: `
          <html>
            <body>
              <h2>Your Weekly Report</h2>
              <p>Report generated on ${new Date().toLocaleString()}</p>
              <p><strong>Status:</strong> Success</p>
              <p>Future: Calendar meetings and PDF attachment will appear here.</p>
            </body>
          </html>
        `
      },
      toRecipients: [{ emailAddress: { address: email } }]
    });
    
    // Update run status
    await reportRunRepository.updateStatus(runId, 'SUCCESS', {
      messageId: draft.id,
      completedAt: new Date()
    });
    
    context.log(`Report ${runId} completed successfully`);
  } catch (err: any) {
    context.log.error(`Report ${runId} failed:`, err);
    
    const isAuthError = err.errorCode === 'interaction_required' || 
                        err.message?.includes('AADSTS');
    
    await reportRunRepository.updateStatus(runId, isAuthError ? 'FAILED_AUTH' : 'FAILED', {
      errorMessage: err.message,
      completedAt: new Date()
    });
  }
};

export default processReportQueue;
