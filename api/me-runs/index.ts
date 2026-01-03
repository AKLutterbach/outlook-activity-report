import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';
import { reportRunRepository } from '../../db/repositories';

const meRuns: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionToken = cookies['session'];
    
    if (!sessionToken) {
      context.res = { status: 401, body: { error: 'Unauthorized' } };
      return;
    }
    
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as any;
    const { tenantId, userId } = decoded;
    
    const runs = await reportRunRepository.findByUser(tenantId, userId);
    
    context.res = {
      status: 200,
      body: { runs }
    };
  } catch (err: any) {
    context.log.error('Failed to fetch runs:', err);
    context.res = {
      status: 500,
      body: { error: 'Failed to fetch runs' }
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

export default meRuns;
