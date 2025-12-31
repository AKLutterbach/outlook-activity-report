import { CosmosClient, Database, Container } from '@azure/cosmos';
import { COSMOS_CONTAINERS } from '@outlook-weekly/shared';

/**
 * Cosmos DB client configuration
 */
export interface CosmosConfig {
  endpoint: string;
  key: string;
  databaseId: string;
}

/**
 * Cosmos DB client wrapper
 * Provides access to database and containers
 */
export class CosmosDbClient {
  private client: CosmosClient;
  private database: Database | null = null;
  private config: CosmosConfig;

  constructor(config: CosmosConfig) {
    this.config = config;
    this.client = new CosmosClient({
      endpoint: config.endpoint,
      key: config.key,
    });
  }

  /**
   * Get or create the database
   */
  async getDatabase(): Promise<Database> {
    if (this.database) {
      return this.database;
    }
    this.database = this.client.database(this.config.databaseId);
    return this.database;
  }

  /**
   * Get a container by ID
   */
  async getContainer(containerId: string): Promise<Container> {
    const database = await this.getDatabase();
    return database.container(containerId);
  }

  /**
   * Bootstrap: create database and containers if they don't exist
   */
  async bootstrap(): Promise<void> {
    console.log(`[Cosmos] Bootstrapping database: ${this.config.databaseId}`);

    // Create database if not exists
    const { database } = await this.client.databases.createIfNotExists({
      id: this.config.databaseId,
    });
    this.database = database;

    console.log(`[Cosmos] Database ready: ${database.id}`);

    // Create containers if not exist
    for (const containerConfig of COSMOS_CONTAINERS) {
      const { container } = await database.containers.createIfNotExists({
        id: containerConfig.id,
        partitionKey: containerConfig.partitionKey,
      });
      console.log(
        `[Cosmos] Container ready: ${container.id} (partition key: ${containerConfig.partitionKey})`
      );
    }

    console.log('[Cosmos] Bootstrap complete');
  }
}

/**
 * Create a CosmosDbClient from environment variables
 */
export function createCosmosClient(): CosmosDbClient {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = process.env.COSMOS_DATABASE_ID || 'outlook-weekly';

  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be set in environment variables');
  }

  return new CosmosDbClient({ endpoint, key, databaseId });
}
