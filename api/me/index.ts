import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';

const me: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionToken = cookies['session'];
    
    if (!sessionToken) {
      context.res = { status: 401, body: { error: 'Unauthorized' } };
      return;
    }
    
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as any;
    
    context.res = {
      status: 200,
      body: {
        userId: decoded.userId,
        email: decoded.email,
        tenantId: decoded.tenantId
      }
    };
  } catch (err) {
    context.res = { status: 401, body: { error: 'Invalid session' } };
  }
};

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

export default me;
