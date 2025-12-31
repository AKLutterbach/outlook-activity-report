# Outlook Weekly Reports API

Backend API service for the Outlook Weekly Reports add-in.

## Overview

Express + TypeScript REST API that handles:
- OAuth authentication (authorization code flow with offline_access)
- User settings management
- On-demand report generation
- Report history and PDF signed URLs
- Database operations (Azure Cosmos DB)
- Azure Blob Storage integration

## Tech Stack

- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Azure Cosmos DB (NoSQL)
- **Authentication**: OAuth 2.0 (Microsoft Entra ID)
- **Storage**: Azure Blob Storage
- **Secrets**: Azure Key Vault

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- **Cosmos DB Emulator** (Windows) OR Azure Cosmos DB account
- Azure subscription (Blob Storage, Key Vault)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Cosmos DB

**Option A: Cosmos DB Emulator (Windows, recommended for local dev)**

1. Download and install: https://aka.ms/cosmosdb-emulator
2. Start the emulator (usually auto-starts with Windows)
3. Verify at: https://localhost:8081/_explorer/index.html

**Option B: Azure Cosmos DB (cloud)**

See [docs/COSMOS_SETUP.md](../docs/COSMOS_SETUP.md) for detailed instructions.

### 3. Configure Environment

```bash
# Copy the example env file
Copy-Item .env.example .env

# The .env is already configured for local Cosmos DB Emulator
# Edit if using Azure Cosmos DB (cloud)
```

### 4. Bootstrap Database

```bash
# Create database and containers
npm run bootstrap
```

Expected output:
```
============================================================
Cosmos DB Bootstrap
============================================================

[Cosmos] Bootstrapping database: outlook-weekly
[Cosmos] Database ready: outlook-weekly
[Cosmos] Container ready: tenants (partition key: /id)
[Cosmos] Container ready: users (partition key: /tenantId)
[Cosmos] Container ready: userTokens (partition key: /userId)
[Cosmos] Container ready: userSettings (partition key: /userId)
[Cosmos] Container ready: runs (partition key: /userId)
[Cosmos] Bootstrap complete

============================================================
✅ Bootstrap complete!
============================================================
```

### 5. Run Smoke Test (Optional)

```bash
npm test -- smoke.test.ts
```

This validates that all repositories work correctly.

### 6. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

Expected output:
```
[Server] Initializing Cosmos DB connection...
[Server] Cosmos DB client ready
============================================================
✅ Outlook Weekly API Server
============================================================
Port:        3000
Environment: development
Dev User:    dev@example.com
Health:      http://localhost:3000/health
============================================================
```

### Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

```bash
# Check if server is running
curl http://localhost:3000/health
```

Response:
```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "outlook-weekly-api"
  }
}
```

### Get Settings

```bash
# Get current user settings
curl http://localhost:3000/me/settings
```

Response (404 if no settings exist yet):
```json
{
  "data": {
    "cadence": "WEEKLY",
    "outputMode": "DRAFT_EMAIL_TO_SELF",
    "dayOfWeek": 1,
    "timeOfDay": "09:00",
    "timezone": "America/New_York",
    "includeCalendar": true,
    "includeSentMail": true,
    "nextRunUtc": "2024-01-22T14:00:00.000Z"
  }
}
```

### Update Settings

```bash
# Create or update user settings
curl -X PUT http://localhost:3000/me/settings \
  -H "Content-Type: application/json" \
  -d '{
    "cadence": "WEEKLY",
    "outputMode": "DRAFT_EMAIL_TO_SELF",
    "dayOfWeek": 1,
    "timeOfDay": "09:00",
    "timezone": "America/New_York",
    "includeCalendar": true,
    "includeSentMail": true
  }'
```

Response:
```json
{
  "data": {
    "cadence": "WEEKLY",
    "outputMode": "DRAFT_EMAIL_TO_SELF",
    "dayOfWeek": 1,
    "timeOfDay": "09:00",
    "timezone": "America/New_York",
    "includeCalendar": true,
    "includeSentMail": true,
    "nextRunUtc": "2024-01-22T14:00:00.000Z"
  }
}
```

**Note**: `nextRunUtc` is automatically computed from the cadence, day, time, and timezone using the shared scheduling logic.

### Get Run History

```bash
# Get last 5 runs (default)
curl http://localhost:3000/me/runs

# Get last 10 runs
curl "http://localhost:3000/me/runs?limit=10"
```

Response:
```json
{
  "data": {
    "runs": [
      {
        "id": "run_1234567890_abc123",
        "status": "SUCCESS",
        "startedAt": "2024-01-15T14:00:00.000Z",
        "completedAt": "2024-01-15T14:02:30.000Z",
        "reportWindowStart": "2024-01-08T00:00:00.000-05:00",
        "reportWindowEnd": "2024-01-14T23:59:59.999-05:00",
        "draftMessageId": "AAMkAGI1...",
        "pdfBlobKey": "pdfs/run_1234567890_abc123.pdf"
      }
    ],
    "count": 1,
    "limit": 5
  }
}
```

### Generate Report (Stub)

```bash
# Trigger on-demand report generation
curl -X POST http://localhost:3000/me/generate
```

Response (202 Accepted):
```json
{
  "data": {
    "runId": "run_1234567890_xyz789",
    "status": "ERROR",
    "message": "Report generation is not yet implemented. This is a stub endpoint.",
    "errorMessage": "NOT_IMPLEMENTED: Report generation not yet implemented"
  }
}
```

**Note**: This is a stub implementation. The endpoint creates a run record with status ERROR and errorMessage NOT_IMPLEMENTED.

## Request Validation

Settings updates are validated using Zod schemas:

- `cadence`: Must be WEEKLY, BIWEEKLY, or MONTHLY
- `outputMode`: Must be DRAFT_EMAIL_TO_SELF, SEND_EMAIL_TO_SELF, PDF_ONLY, or DRAFT_PLUS_PDF
- `dayOfWeek`: Integer 1-7 (1=Monday, 7=Sunday)
- `timeOfDay`: String in H:mm or HH:mm format (e.g., "9:00" or "09:00")
- `timezone`: IANA timezone string (e.g., "America/New_York")
- `includeCalendar`: Boolean
- `includeSentMail`: Boolean

Invalid requests return 400 with validation errors:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "path": "dayOfWeek",
        "message": "Number must be less than or equal to 7"
      }
    ]
  }
}
```

## Authentication

**Phase 7A: Microsoft Entra OAuth 2.0**

The API now uses real OAuth authentication with Microsoft Entra (Azure AD):
- OAuth 2.0 authorization code flow
- JWT session tokens (7-day expiry)
- Encrypted refresh tokens stored in Cosmos DB
- Microsoft Graph API integration

### Setup Instructions

See [PHASE_7A_OAUTH.md](../PHASE_7A_OAUTH.md) for complete setup guide including:
- Azure App Registration configuration
- Required environment variables
- OAuth flow details
- Testing and troubleshooting

### Quick Start

1. **Create Azure App Registration** (see Phase 7A doc)
2. **Configure environment variables**:
   ```env
   AZURE_CLIENT_ID=your-client-id
   AZURE_CLIENT_SECRET=your-client-secret
   JWT_SECRET=generate-with-crypto-randomBytes-32
   ENCRYPTION_SECRET=generate-with-crypto-randomBytes-32
   ```
3. **Generate secrets**:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

### Authentication Flow

1. User clicks "Connect with Microsoft 365" in add-in
2. Office dialog opens `GET /auth/login`
3. Redirects to Microsoft login
4. User signs in and consents to permissions
5. Callback `GET /auth/callback` exchanges code for tokens
6. Server returns JWT session token
7. Add-in includes `Authorization: Bearer <token>` in API requests

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

Common error codes:
- `VALIDATION_ERROR` - Request validation failed (400)
- `SETTINGS_NOT_FOUND` - User settings not found (404)
- `NOT_FOUND` - Resource not found (404)
- `INTERNAL_ERROR` - Unexpected server error (500)
- `AUTH_INIT_FAILED` - Mock auth initialization failed (500)

## Troubleshooting

### Cosmos DB Emulator Issues

- **Error: ECONNREFUSED localhost:8081**
  - Solution: Start the Cosmos DB Emulator from Windows Start menu
  
- **Error: self signed certificate**
  - Solution: Already handled by `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env`
  - Or trust the certificate (see docs/COSMOS_SETUP.md)

See [docs/COSMOS_SETUP.md](../docs/COSMOS_SETUP.md) for complete troubleshooting guide.

## Project Structure

```
/api
  /src
    /controllers    # Route handlers
    /middleware     # Auth, error handling, validation
    /services       # Business logic (Graph, blob, crypto)
    /models         # Database models
    /routes         # API routes
    /utils          # Helpers
    index.ts        # Entry point
  package.json
  tsconfig.json
```

## API Endpoints

### Authentication
- `GET /auth/login` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler
- `POST /auth/sso/exchange` - Exchange Office SSO token (optional)

### Settings
- `GET /me/settings` - Get user settings
- `PUT /me/settings` - Update user settings

### Generation
- `POST /me/generate` - Generate report on-demand

### Runs
- `GET /me/runs?limit=5` - Get run history

### PDF
- `GET /me/runs/:runId/pdf-link` - Get signed PDF download URL

## Environment Variables

See `.env.example` for required configuration.

## Database Schema

Run migrations to set up the database schema (to be implemented).

## Testing

```bash
npm test
```

## Deployment

Deploy to Azure App Service. See deployment documentation for details.
