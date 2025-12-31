import { Router, Response } from 'express';
import { DateTime } from 'luxon';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types/api';
import { ReportRunRepository, UserSettingsRepository, UserTokenRepository } from '../db';
import { CosmosDbClient } from '../db/cosmosClient';
import { RunStatus } from '@outlook-weekly/shared';
import { getGraphClient } from '../services/graphClient';

export function createGenerateRouter(cosmosClient: CosmosDbClient) {
  const router = Router();
  const runRepo = new ReportRunRepository(cosmosClient);
  const settingsRepo = new UserSettingsRepository(cosmosClient);
  const tokenRepo = new UserTokenRepository(cosmosClient);

  /**
   * POST /me/generate
   * Generate a report on-demand and create a draft email
   */
  router.post(
    '/',
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const now = DateTime.utc();
      
      // Get user settings to determine report window
      const settings = await settingsRepo.get(req.user.userId);
      if (!settings) {
        throw new AppError('SETTINGS_NOT_FOUND', 'User settings not found. Please configure settings first.', 404);
      }

      // Compute report window based on cadence
      let windowStart: string;
      let windowEnd: string;
      
      switch (settings.cadence) {
        case 'WEEKLY':
          windowStart = now.minus({ weeks: 1 }).startOf('week').toISO()!;
          windowEnd = now.minus({ weeks: 1 }).endOf('week').toISO()!;
          break;
        case 'BIWEEKLY':
          windowStart = now.minus({ weeks: 2 }).startOf('week').toISO()!;
          windowEnd = now.minus({ weeks: 1 }).endOf('week').toISO()!;
          break;
        case 'MONTHLY':
          windowStart = now.minus({ months: 1 }).startOf('month').toISO()!;
          windowEnd = now.minus({ months: 1 }).endOf('month').toISO()!;
          break;
        default:
          windowStart = now.minus({ weeks: 1 }).startOf('week').toISO()!;
          windowEnd = now.minus({ weeks: 1 }).endOf('week').toISO()!;
      }

      // Create a run record
      const run = await runRepo.create(
        req.user.userId,
        req.user.tenantId,
        windowStart,
        windowEnd
      );

      try {
        // Get Microsoft Graph client
        const graphClient = await getGraphClient(req.user.userId, tokenRepo);

        // Generate static HTML report content
        const reportHtml = generateStaticReportHtml(
          req.user.email,
          req.user.displayName || req.user.email,
          windowStart,
          windowEnd,
          settings.cadence
        );

        // Create draft email using Microsoft Graph
        const draftMessage = await graphClient.api('/me/messages').post({
          subject: `Weekly Report: ${DateTime.fromISO(windowStart).toFormat('MMM d')} - ${DateTime.fromISO(windowEnd).toFormat('MMM d, yyyy')}`,
          body: {
            contentType: 'HTML',
            content: reportHtml,
          },
          toRecipients: [
            {
              emailAddress: {
                address: req.user.email,
              },
            },
          ],
        });

        // Update run with success status and draft message ID
        const completedRun = await runRepo.update(run.id, req.user.userId, {
          status: RunStatus.SUCCESS,
          completedAt: now.toISO(),
          draftMessageId: draftMessage.id,
        });

        res.status(202).json({
          data: {
            runId: completedRun.id,
            status: completedRun.status,
            draftMessageId: draftMessage.id,
            message: 'Draft email created successfully',
          },
        });
      } catch (error) {
        console.error('Error generating report:', error);
        
        // Update run with error status
        await runRepo.update(run.id, req.user.userId, {
          status: RunStatus.ERROR,
          completedAt: now.toISO(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        });

        throw new AppError(
          'REPORT_GENERATION_FAILED',
          'Failed to generate report and create draft email',
          500,
          error instanceof Error ? error.message : undefined
        );
      }
    })
  );

  return router;
}

/**
 * Generate static HTML report content
 * This is a placeholder - in a real implementation, this would fetch
 * calendar and email data from Microsoft Graph
 */
function generateStaticReportHtml(
  userEmail: string,
  displayName: string,
  windowStart: string,
  windowEnd: string,
  cadence: string
): string {
  const startDate = DateTime.fromISO(windowStart);
  const endDate = DateTime.fromISO(windowEnd);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Outlook Weekly Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #0078d4;
      border-bottom: 3px solid #0078d4;
      padding-bottom: 10px;
    }
    h2 {
      color: #106ebe;
      margin-top: 30px;
    }
    .info {
      background: #f0f6ff;
      padding: 15px;
      border-left: 4px solid #0078d4;
      margin: 20px 0;
    }
    .placeholder {
      background: #fff4ce;
      padding: 15px;
      border-left: 4px solid #ffb900;
      margin: 20px 0;
    }
    .section {
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Outlook Weekly Report</h1>
    
    <div class="info">
      <p><strong>Report Period:</strong> ${startDate.toFormat('MMMM d, yyyy')} - ${endDate.toFormat('MMMM d, yyyy')}</p>
      <p><strong>Generated For:</strong> ${displayName} (${userEmail})</p>
      <p><strong>Cadence:</strong> ${cadence}</p>
      <p><strong>Generated:</strong> ${DateTime.utc().toFormat('MMMM d, yyyy h:mm a')} UTC</p>
    </div>

    <div class="placeholder">
      <p><strong>⚠️ This is a placeholder report</strong></p>
      <p>Calendar event and email data will be included in future updates. This report demonstrates the draft email creation functionality.</p>
    </div>

    <div class="section">
      <h2>📅 Calendar Summary</h2>
      <p><em>Calendar events for the report period will appear here.</em></p>
      <ul>
        <li>Total meetings: (pending implementation)</li>
        <li>Meeting hours: (pending implementation)</li>
        <li>Top attendees: (pending implementation)</li>
      </ul>
    </div>

    <div class="section">
      <h2>📧 Email Activity</h2>
      <p><em>Email statistics for the report period will appear here.</em></p>
      <ul>
        <li>Emails sent: (pending implementation)</li>
        <li>Top recipients: (pending implementation)</li>
        <li>Email response time: (pending implementation)</li>
      </ul>
    </div>

    <div class="footer">
      <p>This report was automatically generated by Outlook Weekly.</p>
      <p>To modify your report settings, open the Outlook Weekly add-in.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
