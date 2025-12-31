import 'dotenv/config';
import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { createCosmosClient } from './db/cosmosClient';
import { sessionAuth } from './middleware/sessionAuth';
import { errorHandler } from './middleware/errorHandler';
import healthRouter from './routes/health';
import { createAuthRouter } from './routes/auth';
import { createOfficeSsoAuthRouter } from './routes/officeSsoAuth';
import { createSettingsRouter } from './routes/settings';
import { createRunsRouter } from './routes/runs';
import { createGenerateRouter } from './routes/generate';
import { createPdfRouter } from './routes/pdf';

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Initialize Cosmos DB client
  console.log('[Server] Initializing Cosmos DB connection...');
  const cosmosClient = createCosmosClient();
  console.log('[Server] Cosmos DB client ready');

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  }));
  app.use(express.json());

  // Request logging
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Health check (no auth required)
  app.use('/health', healthRouter);

  // Office SSO authentication routes (validates Office tokens)
  const officeSsoAuthRouter = createOfficeSsoAuthRouter(cosmosClient);
  app.use('/api/auth', officeSsoAuthRouter);
  app.use('/api', officeSsoAuthRouter); // Also mount /api/me and /api/graph/*

  // Legacy OAuth authentication routes (no auth required) - keep for now
  app.use('/auth', createAuthRouter(cosmosClient));

  // Session authentication middleware for /me routes
  app.use('/me', sessionAuth as any);

  // Authenticated routes
  app.use('/me/settings', createSettingsRouter(cosmosClient));
  app.use('/me/runs', createRunsRouter(cosmosClient));
  app.use('/me/runs', createPdfRouter());
  app.use('/me/generate', createGenerateRouter(cosmosClient));

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // Start HTTPS server for development
  await new Promise<void>((resolve, reject) => {
    let server;
    
    if (process.env.NODE_ENV === 'development') {
      // Use self-signed certificate in development
      const certPath = path.join(__dirname, '../.cert/localhost.pfx');
      
      if (fs.existsSync(certPath)) {
        const pfx = fs.readFileSync(certPath);
        const httpsOptions = {
          pfx: pfx,
          passphrase: 'outlook-weekly-dev',
        };
        
        server = https.createServer(httpsOptions, app);
        server.listen(port, () => {
          console.log('='.repeat(60));
          console.log(`✅ Outlook Weekly API Server`);
          console.log('='.repeat(60));
          console.log(`Port:        ${port} (HTTPS)`);
          console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
          console.log(`Auth:        Microsoft Entra OAuth 2.0`);
          console.log(`Health:      https://localhost:${port}/health`);
          console.log(`OAuth:       https://localhost:${port}/auth/login`);
          console.log('='.repeat(60));
        });
      } else {
        console.log('[Server] Certificate not found at', certPath);
        console.log('[Server] Falling back to HTTP');
        server = app.listen(port, () => {
          console.log('='.repeat(60));
          console.log(`✅ Outlook Weekly API Server`);
          console.log('='.repeat(60));
          console.log(`Port:        ${port} (HTTP)`);
          console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
          console.log(`Auth:        Microsoft Entra OAuth 2.0`);
          console.log(`Health:      http://localhost:${port}/health`);
          console.log(`OAuth:       http://localhost:${port}/auth/login`);
          console.log('='.repeat(60));
        });
      }
    } else {
      // Production uses HTTP behind a reverse proxy (nginx/Azure App Service)
      server = app.listen(port, () => {
        console.log('='.repeat(60));
        console.log(`✅ Outlook Weekly API Server`);
        console.log('='.repeat(60));
        console.log(`Port:        ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('='.repeat(60));
      });
    }

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      reject(error);
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      console.log('\n[Server] SIGTERM received, closing server...');
      server.close(() => {
        console.log('[Server] Server closed');
        resolve();
      });
    });

    process.on('SIGINT', () => {
      console.log('\n[Server] SIGINT received, closing server...');
      server.close(() => {
        console.log('[Server] Server closed');
        resolve();
      });
    });
  });
}

// Start the server and keep it running
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
