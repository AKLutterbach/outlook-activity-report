/**
 * Cosmos DB Repository Smoke Test
 * 
 * Tests the basic CRUD operations for all repositories.
 * Requires Cosmos DB Emulator running or valid Azure Cosmos DB credentials.
 * 
 * Run with: npm test -- smoke.test.ts
 */
import 'dotenv/config';import {
  createCosmosClient,
  TenantRepository,
  UserRepository,
  UserTokenRepository,
  UserSettingsRepository,
  ReportRunRepository,
} from '../src/db';
import { Cadence, OutputMode, RunStatus } from '@outlook-weekly/shared';
import { DateTime } from 'luxon';

describe('Cosmos DB Repositories Smoke Test', () => {
  let cosmosClient: any;
  let tenantRepo: TenantRepository;
  let userRepo: UserRepository;
  let tokenRepo: UserTokenRepository;
  let settingsRepo: UserSettingsRepository;
  let runRepo: ReportRunRepository;

  // Test data
  const testTenantId = `test-tenant-${Date.now()}`;
  const testUserId = `test-user-${Date.now()}`;
  const testEmail = 'test@example.com';

  beforeAll(async () => {
    // Skip if Cosmos DB is not configured
    if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY) {
      console.warn('⚠️  Skipping smoke tests: COSMOS_ENDPOINT and COSMOS_KEY not set');
      console.warn('   Set up Cosmos DB Emulator and run: npm run bootstrap');
      return;
    }

    try {
      cosmosClient = createCosmosClient();
      
      // Bootstrap if needed
      await cosmosClient.bootstrap();

      // Initialize repositories
      tenantRepo = new TenantRepository(cosmosClient);
      userRepo = new UserRepository(cosmosClient);
      tokenRepo = new UserTokenRepository(cosmosClient);
      settingsRepo = new UserSettingsRepository(cosmosClient);
      runRepo = new ReportRunRepository(cosmosClient);
    } catch (error) {
      console.error('❌ Failed to initialize Cosmos DB client:', error);
      throw error;
    }
  }, 30000); // 30 second timeout for bootstrap

  describe('TenantRepository', () => {
    it('should create a tenant', async () => {
      if (!cosmosClient) return;

      const tenant = await tenantRepo.create(testTenantId, 'Test Tenant Corp');

      expect(tenant).toBeDefined();
      expect(tenant.id).toBe(testTenantId);
      expect(tenant.displayName).toBe('Test Tenant Corp');
      expect(tenant.schemaVersion).toBe(1);
      expect(tenant.createdAt).toBeDefined();
      expect(tenant.updatedAt).toBeDefined();
    });

    it('should get a tenant by id', async () => {
      if (!cosmosClient) return;

      const tenant = await tenantRepo.get(testTenantId);

      expect(tenant).toBeDefined();
      expect(tenant!.id).toBe(testTenantId);
    });

    it('should upsert a tenant (idempotent)', async () => {
      if (!cosmosClient) return;

      const tenant1 = await tenantRepo.upsert(testTenantId, 'Updated Name');
      const tenant2 = await tenantRepo.upsert(testTenantId, 'Updated Name Again');

      expect(tenant1.id).toBe(testTenantId);
      expect(tenant2.id).toBe(testTenantId);
      // Should return existing tenant on second call
      expect(tenant1.createdAt).toBe(tenant2.createdAt);
    });
  });

  describe('UserRepository', () => {
    it('should create a user', async () => {
      if (!cosmosClient) return;

      const user = await userRepo.create(testUserId, testTenantId, testEmail, 'Test User');

      expect(user).toBeDefined();
      expect(user.id).toBe(testUserId);
      expect(user.tenantId).toBe(testTenantId);
      expect(user.email).toBe(testEmail);
      expect(user.displayName).toBe('Test User');
      expect(user.schemaVersion).toBe(1);
    });

    it('should get a user', async () => {
      if (!cosmosClient) return;

      const user = await userRepo.get(testUserId, testTenantId);

      expect(user).toBeDefined();
      expect(user!.id).toBe(testUserId);
      expect(user!.email).toBe(testEmail);
    });

    it('should upsert a user', async () => {
      if (!cosmosClient) return;

      const user = await userRepo.upsert(
        testUserId,
        testTenantId,
        testEmail,
        'Updated Display Name'
      );

      expect(user.displayName).toBe('Updated Display Name');
      expect(user.email).toBe(testEmail);
    });
  });

  describe('UserTokenRepository', () => {
    let tokenId: string;

    it('should create a token', async () => {
      if (!cosmosClient) return;

      const token = await tokenRepo.create(
        testUserId,
        testTenantId,
        'encrypted-refresh-token-xyz',
        ['offline_access', 'Calendars.Read', 'Mail.Read'],
        DateTime.utc().plus({ days: 90 }).toISO()
      );

      expect(token).toBeDefined();
      expect(token.userId).toBe(testUserId);
      expect(token.encryptedRefreshToken).toBe('encrypted-refresh-token-xyz');
      expect(token.scopes).toEqual(['offline_access', 'Calendars.Read', 'Mail.Read']);
      
      tokenId = token.id;
    });

    it('should get latest token for user', async () => {
      if (!cosmosClient) return;

      const token = await tokenRepo.getLatestForUser(testUserId);

      expect(token).toBeDefined();
      expect(token!.userId).toBe(testUserId);
      expect(token!.id).toBe(tokenId);
    });

    it('should update a token', async () => {
      if (!cosmosClient) return;

      const updated = await tokenRepo.update(tokenId, testUserId, {
        encryptedRefreshToken: 'new-encrypted-token-abc',
      });

      expect(updated.encryptedRefreshToken).toBe('new-encrypted-token-abc');
    });
  });

  describe('UserSettingsRepository', () => {
    it('should create user settings', async () => {
      if (!cosmosClient) return;

      const nextRun = DateTime.utc().plus({ days: 1 }).toISO();
      const settings = await settingsRepo.create(testUserId, testTenantId, {
        cadence: Cadence.WEEKLY,
        outputMode: OutputMode.DRAFT_EMAIL_TO_SELF,
        dayOfWeek: 1, // Monday
        timeOfDay: '09:00',
        timezone: 'America/New_York',
        includeCalendar: true,
        includeSentMail: true,
        nextRunUtc: nextRun,
      });

      expect(settings).toBeDefined();
      expect(settings.id).toBe(testUserId); // id = userId for settings
      expect(settings.userId).toBe(testUserId);
      expect(settings.cadence).toBe(Cadence.WEEKLY);
      expect(settings.outputMode).toBe(OutputMode.DRAFT_EMAIL_TO_SELF);
      expect(settings.nextRunUtc).toBe(nextRun);
    });

    it('should get user settings', async () => {
      if (!cosmosClient) return;

      const settings = await settingsRepo.get(testUserId);

      expect(settings).toBeDefined();
      expect(settings!.userId).toBe(testUserId);
      expect(settings!.cadence).toBe(Cadence.WEEKLY);
    });

    it('should upsert user settings', async () => {
      if (!cosmosClient) return;

      const newNextRun = DateTime.utc().plus({ days: 2 }).toISO();
      const updated = await settingsRepo.upsert(testUserId, testTenantId, {
        cadence: Cadence.BIWEEKLY,
        outputMode: OutputMode.DRAFT_PLUS_PDF,
        dayOfWeek: 5, // Friday
        timeOfDay: '17:00',
        timezone: 'America/Los_Angeles',
        includeCalendar: true,
        includeSentMail: false,
        nextRunUtc: newNextRun,
      });

      expect(updated.cadence).toBe(Cadence.BIWEEKLY);
      expect(updated.dayOfWeek).toBe(5);
      expect(updated.timeOfDay).toBe('17:00');
      expect(updated.nextRunUtc).toBe(newNextRun);
    });

    it('should query due users', async () => {
      if (!cosmosClient) return;

      // Set nextRunUtc to now for this user
      const now = DateTime.utc();
      await settingsRepo.upsert(testUserId, testTenantId, {
        cadence: Cadence.WEEKLY,
        outputMode: OutputMode.DRAFT_EMAIL_TO_SELF,
        dayOfWeek: 1,
        timeOfDay: '09:00',
        timezone: 'America/New_York',
        includeCalendar: true,
        includeSentMail: true,
        nextRunUtc: now.toISO(),
      });

      // Query for users due between 2 minutes ago and 5 minutes from now
      const startUtc = now.minus({ minutes: 2 }).toISO();
      const endUtc = now.plus({ minutes: 5 }).toISO();
      
      const dueUsers = await settingsRepo.queryDueUsers(startUtc, endUtc);

      expect(dueUsers.length).toBeGreaterThan(0);
      expect(dueUsers.some((u) => u.userId === testUserId)).toBe(true);
    });
  });

  describe('ReportRunRepository', () => {
    let runId: string;

    it('should create a report run', async () => {
      if (!cosmosClient) return;

      const windowStart = DateTime.utc().minus({ weeks: 1 }).startOf('week').toISO();
      const windowEnd = DateTime.utc().minus({ weeks: 1 }).endOf('week').toISO();

      const run = await runRepo.create(testUserId, testTenantId, windowStart, windowEnd);

      expect(run).toBeDefined();
      expect(run.userId).toBe(testUserId);
      expect(run.tenantId).toBe(testTenantId);
      expect(run.status).toBe(RunStatus.RUNNING);
      expect(run.reportWindowStart).toBe(windowStart);
      expect(run.reportWindowEnd).toBe(windowEnd);

      runId = run.id;
    });

    it('should get a run', async () => {
      if (!cosmosClient) return;

      const run = await runRepo.get(runId, testUserId);

      expect(run).toBeDefined();
      expect(run!.id).toBe(runId);
      expect(run!.status).toBe(RunStatus.RUNNING);
    });

    it('should update a run', async () => {
      if (!cosmosClient) return;

      const updated = await runRepo.update(runId, testUserId, {
        status: RunStatus.SUCCESS,
        completedAt: DateTime.utc().toISO(),
        draftMessageId: 'AAMkAGI1...',
        pdfBlobKey: 'pdfs/run_123.pdf',
      });

      expect(updated.status).toBe(RunStatus.SUCCESS);
      expect(updated.completedAt).toBeDefined();
      expect(updated.draftMessageId).toBe('AAMkAGI1...');
      expect(updated.pdfBlobKey).toBe('pdfs/run_123.pdf');
    });

    it('should get last N runs for user', async () => {
      if (!cosmosClient) return;

      // Create a few more runs
      await runRepo.create(
        testUserId,
        testTenantId,
        DateTime.utc().minus({ weeks: 2 }).toISO(),
        DateTime.utc().minus({ weeks: 1 }).toISO()
      );
      await runRepo.create(
        testUserId,
        testTenantId,
        DateTime.utc().minus({ weeks: 3 }).toISO(),
        DateTime.utc().minus({ weeks: 2 }).toISO()
      );

      const runs = await runRepo.getLastRunsForUser(testUserId, 5);

      expect(runs.length).toBeGreaterThanOrEqual(3);
      expect(runs[0].userId).toBe(testUserId);
      // Should be ordered by startedAt DESC
      expect(new Date(runs[0].startedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(runs[1].startedAt).getTime()
      );
    });

    it('should query runs with old PDFs', async () => {
      if (!cosmosClient) return;

      const olderThan = DateTime.utc().plus({ days: 1 }).toISO();
      const oldRuns = await runRepo.queryOldPdfRuns(olderThan);

      // Should include our test run with pdfBlobKey
      expect(oldRuns.some((r) => r.id === runId)).toBe(true);
    });
  });

  describe('Integration: Full Flow', () => {
    it('should execute complete user flow', async () => {
      if (!cosmosClient) return;

      // 1. Create tenant
      const tenant = await tenantRepo.upsert('integration-tenant', 'Integration Test Corp');
      expect(tenant.id).toBe('integration-tenant');

      // 2. Create user
      const user = await userRepo.upsert(
        'integration-user',
        'integration-tenant',
        'integration@test.com',
        'Integration User'
      );
      expect(user.id).toBe('integration-user');

      // 3. Store token
      const token = await tokenRepo.create(
        'integration-user',
        'integration-tenant',
        'encrypted-token',
        ['offline_access', 'Calendars.Read']
      );
      expect(token.userId).toBe('integration-user');

      // 4. Create settings with nextRunUtc
      const nextRun = DateTime.utc().plus({ days: 7 }).toISO();
      const settings = await settingsRepo.upsert('integration-user', 'integration-tenant', {
        cadence: Cadence.WEEKLY,
        outputMode: OutputMode.DRAFT_EMAIL_TO_SELF,
        dayOfWeek: 1,
        timeOfDay: '09:00',
        timezone: 'America/New_York',
        includeCalendar: true,
        includeSentMail: true,
        nextRunUtc: nextRun,
      });
      expect(settings.nextRunUtc).toBe(nextRun);

      // 5. Create a run
      const run = await runRepo.create(
        'integration-user',
        'integration-tenant',
        DateTime.utc().minus({ weeks: 1 }).toISO(),
        DateTime.utc().toISO()
      );
      expect(run.userId).toBe('integration-user');

      // 6. Update run to success
      const completed = await runRepo.update(run.id, 'integration-user', {
        status: RunStatus.SUCCESS,
        completedAt: DateTime.utc().toISO(),
        draftMessageId: 'AAMkAGI1234...',
      });
      expect(completed.status).toBe(RunStatus.SUCCESS);

      // 7. Query last runs
      const runs = await runRepo.getLastRunsForUser('integration-user', 5);
      expect(runs.length).toBeGreaterThan(0);
      expect(runs[0].id).toBe(run.id);

      console.log('✅ Integration test completed successfully!');
    });
  });
});
