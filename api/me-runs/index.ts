import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { reportRunRepository } from '../src/db/repositories';

async function meRuns(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

app.http('me-runs', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me/runs',
  handler: meRuns
});
