import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';

async function me(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}

app.http('me', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: me
});
