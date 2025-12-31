# Outlook Weekly Reports

Monorepo for Microsoft 365 Outlook add-in and Azure backend that generates weekly status reports.

## Project Overview

This project provides an Outlook add-in that allows users to:
- Connect their Microsoft 365 account
- Configure automated weekly/biweekly/monthly status reports
- Generate reports on-demand or on a schedule
- Receive reports as draft emails, sent emails, or PDFs

**Primary Goal**: Users install the add-in from the Microsoft 365 / Outlook marketplace, connect their account, configure cadence and output preferences, and the system generates reports automatically (even when Outlook is closed) or on-demand.

## Architecture

### Monorepo Structure

```
/
├── addin/          # Office.js Outlook add-in (React + TypeScript)
├── api/            # Backend API (Express + TypeScript)
├── worker/         # Azure Functions (Timer triggers)
├── shared/         # Shared types, utilities, logic
├── BUILD_SPEC.md   # Full technical specification
├── package.json    # Root workspace configuration
└── README.md       # This file
```

### Tech Stack

- **Frontend**: React, TypeScript, Office.js
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Functions**: Azure Functions (Node.js)
- **Storage**: Azure Blob Storage
- **Secrets**: Azure Key Vault
- **Auth**: OAuth 2.0 (Microsoft Entra ID / Azure AD)
- **PDF Generation**: Playwright Chromium

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## How to Run

### 1. Install Dependencies

From the repository root:

```bash
npm install
```

This installs dependencies for all workspace packages (shared, api, worker, addin).

### 2. Build All Packages

```bash
npm run build
```

This builds all TypeScript packages. The `shared` package is built first automatically.

### 3. Run Tests

```bash
npm test
```

Runs Jest tests across all workspaces.

### 4. Development Mode

Run api and addin in development mode concurrently:

```bash
npm run dev
```

This starts:
- API server on `http://localhost:3000` (with hot reload)
- Add-in webpack dev server on `http://localhost:3001`

To run individual services:

```bash
# API only
npm run dev --workspace=api

# Add-in only
npm run dev --workspace=addin

# Worker (Azure Functions)
npm run dev --workspace=worker
```

### 5. Linting and Formatting

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Format all code with Prettier
npm run format

# Check formatting
npm run format:check

# Type check all packages
npm run typecheck
```

## Environment Setup (For Future Implementation)

Each package has an `.env.example` file. Copy and configure when needed:

```bash
# API
cp api/.env.example api/.env

# Worker
cp worker/.env.example worker/local.settings.json

# Add-in
cp addin/.env.example addin/.env
```

## Package Details

### `/addin` - Office.js Add-in

React + TypeScript task pane add-in for Outlook.

**Screens**:
- Connect: OAuth flow and connection status
- Settings: Configure cadence, output mode, data sources
- Generate: On-demand report generation
- History: View past runs and download PDFs

**Key Features**:
- Supports Windows desktop (best), Outlook Web, Outlook iOS (minimal)
- Office dialog API for OAuth flows
- Responsive UI for mobile

[Read more](addin/README.md)

### `/api` - Backend API

Express + TypeScript REST API for authentication, settings, and report generation.

**Endpoints**:
- `/auth/*` - OAuth flows
- `/me/settings` - User settings CRUD
- `/me/generate` - On-demand generation
- `/me/runs` - Run history
- `/me/runs/:id/pdf-link` - Signed PDF URLs

[Read more](api/README.md)

### `/worker` - Azure Functions

Timer-triggered functions for scheduled execution and cleanup.

**Functions**:
- **Scheduler** (every 5 min): Execute due report jobs
- **Cleanup** (nightly): Delete PDFs older than 30 days

[Read more](worker/README.md)

### `/shared` - Shared Library

Common types, enums, DTOs, and utilities.

**Includes**:
- Enums: `OutputMode`, `Cadence`, `RunStatus`
- Scheduling: Mon-Sun window calculations
- Template: HTML report generator
- Summarizer: Deterministic grouping (MVP)

[Read more](shared/README.md)

## Key Features

### Output Modes

1. **DRAFT_EMAIL_TO_SELF** (default): Create draft email in user's mailbox
2. **SEND_EMAIL_TO_SELF**: Send report to user's mailbox
3. **PDF_ONLY**: Generate PDF for download
4. **DRAFT_PLUS_PDF**: Draft email with PDF attachment

### Cadence Options

- **WEEKLY**: Previous Mon-Sun week
- **BIWEEKLY**: Previous 2 Mon-Sun weeks
- **MONTHLY**: Previous 4 Mon-Sun weeks

### Data Sources (MVP)

- **Calendar**: Meeting titles and attendees (no body)
- **Sent Mail**: Subject, recipients, bodyPreview (no raw bodies stored)

### Consent Strategy

1. Attempt user consent first (Office SSO + OAuth with offline_access)
2. If blocked, show "Admin approval required" with admin consent link
3. Support both user consent and admin consent flows

### Retention Policy

- Do NOT store raw email bodies
- Store only run metadata and pointers (draftMessageId, pdfBlobKey)
- PDFs retained for 30 days, then automatically deleted

## Scripts

```bash
# Install all workspace dependencies
npm install

# Development
npm run dev:addin
npm run dev:api
npm run dev:worker

# Build all packages
npm run build:all

# Test all packages
npm run test:all

# Clean all
npm run clean
```

## Deployment

See individual package READMEs for deployment instructions:
- API: Deploy to Azure App Service
- Worker: Deploy to Azure Functions
- Add-in: Package and submit to Microsoft 365 marketplace

## Documentation

- [BUILD_SPEC.md](BUILD_SPEC.md) - Complete technical specification
- [addin/README.md](addin/README.md) - Add-in documentation
- [api/README.md](api/README.md) - API documentation
- [worker/README.md](worker/README.md) - Worker documentation
- [shared/README.md](shared/README.md) - Shared library documentation

## Testing

Each package includes unit tests. Run all tests:

```bash
npm run test:all
```

**Critical test coverage**:
- Mon-Sun window calculations for all cadences and timezones
- Next-run computation
- Deterministic summarizer grouping

## License

UNLICENSED - Private project
