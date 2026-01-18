/**
 * MINIMAL Azure Functions v4 Entry Point - HEALTH CHECK ONLY
 * This is a test to verify Azure deployment works with zero dependencies
 */

import { app, HttpResponseInit } from '@azure/functions';

// Single health check endpoint with NO external dependencies
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (): Promise<HttpResponseInit> => {
    return {
      status: 200,
      jsonBody: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        message: 'Minimal health check - no dependencies'
      }
    };
  }
});
