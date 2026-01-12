import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { reportRunRepository } from '../src/db/repositories';
import { QueueClient } from '@azure/storage-queue';

const queueClient = new QueueClient(
  process.env.AZURE_STORAGE_CONNECTION_STRING!,
  'report-generation'
);

async function meGenerate(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

app.http('me-generate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'me/generate',
  handler: meGenerate
});
