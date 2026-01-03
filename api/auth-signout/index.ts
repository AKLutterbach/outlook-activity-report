import { AzureFunction, Context, HttpRequest } from '@azure/functions';

const authSignout: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  context.res = {
    status: 200,
    headers: {
      'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'
    },
    body: { success: true }
  };
};

export default authSignout;
