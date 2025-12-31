/**
 * Cosmos DB document types
 * 
 * All documents include:
 * - id: unique identifier
 * - schemaVersion: for versioning and migrations
 * - createdAt/updatedAt: timestamps
 * - partitionKey field as documented
 */

/**
 * Tenant document
 * Partition key: /id (or /tenantId)
 */
export interface TenantDocument {
  id: string; // tenantId from Microsoft 365
  schemaVersion: number;
  displayName?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * User document
 * Partition key: /tenantId
 */
export interface UserDocument {
  id: string; // userId from Microsoft 365
  tenantId: string; // partition key
  schemaVersion: number;
  email: string;
  displayName?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * User token document (encrypted refresh tokens)
 * Partition key: /userId
 */
export interface UserTokenDocument {
  id: string; // generated UUID
  userId: string; // partition key
  tenantId: string;
  schemaVersion: number;
  encryptedRefreshToken: string; // encrypted at rest
  msalCacheEncrypted?: string; // NEW: Encrypted serialized MSAL token cache
  tokenExpiry?: string; // ISO 8601, if available
  scopes: string[]; // granted Graph scopes
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * User settings document
 * Partition key: /userId
 */
export interface UserSettingsDocument {
  id: string; // userId (one settings doc per user)
  userId: string; // partition key
  tenantId: string;
  schemaVersion: number;
  cadence: string; // Cadence enum value
  outputMode: string; // OutputMode enum value
  dayOfWeek: number; // 1-7 (1=Monday, 7=Sunday)
  timeOfDay: string; // HH:mm format in user's local time
  timezone: string; // IANA timezone
  includeCalendar: boolean;
  includeSentMail: boolean;
  nextRunUtc: string; // ISO 8601 UTC timestamp - used by scheduler
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Report run document
 * Partition key: /userId
 */
export interface ReportRunDocument {
  id: string; // generated UUID
  userId: string; // partition key
  tenantId: string;
  schemaVersion: number;
  status: string; // RunStatus enum value
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  reportWindowStart: string; // ISO 8601 (local time for reference)
  reportWindowEnd: string; // ISO 8601 (local time for reference)
  draftMessageId?: string; // Graph message ID
  pdfBlobKey?: string; // Azure Blob Storage key
  pdfDeleted?: boolean; // true if PDF was deleted by cleanup job
  errorMessage?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Cosmos DB container configuration
 */
export interface CosmosContainerConfig {
  id: string;
  partitionKey: string;
}

/**
 * Cosmos DB configuration
 */
export const COSMOS_CONTAINERS: CosmosContainerConfig[] = [
  { id: 'tenants', partitionKey: '/id' },
  { id: 'users', partitionKey: '/tenantId' },
  { id: 'userTokens', partitionKey: '/userId' },
  { id: 'userSettings', partitionKey: '/userId' },
  { id: 'runs', partitionKey: '/userId' },
];

/**
 * Current schema version for each document type
 */
export const SCHEMA_VERSIONS = {
  tenant: 1,
  user: 1,
  userToken: 1,
  userSettings: 1,
  run: 1,
} as const;
