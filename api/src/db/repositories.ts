import { Container } from '@azure/cosmos';
import {
  TenantDocument,
  UserDocument,
  UserTokenDocument,
  UserSettingsDocument,
  ReportRunDocument,
  SCHEMA_VERSIONS,
  Cadence,
  OutputMode,
  RunStatus,
} from '@outlook-weekly/shared';
import { CosmosDbClient } from './cosmosClient';

/**
 * Base repository with common methods
 */
abstract class BaseRepository {
  protected container: Container;

  constructor(protected cosmosClient: CosmosDbClient, protected containerId: string) {
    // Container will be initialized lazily
    this.container = null as any;
  }

  protected async getContainer(): Promise<Container> {
    if (!this.container) {
      this.container = await this.cosmosClient.getContainer(this.containerId);
    }
    return this.container;
  }

  protected now(): string {
    return new Date().toISOString();
  }
}

/**
 * Tenant repository
 * Partition key: /id
 */
export class TenantRepository extends BaseRepository {
  constructor(cosmosClient: CosmosDbClient) {
    super(cosmosClient, 'tenants');
  }

  async create(tenantId: string, displayName?: string): Promise<TenantDocument> {
    const container = await this.getContainer();
    const doc: TenantDocument = {
      id: tenantId,
      schemaVersion: SCHEMA_VERSIONS.tenant,
      displayName,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    const { resource } = await container.items.create(doc);
    return resource!;
  }

  async get(tenantId: string): Promise<TenantDocument | null> {
    const container = await this.getContainer();
    try {
      const { resource } = await container.item(tenantId, tenantId).read<TenantDocument>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(tenantId: string, displayName?: string): Promise<TenantDocument> {
    const existing = await this.get(tenantId);
    if (existing) {
      return existing;
    }
    return this.create(tenantId, displayName);
  }
}

/**
 * User repository
 * Partition key: /tenantId
 */
export class UserRepository extends BaseRepository {
  constructor(cosmosClient: CosmosDbClient) {
    super(cosmosClient, 'users');
  }

  async create(
    userId: string,
    tenantId: string,
    email: string,
    displayName?: string
  ): Promise<UserDocument> {
    const container = await this.getContainer();
    const doc: UserDocument = {
      id: userId,
      tenantId,
      schemaVersion: SCHEMA_VERSIONS.user,
      email,
      displayName,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    const { resource } = await container.items.create(doc);
    return resource!;
  }

  async get(userId: string, tenantId: string): Promise<UserDocument | null> {
    const container = await this.getContainer();
    try {
      const { resource } = await container.item(userId, tenantId).read<UserDocument>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(
    userId: string,
    tenantId: string,
    email: string,
    displayName?: string
  ): Promise<UserDocument> {
    const container = await this.getContainer();
    const existing = await this.get(userId, tenantId);

    const doc: UserDocument = {
      id: userId,
      tenantId,
      schemaVersion: SCHEMA_VERSIONS.user,
      email,
      displayName,
      createdAt: existing?.createdAt || this.now(),
      updatedAt: this.now(),
    };

    const { resource } = await container.items.upsert(doc);
    return resource as unknown as UserDocument;
  }
}

/**
 * User token repository
 * Partition key: /userId
 */
export class UserTokenRepository extends BaseRepository {
  constructor(cosmosClient: CosmosDbClient) {
    super(cosmosClient, 'userTokens');
  }

  async create(
    userId: string,
    tenantId: string,
    encryptedRefreshToken: string,
    scopes: string[],
    tokenExpiry?: string,
    msalCacheEncrypted?: string
  ): Promise<UserTokenDocument> {
    const container = await this.getContainer();
    const doc: UserTokenDocument = {
      id: this.generateId(),
      userId,
      tenantId,
      schemaVersion: SCHEMA_VERSIONS.userToken,
      encryptedRefreshToken,
      scopes,
      tokenExpiry,
      msalCacheEncrypted,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    const { resource } = await container.items.create(doc);
    return resource!;
  }

  async findByTenantAndUser(tenantId: string, userId: string): Promise<UserTokenDocument | null> {
    const container = await this.getContainer();
    const query = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId ORDER BY c.updatedAt DESC OFFSET 0 LIMIT 1',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@userId', value: userId }
      ],
    };

    const { resources } = await container.items.query<UserTokenDocument>(query).fetchAll();
    return resources.length > 0 ? resources[0] : null;
  }

  async upsertToken(
    tenantId: string,
    userId: string,
    data: { msalCacheEncrypted?: string; encryptedRefreshToken?: string; updatedAt: Date }
  ): Promise<UserTokenDocument> {
    const container = await this.getContainer();
    const existing = await this.findByTenantAndUser(tenantId, userId);
    
    if (existing) {
      const updated: UserTokenDocument = {
        ...existing,
        ...data,
        updatedAt: this.now()
      };
      const { resource } = await container.item(existing.id, userId).replace(updated);
      return resource!;
    } else {
      const doc: UserTokenDocument = {
        id: this.generateId(),
        userId,
        tenantId,
        schemaVersion: SCHEMA_VERSIONS.userToken,
        encryptedRefreshToken: data.encryptedRefreshToken || '',
        scopes: [],
        msalCacheEncrypted: data.msalCacheEncrypted,
        createdAt: this.now(),
        updatedAt: this.now(),
      };
      const { resource } = await container.items.create(doc);
      return resource!;
    }
  }

  async getLatestForUser(userId: string): Promise<UserTokenDocument | null> {
    const container = await this.getContainer();
    const query = {
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC OFFSET 0 LIMIT 1',
      parameters: [{ name: '@userId', value: userId }],
    };

    const { resources } = await container.items.query<UserTokenDocument>(query).fetchAll();
    return resources.length > 0 ? resources[0] : null;
  }

  async update(
    tokenId: string,
    userId: string,
    updates: Partial<UserTokenDocument>
  ): Promise<UserTokenDocument> {
    const container = await this.getContainer();
    const { resource: existing } = await container.item(tokenId, userId).read<UserTokenDocument>();
    if (!existing) {
      throw new Error(`Token not found: ${tokenId}`);
    }

    const updated: UserTokenDocument = {
      ...existing,
      ...updates,
      id: tokenId,
      userId,
      updatedAt: this.now(),
    };

    const { resource } = await container.item(tokenId, userId).replace(updated);
    return resource!;
  }

  private generateId(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * User settings repository
 * Partition key: /userId
 */
export class UserSettingsRepository extends BaseRepository {
  constructor(cosmosClient: CosmosDbClient) {
    super(cosmosClient, 'userSettings');
  }

  async create(
    userId: string,
    tenantId: string,
    settings: {
      cadence: Cadence;
      outputMode: OutputMode;
      dayOfWeek: number;
      timeOfDay: string;
      timezone: string;
      includeCalendar: boolean;
      includeSentMail: boolean;
      nextRunUtc: string;
    }
  ): Promise<UserSettingsDocument> {
    const container = await this.getContainer();
    const doc: UserSettingsDocument = {
      id: userId, // One settings doc per user
      userId,
      tenantId,
      schemaVersion: SCHEMA_VERSIONS.userSettings,
      cadence: settings.cadence,
      outputMode: settings.outputMode,
      dayOfWeek: settings.dayOfWeek,
      timeOfDay: settings.timeOfDay,
      timezone: settings.timezone,
      includeCalendar: settings.includeCalendar,
      includeSentMail: settings.includeSentMail,
      nextRunUtc: settings.nextRunUtc,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    const { resource } = await container.items.create(doc);
    return resource!;
  }

  async get(userId: string): Promise<UserSettingsDocument | null> {
    const container = await this.getContainer();
    try {
      const { resource } = await container.item(userId, userId).read<UserSettingsDocument>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(
    userId: string,
    tenantId: string,
    settings: {
      cadence: Cadence;
      outputMode: OutputMode;
      dayOfWeek: number;
      timeOfDay: string;
      timezone: string;
      includeCalendar: boolean;
      includeSentMail: boolean;
      nextRunUtc: string;
    }
  ): Promise<UserSettingsDocument> {
    const container = await this.getContainer();
    const existing = await this.get(userId);

    const doc: UserSettingsDocument = {
      id: userId,
      userId,
      tenantId,
      schemaVersion: SCHEMA_VERSIONS.userSettings,
      cadence: settings.cadence,
      outputMode: settings.outputMode,
      dayOfWeek: settings.dayOfWeek,
      timeOfDay: settings.timeOfDay,
      timezone: settings.timezone,
      includeCalendar: settings.includeCalendar,
      includeSentMail: settings.includeSentMail,
      nextRunUtc: settings.nextRunUtc,
      createdAt: existing?.createdAt || this.now(),
      updatedAt: this.now(),
    };

    const { resource } = await container.items.upsert(doc);
    return resource as unknown as UserSettingsDocument;
  }

  /**
   * Query users with nextRunUtc in the specified time window
   * Used by scheduler to find due jobs
   */
  async queryDueUsers(startUtc: string, endUtc: string): Promise<UserSettingsDocument[]> {
    const container = await this.getContainer();
    const query = {
      query:
        'SELECT * FROM c WHERE c.nextRunUtc >= @startUtc AND c.nextRunUtc <= @endUtc ORDER BY c.nextRunUtc ASC',
      parameters: [
        { name: '@startUtc', value: startUtc },
        { name: '@endUtc', value: endUtc },
      ],
    };

    const { resources } = await container.items.query<UserSettingsDocument>(query).fetchAll();
    return resources;
  }
}

/**
 * Report run repository
 * Partition key: /userId
 */
export class ReportRunRepository extends BaseRepository {
  constructor(cosmosClient: CosmosDbClient) {
    super(cosmosClient, 'runs');
  }

  async create(
    userId: string,
    tenantId: string,
    reportWindowStart: string,
    reportWindowEnd: string
  ): Promise<ReportRunDocument> {
    const container = await this.getContainer();
    const doc: ReportRunDocument = {
      id: this.generateId(),
      userId,
      tenantId,
      schemaVersion: SCHEMA_VERSIONS.run,
      status: RunStatus.IN_PROGRESS,
      startedAt: this.now(),
      reportWindowStart,
      reportWindowEnd,
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    const { resource } = await container.items.create(doc);
    return resource!;
  }

  async get(runId: string, userId: string): Promise<ReportRunDocument | null> {
    const container = await this.getContainer();
    try {
      const { resource } = await container.item(runId, userId).read<ReportRunDocument>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async update(
    runId: string,
    userId: string,
    updates: Partial<ReportRunDocument>
  ): Promise<ReportRunDocument> {
    const container = await this.getContainer();
    const { resource: existing } = await container.item(runId, userId).read<ReportRunDocument>();
    if (!existing) {
      throw new Error(`Run not found: ${runId}`);
    }

    const updated: ReportRunDocument = {
      ...existing,
      ...updates,
      id: runId,
      userId,
      updatedAt: this.now(),
    };

    const { resource } = await container.item(runId, userId).replace(updated);
    return resource!;
  }

  /**
   * Get last N runs for a user
   */
  async getLastRunsForUser(userId: string, limit: number = 5): Promise<ReportRunDocument[]> {
    const container = await this.getContainer();
    const query = {
      query: `SELECT * FROM c WHERE c.userId = @userId ORDER BY c.startedAt DESC OFFSET 0 LIMIT ${limit}`,
      parameters: [{ name: '@userId', value: userId }],
    };

    const { resources } = await container.items.query<ReportRunDocument>(query).fetchAll();
    return resources;
  }

  /**
   * Find runs by user (for /me/runs endpoint)
   */
  async findByUser(tenantId: string, userId: string, limit: number = 20): Promise<ReportRunDocument[]> {
    const container = await this.getContainer();
    const query = {
      query: `SELECT * FROM c WHERE c.userId = @userId AND c.tenantId = @tenantId ORDER BY c.createdAt DESC OFFSET 0 LIMIT ${limit}`,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@tenantId', value: tenantId }
      ],
    };

    const { resources } = await container.items.query<ReportRunDocument>(query).fetchAll();
    return resources;
  }

  /**
   * Update run status (for queue worker)
   */
  async updateStatus(
    runId: string,
    status: RunStatus,
    data?: { messageId?: string; errorMessage?: string; completedAt?: Date }
  ): Promise<void> {
    const container = await this.getContainer();
    // Note: We need userId as partition key, but runId alone won't work
    // This is a simplified version - in production, you'd need to query first or store userId with runId
    const query = {
      query: 'SELECT * FROM c WHERE c.id = @runId',
      parameters: [{ name: '@runId', value: runId }],
    };

    const { resources } = await container.items.query<ReportRunDocument>(query).fetchAll();
    if (resources.length === 0) {
      throw new Error(`Run not found: ${runId}`);
    }

    const existing = resources[0];
    const updated: ReportRunDocument = {
      ...existing,
      status,
      ...(data?.messageId && { messageId: data.messageId }),
      ...(data?.errorMessage && { errorMessage: data.errorMessage }),
      ...(data?.completedAt && { completedAt: data.completedAt.toISOString() }),
      updatedAt: this.now(),
    };

    await container.item(runId, existing.userId).replace(updated);
  }

  /**
   * Query runs with old PDFs for cleanup
   */
  async queryOldPdfRuns(olderThan: string): Promise<ReportRunDocument[]> {
    const container = await this.getContainer();
    const query = {
      query:
        'SELECT * FROM c WHERE c.pdfBlobKey != null AND c.pdfDeleted != true AND c.createdAt < @olderThan',
      parameters: [{ name: '@olderThan', value: olderThan }],
    };

    const { resources } = await container.items.query<ReportRunDocument>(query).fetchAll();
    return resources;
  }

  private generateId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
