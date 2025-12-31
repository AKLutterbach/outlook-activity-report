# Architecture Decisions

This document captures key architecture and design decisions for the Outlook Weekly Reports project.

## 1. Monorepo Structure

**Decision**: Use npm workspaces monorepo with 4 packages: `/addin`, `/api`, `/worker`, `/shared`

**Rationale**:
- Shared types and utilities across frontend, backend, and workers
- Unified dependency management and build pipeline
- Easier code reuse and consistency (scheduling logic, enums, templates)
- Single repository simplifies versioning and deployment coordination

## 2. Authentication Strategy: User Consent First, Admin Fallback

**Decision**: Implement OAuth Authorization Code flow with offline_access, attempting user consent first with graceful fallback to admin consent

**Rationale**:
- Scheduled runs require refresh tokens (offline_access)
- User consent provides better UX and faster onboarding
- Admin consent as fallback supports enterprise tenants with restricted user consent
- Show "Admin approval required" UI state with admin consent link when blocked
- Allows the add-in to remain functional (view status) even when consent is pending

**Implementation**:
- Office SSO to identify user and tenant
- OAuth auth code flow in Office dialog
- Detect consent errors and provide admin consent URL
- "Copy email to admin" template for requesting approval

## 3. Graph Permissions: Delegated (Not Application)

**Decision**: Use delegated Microsoft Graph permissions, not application permissions

**Required Scopes**:
- `offline_access` (refresh tokens)
- `Calendars.Read`
- `Mail.Read` (Sent Items)
- `Mail.ReadWrite` (create drafts, attachments)
- `Mail.Send` (optional, feature-flagged)

**Rationale**:
- Delegated permissions align with user-centric model
- Each user's refresh token accesses only their own data
- Better security posture and easier compliance
- Marketplace approval more straightforward with delegated permissions

## 4. Data Retention: Option A (Minimal Storage)

**Decision**: Do NOT store raw email bodies; store only run metadata and pointers

**What We Store**:
- Run metadata: timestamps, status, error summaries
- Pointers: `draftMessageId`, `pdfBlobKey`
- No raw email body content in database

**What We Don't Store**:
- Full email bodies
- Complete generated report text (only in draft/PDF)

**Rationale**:
- Privacy-first approach
- Minimal data retention reduces compliance burden
- Users own their data (stored in their mailbox/PDFs)
- Lower storage costs and database size

## 5. PDF Retention and Cleanup

**Decision**: Store PDFs in Azure Blob Storage with 30-day retention; nightly cleanup job

**Implementation**:
- PDFs stored in Azure Blob Storage (not in database)
- Store `pdfBlobKey` reference in database
- Nightly timer function deletes blobs older than 30 days
- Clear `pdfBlobKey` from database after deletion

**Rationale**:
- Blob storage is cost-effective for binary data
- Automatic cleanup prevents unbounded storage growth
- 30 days provides reasonable access window for users
- Signed URLs for secure, time-limited PDF access

## 6. Report Windows: Mon-Sun Blocks in Mailbox Timezone

**Decision**: All report windows are full Mon-Sun weeks in the user's mailbox timezone

**Window Definitions**:
- **WEEKLY**: Previous full Mon-Sun week (Mon 00:00 to Sun 23:59)
- **BIWEEKLY**: Previous 2 full Mon-Sun weeks
- **MONTHLY**: Previous 4 full Mon-Sun weeks

**Rationale**:
- Consistent, predictable reporting periods
- Aligns with typical work week expectations
- Timezone-aware: respects user's mailbox timezone
- Simplifies window calculation and avoids partial weeks

## 7. Scheduled Execution: 5-Minute Timer Trigger

**Decision**: Run scheduler every 5 minutes with a due window (now-2min to now+5min)

**Implementation**:
- Azure Function timer trigger: `0 */5 * * * *`
- Find users with `nextRunUtc` in due window
- Execute report generation for each due user
- Compute next `nextRunUtc` and store for future runs

**Rationale**:
- 5-minute granularity balances timeliness and cost
- Due window provides scheduling tolerance
- Runs even when Outlook is closed (backend-driven)
- Avoids over-scheduling (expensive API calls)

## 8. Output Modes: Four Options

**Decision**: Support 4 output modes to accommodate different user preferences

**Modes**:
1. **DRAFT_EMAIL_TO_SELF** (default): Create draft in user's mailbox
2. **SEND_EMAIL_TO_SELF**: Send report to user
3. **PDF_ONLY**: Generate PDF for download
4. **DRAFT_PLUS_PDF**: Draft email with PDF attachment

**Rationale**:
- DRAFT_EMAIL_TO_SELF is safest default (no automatic sending)
- PDF_ONLY supports users who want file-based reports
- DRAFT_PLUS_PDF combines both workflows
- SEND_EMAIL_TO_SELF behind feature flag (requires `Mail.Send`)

## 9. Data Sources (MVP): Calendar + Sent Mail

**Decision**: Fetch calendar events and sent mail; no body content stored

**Calendar Data**:
- Meeting titles
- Start/end times
- Attendees
- No body/description

**Sent Mail Data**:
- Subject
- Recipients
- SentDateTime
- bodyPreview (always)
- Optionally fetch full body for small messages (<threshold)
- **Do NOT store raw bodies**

**Rationale**:
- Calendar provides activity signal
- Sent mail shows outbound communication
- bodyPreview sufficient for MVP grouping
- Privacy-first: no body storage

## 10. AI/Summarization: Deterministic MVP, LLM Later

**Decision**: Implement deterministic summarizer for MVP; add Azure OpenAI in v2

**MVP Implementation**:
- `DeterministicSummarizer` class
- Group by: meeting attendees, email recipients, keywords
- No LLM calls, no external API dependencies

**Future (v2)**:
- Define `Summarizer` interface
- Add `AzureOpenAISummarizer` implementation (opt-in)
- User choice: deterministic vs AI-powered

**Rationale**:
- Faster MVP delivery without AI dependencies
- Lower costs and predictable behavior
- Summarizer interface enables future enhancement
- Deterministic approach sufficient for initial validation

## 11. Azure Stack

**Decision**: Use Azure-native services for hosting, storage, and secrets

**Services**:
- **API**: Azure App Service (Node.js)
- **Worker**: Azure Functions (Timer triggers)
- **Database**: PostgreSQL
- **Storage**: Azure Blob Storage (PDFs)
- **Secrets**: Azure Key Vault (refresh token encryption keys)

**Rationale**:
- App Service provides managed Node.js hosting with easy scaling
- Functions ideal for timer-based execution (scheduler, cleanup)
- Postgres reliable, well-supported, cost-effective
- Blob Storage optimized for large binary files
- Key Vault for secure encryption key management

## 12. PDF Generation: Server-Side with Playwright

**Decision**: Use Playwright Chromium to render HTML to PDF in backend/worker

**Implementation**:
- Same HTML template rendered to PDF
- Playwright Chromium in headless mode
- PDF generation in worker (during scheduled runs or on-demand)
- Store in Azure Blob Storage

**Rationale**:
- Server-side ensures consistent rendering
- Playwright provides high-quality PDF output
- Same template as email HTML (consistency)
- No client-side dependencies or browser requirements

## 13. Feature Flag: SEND_EMAIL_TO_SELF

**Decision**: Gate `SEND_EMAIL_TO_SELF` mode behind feature flag `ENABLE_SEND_EMAIL`

**Rationale**:
- `Mail.Send` permission may require additional review for marketplace
- Allows MVP to ship without sending capability if needed
- Draft-first approach is safer default
- Can enable later without code changes

## 14. Target Platforms

**Decision**: Best on Windows desktop, functional on Web, minimal on iOS

**Platform Support**:
- **Windows Desktop Outlook**: Best experience, full feature set
- **Outlook Web**: Full functionality, Office dialog for OAuth
- **Outlook iOS**: Minimal functional experience, responsive UI

**Rationale**:
- Windows desktop is primary enterprise environment
- Web support required for marketplace acceptance
- iOS support broadens reach but not primary focus
- Responsive design enables cross-platform with single codebase

## 15. Report Template: Single Fixed Professional Template

**Decision**: Use one fixed, plain professional HTML template (no branding required)

**Content**:
- Written "to my manager" (but delivered to user in MVP)
- User can save/forward as needed
- Professional formatting, no logos or branding

**Rationale**:
- Simplifies MVP scope
- Generic template works for all users
- Future versions can add customization
- Focus on content quality over aesthetics

## 16. Encryption at Rest

**Decision**: Encrypt refresh tokens at rest using Azure Key Vault encryption keys

**Implementation**:
- Store encrypted refresh tokens in database
- Encryption key stored in Azure Key Vault
- Decrypt only when needed for Graph API calls

**Rationale**:
- Security best practice for sensitive tokens
- Key Vault provides key rotation and access control
- Compliance with enterprise security requirements
- Defense in depth: compromised DB doesn't expose tokens

## Summary

These decisions prioritize:
- **Security**: Delegated permissions, encrypted tokens, minimal data retention
- **Privacy**: No raw body storage, user-owned data
- **Scalability**: Timer-based execution, blob storage, managed Azure services
- **Flexibility**: Multiple output modes, feature flags, extensible summarization
- **Simplicity**: Deterministic MVP, single template, clear consent strategy
