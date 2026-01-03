import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { reportRunRepository } from '../../db/repositories';
import { QueueClient } from '@azure/storage-queue';

const queueClient = new QueueClient(
  process.env.AZURE_STORAGE_CONNECTION_STRING!,
  'report-generation'
);

const meGenerate: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionToken = cookies['session'];
    
    if (!sessionToken) {
      context.res = { status: 401, body: { error: 'Unauthorized' } };
      return;
    }
    
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as any;
    const { tenantId, userId, email } = decoded;
    
    const { windowStart, windowEnd, cadence } = req.body;
    
    // Create run record
    const runId = uuidv4();
    await reportRunRepository.create({
      id: runId,
      tenantId,
      userId,
      cadence: cadence || 'weekly',
      windowStart: new Date(windowStart || Date.now() - 7 * 24 * 60 * 60 * 1000),
      windowEnd: new Date(windowEnd || Date.now()),
      status: 'QUEUED',
      createdAt: new Date()
    });
    
    // Enqueue message
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
    
    context.res = {
      status: 202,
      body: { runId, status: 'QUEUED' }
    };
  } catch (err: any) {
    context.log.error('Generate failed:', err);
    context.res = {
      status: 500,
      body: { error: 'Failed to queue generation', details: err.message }
    };
  }
};

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

export default meGenerate;
