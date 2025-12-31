import { app, InvocationContext, Timer } from '@azure/functions';

export async function schedulerTimer(timer: Timer, context: InvocationContext): Promise<void> {
  context.log('Scheduler timer function triggered', timer);

  // TODO: Find users with nextRunUtc in due window
  // TODO: For each user, execute report generation
  // TODO: Update nextRunUtc for next scheduled run

  context.log('Scheduler timer function completed');
}

app.timer('schedulerTimer', {
  schedule: '0 */5 * * * *', // Every 5 minutes
  handler: schedulerTimer,
});

export async function cleanupTimer(timer: Timer, context: InvocationContext): Promise<void> {
  context.log('Cleanup timer function triggered', timer);

  // TODO: Find PDFs older than 30 days
  // TODO: Delete blobs
  // TODO: Clear pdfBlobKey in database

  context.log('Cleanup timer function completed');
}

app.timer('cleanupTimer', {
  schedule: '0 0 2 * * *', // Daily at 2 AM
  handler: cleanupTimer,
});
