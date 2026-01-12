import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

async function authSignout(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return {
    status: 200,
    headers: {
      'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
    },
    jsonBody: { success: true }
  };
}

app.http('auth-signout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/signout',
  handler: authSignout
});
