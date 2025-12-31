# Cosmos DB Persistence - Quick Reference

## ✅ What's Complete

Phase 3 implementation of Azure Cosmos DB persistence with full local development support.

## 📦 Components Delivered

### 1. Type Definitions (`/shared`)
- [cosmos.ts](../shared/src/types/cosmos.ts) - 5 document types with partition keys
- Schema versioning and timestamp tracking

### 2. Repository Layer (`/api/src/db`)
- [cosmosClient.ts](../api/src/db/cosmosClient.ts) - Client wrapper with bootstrap
- [repositories.ts](../api/src/db/repositories.ts) - 5 full CRUD repositories

### 3. Bootstrap & Testing
- [bootstrap.ts](../api/src/bootstrap.ts) - Database setup script
- [smoke.test.ts](../api/src/__tests__/smoke.test.ts) - Integration tests

### 4. Documentation
- [COSMOS_SETUP.md](./COSMOS_SETUP.md) - Complete setup guide
- [PHASE3_COMPLETE.md](./PHASE3_COMPLETE.md) - Detailed summary
- Updated [api/README.md](../api/README.md) with quick start

## 🚀 Quick Start

```powershell
# 1. Install Cosmos DB Emulator (Windows)
# Download: https://aka.ms/cosmosdb-emulator

# 2. Setup and bootstrap
cd api
npm install
Copy-Item .env.example .env
npm run bootstrap

# 3. Run smoke test
npm test -- smoke.test.ts
```

## 📊 Data Model

| Container      | Partition Key | Purpose                          |
|----------------|---------------|----------------------------------|
| tenants        | /id           | Tenant metadata                  |
| users          | /tenantId     | User profiles                    |
| userTokens     | /userId       | Encrypted refresh tokens         |
| userSettings   | /userId       | Settings + nextRunUtc            |
| runs           | /userId       | Run history + draft/PDF pointers |

## 🔑 Key Features

✅ **nextRunUtc in UserSettings** - Scheduler-ready  
✅ **Idempotent bootstrap** - Safe to re-run  
✅ **Full CRUD repositories** - Create, read, update, upsert  
✅ **Local dev with Emulator** - No Azure account needed  
✅ **Comprehensive tests** - 20+ test cases  
✅ **Partition strategy documented** - Optimized for <100 users  

## 📖 Repository Methods

### UserSettingsRepository
```typescript
create(userId, tenantId, settings)      // Includes nextRunUtc
get(userId)
upsert(userId, tenantId, settings)      // Updates nextRunUtc
queryDueUsers(startUtc, endUtc)         // For scheduler
```

### ReportRunRepository
```typescript
create(userId, tenantId, windowStart, windowEnd)
get(runId, userId)
update(runId, userId, updates)          // Status, draft, PDF
getLastRunsForUser(userId, limit)       // History API
queryOldPdfRuns(olderThan)              // Cleanup job
```

### UserTokenRepository
```typescript
create(userId, tenantId, encryptedToken, scopes)
getLatestForUser(userId)
update(tokenId, userId, updates)
```

## 🔧 Common Commands

```powershell
# Bootstrap database
npm run bootstrap

# Run all tests
npm test

# Run smoke test only
npm test -- smoke.test.ts

# Build
npm run build

# Dev mode
npm run dev
```

## 📚 Documentation Links

- [Complete Setup Guide](./COSMOS_SETUP.md) - Installation & troubleshooting
- [Phase 3 Summary](./PHASE3_COMPLETE.md) - Detailed implementation notes
- [BUILD_SPEC.md](./BUILD_SPEC.md) - Original requirements

## 🎯 Next Phase

Ready to implement:
1. API endpoints (`GET /me/settings`, `PUT /me/settings`, etc.)
2. Graph API integration
3. Report generation & PDF rendering
4. Worker timer triggers (scheduler, cleanup)

---

**Status**: ✅ Phase 3 Complete | All tests passing | Local dev ready
