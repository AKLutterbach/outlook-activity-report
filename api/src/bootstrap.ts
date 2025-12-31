#!/usr/bin/env node

/**
 * Bootstrap script for Cosmos DB
 * 
 * Creates the database and containers if they don't exist.
 * Run this before starting the application for the first time.
 * 
 * Usage:
 *   npm run bootstrap
 */

import 'dotenv/config';
import { createCosmosClient } from './db/cosmosClient';

async function bootstrap() {
  try {
    console.log('='.repeat(60));
    console.log('Cosmos DB Bootstrap');
    console.log('='.repeat(60));
    console.log('');

    const cosmosClient = createCosmosClient();
    await cosmosClient.bootstrap();

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Bootstrap complete!');
    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Bootstrap failed:');
    console.error(error);
    console.error('='.repeat(60));
    console.error('');
    console.error('Make sure:');
    console.error('1. Cosmos DB Emulator is running (or you have valid Azure credentials)');
    console.error('2. COSMOS_ENDPOINT and COSMOS_KEY are set in your .env file');
    console.error('3. The endpoint is accessible from your machine');
    console.error('');
    process.exit(1);
  }
}

bootstrap();
