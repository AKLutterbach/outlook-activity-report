You are my senior engineer. Build a monorepo for a Microsoft 365 Outlook add-in (Office.js task pane) plus an Azure backend and Azure Functions workers that generate status reports. The add-in must be eligible for a Microsoft 365 / Outlook marketplace listing and work best on Windows desktop Outlook, also work on Outlook web, and provide a minimal functional experience on Outlook iOS. The scheduled automation must run even when Outlook is closed.

PRIMARY GOAL
- Users install the add-in from the Outlook marketplace listing, connect their Microsoft 365 account, configure cadence and output, and the system generates a report on a schedule (even if Outlook is closed) and supports on-demand generation from the add-in.

OUTPUT MODES
- Implement OutputMode options:
  1) DRAFT_EMAIL_TO_SELF (default): create a draft email in the user's mailbox addressed to the user.
  2) SEND_EMAIL_TO_SELF: send the generated report to the user's mailbox (feature-flag in MVP).
  3) PDF_ONLY: generate a PDF and make it available for download.
  4) DRAFT_PLUS_PDF: create a draft email to self and attach the PDF.

TARGET AUDIENCE AND TEMPLATE
- Primary target: Microsoft 365 work tenants.
- The report content is written “to my manager,” but in MVP the output is delivered to the user (draft or sent to self) so they can save or forward.
- Use one fixed, plain professional HTML template (no branding required).

CADENCE AND REPORT WINDOWS
- User selects cadence: WEEKLY, BIWEEKLY, MONTHLY.
- User selects day-of-week and time of day in the user's mailbox time zone.
- Reporting windows must be Mon–Sun blocks in mailbox time zone:
  - WEEKLY: previous full week (Mon 00:00 to Sun 23:59)
  - BIWEEKLY: previous two full Mon–Sun weeks
  - MONTHLY: previous four full Mon–Sun weeks
- Implement robust timezone handling. Compute next scheduled run from cadence + day/time and convert to UTC for storage and scheduling.

DATA SOURCES (MVP)
- Calendar: meeting titles and attendees only (no body/description).
- Sent mail: Sent Items only; must include message body content signal. In MVP, use bodyPreview always; optionally fetch full body for messages below a size threshold. Do NOT store raw bodies.

AI
- MVP: deterministic extraction and grouping (no LLM).
- Add a Summarizer interface so v2 can add Azure OpenAI summarization (opt-in later). In MVP implement DeterministicSummarizer.

RETENTION (OPTION A) + PDF RETENTION
- Follow Option A retention:
  - Do NOT store raw email bodies.
  - Store only run metadata and pointers (draftMessageId, pdfBlobKey).
  - Do NOT persist the full generated report text in the database for MVP; only persist it in the created draft and/or PDF.
- PDFs are stored in Azure Blob Storage and retained for 30 days by default.
- Implement a nightly cleanup timer job that deletes PDFs older than 30 days and clears pdfBlobKey in storage metadata.

CONSENT STRATEGY (USER CONSENT FIRST, ADMIN FALLBACK)
- Must support scheduled runs, so implement OAuth Authorization Code flow with offline_access to obtain refresh tokens.
- Attempt user consent first:
  - In add-in, try Office SSO to identify the user and tenant.
  - Then run OAuth auth code flow in an Office dialog to obtain offline_access + Graph delegated scopes.
- If user consent is blocked or admin consent is required:
  - Detect the error and show an “Admin approval required” UI state.
  - Provide an admin consent link and a “copy email to admin” template.
  - The add-in should remain usable for showing status, but block generation until consent is granted.

AUTH / GRAPH PERMISSIONS (DELEGATED)
- Implement delegated Microsoft Graph access with refresh tokens.
- Required scopes (minimum):
  - offline_access
  - Calendars.Read
  - Mail.Read (for Sent Items content)
  - Mail.ReadWrite (to create drafts and attachments)
- Optional:
  - Mail.Send ONLY if SEND_EMAIL_TO_SELF mode is enabled. Implement SEND_EMAIL_TO_SELF behind a feature flag so MVP can ship without Mail.Send.

AZURE STACK (COST OPTIMIZED FOR <100 USERS)
- Use Azure Functions (Consumption) where possible to minimize fixed cost:
  - /api: Node.js + TypeScript HTTP-trigger Azure Functions (preferred), or App Service if needed.
  - /worker: Azure Functions Timer Triggers:
    - scheduler runner every 5 minutes for due report jobs
    - nightly cleanup job for PDF retention
- Persistence: Azure Cosmos DB (Free Tier) for users, settings, tokens, and runs. No Postgres in MVP.
- PDFs: Azure Blob Storage.
- Secrets and encryption keys: Azure Key Vault. Encrypt refresh tokens at rest.

COSMOS DB DATA MODEL
- Use @azure/cosmos SDK.
- Containers (suggested):
  - tenants
  - users
  - userTokens
  - userSettings
  - runs
- Keep documents small and versioned. Include a schemaVersion in each doc.
- Partition strategy:
  - tenants: partitionKey = /id (or /tenantId)
  - users: partitionKey = /tenantId
  - userTokens: partitionKey = /userId
  - userSettings: partitionKey = /userId
  - runs: partitionKey = /userId
- Store nextRunUtc on userSettings to make due-job selection cheap.
- Due-job selection can use cross-partition query (acceptable for <100 users).

REPO STRUCTURE (NPM WORKSPACES)
- Root uses npm workspaces: ["shared","api","worker","addin"]
- /addin:
  - Office.js add-in (React + TypeScript) with a task pane.
  - Screens: Connect, Settings, Generate, History.
  - Responsive layout for iOS.
  - Buttons/actions: Connect, Save Settings, Generate Now, Open Draft, Download PDF.
- /api:
  - HTTP APIs for auth, settings, generate, runs, pdf-link.
  - Cosmos DB repositories.
- /worker:
  - Timer triggers and job execution.
  - Graph client utilities.
  - Report generation utilities.
  - PDF rendering utilities (Playwright Chromium).
  - Cosmos DB access for schedules and run persistence.
- /shared:
  - Shared types (enums, DTOs).
  - Date window and scheduling logic.
  - HTML template generator.
  - Deterministic summarizer.

API ENDPOINTS (MVP)
- Auth:
  - GET /auth/login
  - GET /auth/callback
  - POST /auth/sso/exchange (optional: exchange Office SSO token for app session)
- Settings:
  - GET /me/settings
  - PUT /me/settings (must update nextRunUtc)
- Generate:
  - POST /me/generate (modeOverride optional)
- Runs:
  - GET /me/runs?limit=5
- PDF:
  - GET /me/runs/:runId/pdf-link (returns short-lived signed URL)

WORKER LOGIC
- Every 5 minutes:
  - Query Cosmos userSettings for due users using nextRunUtc within (now-2min, now+5min).
  - Refresh Graph token from stored refresh token.
  - Compute report window (previous Mon–Sun blocks) based on cadence.
  - Fetch calendar events (if enabled).
  - Fetch Sent Items messages (if enabled).
  - Generate report HTML via template and deterministic summarizer.
  - If outputMode includes PDF: render PDF server-side via Playwright, store blob, record pdfBlobKey.
  - If outputMode includes email draft: create draft message to self with HTML body, attach PDF if needed, record draftMessageId.
  - If outputMode is SEND_EMAIL_TO_SELF and feature flag enabled: send the draft or sendMail.
  - Persist run status, timestamps, and error summaries.
  - Update userSettings.nextRunUtc to the next scheduled run after successful execution (and also after failure, to avoid tight retry loops).

- Nightly cleanup:
  - Delete blobs older than 30 days and clear pdfBlobKey in run records (or mark pdfDeleted = true).

GRAPH INTEGRATION DETAILS
- Implement a Graph client wrapper that supports:
  - Read calendar view for a time window (title, start/end, attendees).
  - Read Sent Items messages for a time window (subject, toRecipients, sentDateTime, bodyPreview, optionally body).
  - Create draft message to self.
  - Add file attachment to a message (PDF).
  - Send message if enabled.

PDF GENERATION
- Render the same report HTML template to PDF using Playwright Chromium in the backend/worker.
- Store in Azure Blob Storage; do not store PDF bytes in Cosmos.

TESTING
- Unit tests for:
  - Mon–Sun window calculation for weekly/biweekly/monthly in different time zones.
  - Next-run computation and due selection window.
  - Deterministic summarizer grouping logic.
- Integration tests (lightweight) for:
  - Cosmos repositories using the Cosmos Emulator in local dev (or mocked SDK if emulator unavailable).
  - PDF rendering success.

LOCAL DEVELOPMENT
- Cosmos DB:
  - Prefer Cosmos DB Emulator for Windows local dev.
  - Alternatively allow connecting to a real Azure Cosmos DB dev account via env vars.
- Blob:
  - Use Azurite for local blob storage if needed.

DELIVERABLES
- Scaffold the monorepo, provide local dev scripts, environment variables, and README instructions.
- Provide a minimal but working UI with states:
  - Not connected
  - Connected
  - Admin approval required
  - Running / last run result
  - Error + retry
- Provide a clean error model and logging.

IMPLEMENTATION ORDER
1) Scaffold repo and shared types.
2) Implement date window + scheduling logic and unit tests.
3) Implement Cosmos DB repositories and local dev wiring.
4) Implement API settings and runs endpoints.
5) Implement report template + deterministic summarizer.
6) Implement /me/generate end-to-end (manual generate, draft to self).
7) Implement worker scheduled runs using nextRunUtc.
8) Implement PDF generation + blob storage + signed URLs.
9) Implement nightly cleanup.
10) Implement add-in UI wiring and test on Windows/web, then smoke test on iOS.