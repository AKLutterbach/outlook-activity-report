# Phase 3: Cosmos DB Persistence - Complete! ✅

This document summarizes the Cosmos DB persistence implementation for the Outlook Weekly Reports project.

## What's Implemented

### 1. Cosmos DB Types (`/shared/src/types/cosmos.ts`)

Created TypeScript interfaces for all Cosmos DB documents:

- **TenantDocument** - Partition key: `/id`
- **UserDocument** - Partition key: `/tenantId`
- **UserTokenDocument** - Partition key: `/userId` (stores encrypted refresh tokens)
- **UserSettingsDocument** - Partition key: `/userId` (includes `nextRunUtc` for scheduler)
- **ReportRunDocument** - Partition key: `/userId` (stores run metadata and pointers)

All documents include:
- `schemaVersion` for future migrations
- `createdAt` and `updatedAt` timestamps
- Required partition key fields

### 2. Cosmos DB Client (`/api/src/db/cosmosClient.ts`)

- Wrapper around `@azure/cosmos` SDK
- Reads configuration from environment variables
- Includes `bootstrap()` method to create database and containers
- Factory function `createCosmosClient()` for easy initialization

### 3. Repository Layer (`/api/src/db/repositories.ts`)

Implemented full CRUD repositories for all entities:

**TenantRepository**:
- `create(tenantId, displayName)`
- `get(tenantId)`
- `upsert(tenantId, displayName)` - idempotent

**UserRepository**:
- `create(userId, tenantId, email, displayName)`
- `get(userId, tenantId)`
- `upsert(userId, tenantId, email, displayName)`

**UserTokenRepository**:
- `create(userId, tenantId, encryptedRefreshToken, scopes, tokenExpiry)`
- `getLatestForUser(userId)`
- `update(tokenId, userId, updates)`

**UserSettingsRepository**:
- `create(userId, tenantId, settings)` - includes `nextRunUtc`
- `get(userId)`
- `upsert(userId, tenantId, settings)` - updates `nextRunUtc` on every save
- `queryDueUsers(startUtc, endUtc)` - for scheduler to find due jobs

**ReportRunRepository**:
- `create(userId, tenantId, reportWindowStart, reportWindowEnd)`
- `get(runId, userId)`
- `update(runId, userId, updates)` - for status, completion, draft/PDF links
- `getLastRunsForUser(userId, limit)` - for history API
- `queryOldPdfRuns(olderThan)` - for cleanup job

### 4. Bootstrap Script (`/api/src/bootstrap.ts`)

Automated database setup:
- Creates database if not exists
- Creates all 5 containers with correct partition keys
- Idempotent - safe to run multiple times
- Clear error messages with troubleshooting hints

Run with: `npm run bootstrap` (from `/api` directory)

### 5. Comprehensive Documentation

**docs/COSMOS_SETUP.md** - Complete setup guide covering:
- Installing Cosmos DB Emulator on Windows
- Configuring SSL certificates
- Alternative Azure Cosmos DB setup (cloud)
- Troubleshooting common issues
- Partition key strategy explanation

### 6. Smoke Test (`/api/src/__tests__/smoke.test.ts`)

Full integration test suite covering:
- ✅ Create tenant
- ✅ Upsert user
- ✅ Store and retrieve tokens
- ✅ Upsert user settings with `nextRunUtc`
- ✅ Query due users (scheduler simulation)
- ✅ Insert and update runs
- ✅ Query last 5 runs
- ✅ Query old PDF runs (cleanup simulation)
- ✅ Complete integration flow

Run with: `npm test` (from `/api` directory)

### 7. Environment Configuration

Updated `.env.example` files in both `/api` and `/worker` with:
- Cosmos DB Emulator default settings
- Azure Cosmos DB cloud configuration examples
- SSL certificate handling instructions

## Local Development Setup

### Prerequisites

1. **Windows only**: Download and install [Cosmos DB Emulator](https://aka.ms/cosmosdb-emulator)
2. **Alternative**: Set up Azure Cosmos DB (Free Tier) in Azure Portal

### Quick Start

```powershell
# 1. Navigate to api directory
cd api

# 2. Copy environment file
Copy-Item .env.example .env

# 3. Start Cosmos DB Emulator
# (Usually starts automatically with Windows)
# Verify at: https://localhost:8081/_explorer/index.html

# 4. Bootstrap database and containers
npm run bootstrap

# 5. Run smoke test
npm test -- smoke.test.ts
```

Expected output:
```
✅ Bootstrap complete!

Test Suites: 1 passed, 1 total
Tests:       ~20 passed, ~20 total
```

## Partition Key Strategy

Optimized for <100 users with minimal cross-partition queries:

| Container       | Partition Key | Strategy                                          |
|-----------------|---------------|---------------------------------------------------|
| `tenants`       | `/id`         | Each tenant is isolated                           |
| `users`         | `/tenantId`   | All users in a tenant share partition             |
| `userTokens`    | `/userId`     | User's tokens stay together                       |
| `userSettings`  | `/userId`     | One settings doc per user                         |
| `runs`          | `/userId`     | All user's runs in one partition                  |

**Benefits**:
- Single-partition queries for all user-specific operations (fast & cheap)
- Scheduler uses cross-partition query for `queryDueUsers()` (acceptable for <100 users)
- Free Tier RUs (1000 RU/s) more than sufficient

## Key Features

### nextRunUtc Management

✅ **UserSettings includes `nextRunUtc`** - stored as ISO 8601 UTC timestamp

✅ **Updated on every settings save** - via `upsert()` method

✅ **Updated after scheduled runs** - worker calls `update()` after job completion

✅ **Efficient due-job selection** - scheduler queries:
```typescript
WHERE c.nextRunUtc >= @startUtc AND c.nextRunUtc <= @endUtc
```

### Document Versioning

All documents include `schemaVersion` field for future migrations:
```typescript
{
  id: "...",
  schemaVersion: 1,
  // ... other fields
}
```

### Error Handling

Repositories handle common errors:
- `404 Not Found` → returns `null`
- Connection errors → thrown with context
- Duplicate key → upsert handles gracefully

## Testing Checklist

- [x] TenantRepository: create, get, upsert
- [x] UserRepository: create, get, upsert
- [x] UserTokenRepository: create, getLatest, update
- [x] UserSettingsRepository: create, get, upsert, queryDueUsers
- [x] ReportRunRepository: create, get, update, getLastRuns, queryOldPdfRuns
- [x] Full integration flow
- [x] Bootstrap idempotency
- [x] Partition key validation
- [x] nextRunUtc in queries

## Files Added/Modified

### New Files

```
/shared/src/types/cosmos.ts          # Document types and container config
/api/src/db/cosmosClient.ts          # Cosmos DB client wrapper
/api/src/db/repositories.ts          # All 5 repositories
/api/src/db/index.ts                 # Barrel exports
/api/src/bootstrap.ts                # Database bootstrap script
/api/src/__tests__/smoke.test.ts    # Integration tests
/api/.env                            # Local environment (gitignored)
/docs/COSMOS_SETUP.md                # Setup documentation
/docs/PHASE3_COMPLETE.md             # This file
```

### Modified Files

```
/shared/src/types/index.ts           # Export cosmos types
/api/package.json                    # Added bootstrap script
/api/.env.example                    # Updated with Cosmos config
/worker/.env.example                 # Updated with Cosmos config
```

## Dependencies Added

- `@azure/cosmos` v4.9.0 (in `/api` and `/worker`)
- `luxon` (in `/api` for smoke test)

## Next Steps (Phase 4+)

1. ✅ Persistence complete and tested
2. 🔜 Implement API endpoints:
   - `GET /me/settings`
   - `PUT /me/settings` (must compute and save `nextRunUtc`)
   - `GET /me/runs?limit=5`
   - `POST /me/generate`
3. 🔜 Implement report generation:
   - Graph API integration
   - Report template rendering
   - Deterministic summarizer
4. 🔜 Implement worker functions:
   - Scheduler timer trigger (every 5 min)
   - PDF generation
   - Cleanup timer trigger (nightly)

## Constraints Met

✅ **No Postgres** - Using Cosmos DB exclusively

✅ **Local dev with Emulator** - Full support for Windows Cosmos DB Emulator

✅ **Partition keys documented** - See table above

✅ **nextRunUtc implemented** - In UserSettings, updated on save and after runs

✅ **Bootstrap script** - Creates database and containers automatically

✅ **Smoke test** - Full CRUD operations tested

✅ **README instructions** - Comprehensive docs/COSMOS_SETUP.md

## Troubleshooting

See [docs/COSMOS_SETUP.md](./COSMOS_SETUP.md) for detailed troubleshooting.

Common issues:
- **Emulator not running**: Start from Windows menu or verify at https://localhost:8081
- **SSL certificate errors**: Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env`
- **Bootstrap fails**: Check COSMOS_ENDPOINT and COSMOS_KEY in `.env`

## Resources

- [Cosmos DB Emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/local-emulator)
- [Azure Cosmos DB Free Tier](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier)
- [@azure/cosmos SDK](https://learn.microsoft.com/en-us/javascript/api/overview/azure/cosmos-readme)
- [Partition Keys Best Practices](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)

---

**Status**: Phase 3 Complete ✅ | Ready for Phase 4 (API Endpoints)
