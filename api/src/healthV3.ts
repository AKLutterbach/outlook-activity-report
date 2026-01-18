/**
 * Azure Functions v3 Programming Model - Health Check
 * Using the traditional function.json + handler export pattern
 * No TypeScript types to avoid v4 package conflicts
 */

// Using 'any' types to avoid @azure/functions v4 type conflicts
const httpTrigger = async function (context: any, req: any): Promise<void> {
  context.res = {
    status: 200,
    body: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      message: 'Health check using v3 model'
    },
    headers: {
      'Content-Type': 'application/json'
    }
  };
};

export default httpTrigger;
