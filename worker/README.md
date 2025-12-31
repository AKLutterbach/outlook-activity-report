# Outlook Weekly Reports Worker

Azure Functions timer triggers for scheduled report generation and cleanup.

## Overview

This package contains Azure Functions that:
- **Scheduler** (every 5 minutes): Find and execute due report jobs
- **Cleanup** (nightly): Delete PDFs older than 30 days

## Tech Stack

- **Runtime**: Azure Functions (Node.js)
- **Language**: TypeScript
- **PDF Generation**: Playwright Chromium
- **Database**: PostgreSQL
- **Storage**: Azure Blob Storage

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Azure Functions Core Tools v4
- PostgreSQL database
- Azure subscription

## Getting Started

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `local.settings.json` (Azure Functions local config):
```bash
cp .env.example local.settings.json
```

### Local Development

```bash
npm start
```

Functions will be available at:
- `http://localhost:7071/admin/functions/SchedulerTimer`
- `http://localhost:7071/admin/functions/CleanupTimer`

### Build for Production

```bash
npm run build
```

## Project Structure

```
/worker
  /src
    /functions
      schedulerTimer.ts   # Every 5 min scheduler
      cleanupTimer.ts     # Nightly cleanup
    /services
      graphClient.ts      # Microsoft Graph API wrapper
      pdfGenerator.ts     # PDF rendering with Playwright
      blobService.ts      # Azure Blob operations
      database.ts         # DB utilities
    /utils
      reportGenerator.ts  # Report generation logic
      scheduling.ts       # Window calculations
  host.json             # Azure Functions host config
  package.json
  tsconfig.json
```

## Functions

### Scheduler Timer (Every 5 minutes)

**Trigger**: `0 */5 * * * *` (every 5 minutes)

**Logic**:
1. Find users with `nextRunUtc` in due window (now-2min to now+5min)
2. For each user:
   - Refresh Microsoft Graph token
   - Calculate report window based on cadence (Mon-Sun blocks)
   - Fetch calendar events and sent mail (if enabled)
   - Generate report HTML
   - Render PDF (if output mode includes PDF)
   - Create draft email (if output mode includes email)
   - Update run status and next scheduled run

### Cleanup Timer (Nightly)

**Trigger**: `0 0 2 * * *` (2 AM daily)

**Logic**:
1. Find PDFs older than 30 days in Azure Blob Storage
2. Delete blobs
3. Clear `pdfBlobKey` in database

## Environment Variables

See `.env.example` for required configuration.

## Testing

```bash
npm test
```

## Deployment

Deploy to Azure Functions. See deployment documentation for details.

## Notes

- Playwright requires Chromium binary; ensure it's installed in Azure Functions environment
- Use Application Insights for monitoring and logging
- Refresh tokens are encrypted at rest using Azure Key Vault
