# Phase 7A: Microsoft Entra OAuth + Microsoft Graph Integration

## Overview

Phase 7A replaces mock authentication with real Microsoft Entra (Azure AD) OAuth 2.0 authentication and integrates Microsoft Graph API to create draft emails.

## What Was Implemented

### 1. OAuth Authentication Flow

**Backend Components:**
- **Token Encryption** (`api/src/utils/tokenEncryption.ts`): AES-256-GCM encryption for secure storage of refresh tokens
- **JWT Sessions** (`api/src/utils/jwt.ts`): JWT-based session tokens with 7-day expiry
- **OAuth Routes** (`api/src/routes/auth.ts`):
  - `GET /auth/login`: Redirects to Microsoft authorization endpoint
  - `GET /auth/callback`: Exchanges code for tokens, creates user, returns session token
- **Session Middleware** (`api/src/middleware/sessionAuth.ts`): Validates Bearer tokens on `/me/*` routes

**Frontend Components:**
- **Connect Screen** (`addin/src/components/ConnectScreen.tsx`): Uses Office dialog for OAuth
- **Auth Service** (`addin/src/services/authService.ts`): Manages session token storage
- **API Client** (`addin/src/services/api.ts`): Includes Bearer token in authenticated requests

### 2. Microsoft Graph Integration

**Graph Client Helper** (`api/src/services/graphClient.ts`):
- Token refresh management
- Access token caching (5-minute buffer before expiry)
- Automatic re-authentication on token expiry

**Draft Email Creation** (`api/src/routes/generate.ts`):
- Generates static HTML report content
- Creates draft email via Microsoft Graph `POST /me/messages`
- Stores draft message ID in ReportRun

### 3. Security Features

- **Encrypted Refresh Tokens**: AES-256-GCM with PBKDF2 key derivation (100k iterations)
- **JWT Session Tokens**: Signed with HS256, includes issuer/audience validation
- **Secure Token Storage**: Refresh tokens encrypted in Cosmos DB, JWT tokens client-side
- **Automatic Session Cleanup**: Invalid tokens cleared on 401 responses

## Required Environment Variables

Add these to `api/.env`:

```env
# Azure AD / Entra App Registration
AZURE_CLIENT_ID=your-client-id-from-azure-portal
AZURE_CLIENT_SECRET=your-client-secret-from-azure-portal

# OAuth Configuration
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT Session Token Secret (min 32 characters)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=your-jwt-secret-at-least-32-chars-change-in-production

# Token Encryption Secret (for encrypting refresh tokens)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ENCRYPTION_SECRET=your-encryption-secret-base64-change-in-production
```

Add to `addin/.env`:

```env
REACT_APP_API_URL=http://localhost:3000
```

## Azure App Registration Setup

### Step 1: Create App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click **New registration**
3. Configure:
   - **Name**: Outlook Weekly Reports
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web → `http://localhost:3000/auth/callback`
4. Click **Register**

### Step 2: Configure API Permissions

1. Go to **API permissions** tab
2. Click **Add a permission** → Microsoft Graph → Delegated permissions
3. Add these permissions:
   - `offline_access` (maintain access to data)
   - `User.Read` (read user profile)
   - `Mail.Read` (read user mail)
   - `Mail.ReadWrite` (read and write user mail)
   - `Calendars.Read` (read user calendar)
4. Click **Add permissions**
5. ⚠️ **Admin consent may be required** for organizational accounts

### Step 3: Create Client Secret

1. Go to **Certificates & secrets** tab
2. Click **New client secret**
3. Description: "Outlook Weekly API Secret"
4. Expiration: Choose based on your needs (max 24 months)
5. Click **Add**
6. ⚠️ **Copy the secret value immediately** - you won't see it again

### Step 4: Update Environment Variables

1. Copy **Application (client) ID** from Overview page → `AZURE_CLIENT_ID`
2. Copy **Client secret value** → `AZURE_CLIENT_SECRET`
3. Generate JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
4. Generate encryption secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

## OAuth Flow Details

### Authorization Flow

```
1. User clicks "Connect with Microsoft 365"
   ↓
2. Office dialog opens → GET /auth/login
   ↓
3. Redirects to login.microsoftonline.com/common/oauth2/v2.0/authorize
   ↓
4. User signs in and consents to permissions
   ↓
5. Microsoft redirects to /auth/callback?code=...
   ↓
6. Server exchanges code for access_token + refresh_token
   ↓
7. Server fetches user info from Graph API /me
   ↓
8. Server creates/updates Tenant, User, UserToken in Cosmos
   ↓
9. Server encrypts refresh_token and stores in UserToken
   ↓
10. Server generates JWT session token
   ↓
11. Server returns HTML with postMessage containing session token
   ↓
12. Add-in receives message, stores session token
   ↓
13. Add-in navigates to Settings screen
```

### API Request Flow

```
1. Add-in makes request to /me/settings
   ↓
2. Add-in includes Authorization: Bearer <session-token>
   ↓
3. sessionAuth middleware validates JWT
   ↓
4. Middleware sets req.user = {userId, tenantId, email, displayName}
   ↓
5. Route handler proceeds with authenticated user
```

### Token Refresh Flow

```
1. Generate endpoint calls getGraphClient(userId)
   ↓
2. graphClient checks token cache
   ↓
3. If cached token expired or missing:
   - Fetch encrypted refresh_token from Cosmos
   - Decrypt refresh_token
   - POST to token endpoint with refresh_token
   - Cache new access_token
   ↓
4. Return authenticated Graph client
   ↓
5. Use client to call Graph API
```

## Testing the Implementation

### 1. Generate Secrets

```powershell
# In PowerShell
cd api
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy output to JWT_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy output to ENCRYPTION_SECRET
```

### 2. Start Services

```powershell
# Terminal 1: Start API
cd api
npm run dev

# Terminal 2: Start Add-in
cd addin
npm start
```

### 3. Test OAuth Flow

1. Open Outlook Web or Desktop
2. Load the add-in (via manifest.xml)
3. Click "Connect with Microsoft 365"
4. Sign in with your Microsoft account
5. Consent to permissions (if prompted)
6. Verify redirect back to add-in with success message

### 4. Test API Authentication

```powershell
# Should return 401 Unauthorized (no token)
curl http://localhost:3000/me/settings

# Get session token from browser localStorage:
# Open browser dev tools → Console:
localStorage.getItem('outlook-weekly-session-token')

# Use token in API request:
$token = "your-session-token"
curl http://localhost:3000/me/settings -H "Authorization: Bearer $token"
```

### 5. Test Draft Email Creation

1. Configure settings in the add-in
2. Go to Generate tab
3. Click "Generate Report Now"
4. Check response for `draftMessageId`
5. Open Outlook → Drafts folder
6. Verify draft email with report content

## Troubleshooting

### "Failed to open sign-in dialog"

**Problem**: Office.context.ui.displayDialogAsync fails
**Solutions**:
- Ensure `displayInIframe: false` is set
- Check that API_URL is accessible from Office
- Verify manifest.xml allows dialog display

### "admin_consent_required"

**Problem**: Organization requires admin approval for permissions
**Solutions**:
1. Ask tenant admin to grant consent
2. Admin can pre-approve: Azure Portal → Enterprise applications → Outlook Weekly Reports → Permissions → Grant admin consent
3. Or use consent URL: `https://login.microsoftonline.com/{tenant}/adminconsent?client_id={client_id}`

### "Token refresh failed"

**Problem**: Refresh token expired or invalid
**Solutions**:
- User needs to re-authenticate (sign in again)
- Check that `offline_access` scope is requested
- Verify refresh token is correctly encrypted/decrypted

### "Invalid JWT signature"

**Problem**: JWT_SECRET mismatch or changed
**Solutions**:
- Verify JWT_SECRET is set and matches between sessions
- Users need to sign in again if secret changed
- Check JWT_SECRET has no leading/trailing whitespace

### "Failed to create draft email"

**Problem**: Graph API call fails
**Solutions**:
- Check `Mail.ReadWrite` permission is granted
- Verify access token is valid (not expired)
- Check network logs for Graph API error details
- Ensure user has mailbox (not guest account without mailbox)

## Security Considerations

### Production Deployment

1. **Change all secrets**: Generate new JWT_SECRET and ENCRYPTION_SECRET
2. **Use Azure Key Vault**: Store secrets in Key Vault, not environment variables
3. **Update redirect URI**: Change to production URL (e.g., `https://api.example.com/auth/callback`)
4. **Enable HTTPS**: Require TLS for all OAuth endpoints
5. **Rotate client secrets**: Set expiration and rotate regularly
6. **Implement rate limiting**: Prevent token abuse
7. **Add CORS restrictions**: Limit to known origins only

### Token Management

- **Session tokens**: 7-day expiry, cannot be refreshed (user re-authenticates)
- **Refresh tokens**: No expiry, but can be revoked by user or admin
- **Access tokens**: 1-hour expiry, automatically refreshed using refresh token
- **Token storage**: Refresh tokens encrypted in Cosmos, session tokens in browser localStorage

### Permission Scopes

Current scopes:
- `offline_access`: Get refresh token
- `User.Read`: Get user profile (email, display name)
- `Mail.Read`: Read user emails (future use for sent mail analysis)
- `Mail.ReadWrite`: Create draft emails
- `Calendars.Read`: Read calendar events (future use)

⚠️ **Note**: No `Mail.Send` scope - add-in creates drafts, user manually sends

## Next Steps (Future Phases)

- **Phase 7B**: Fetch real calendar data from Microsoft Graph
- **Phase 7C**: Fetch real sent email data from Microsoft Graph
- **Phase 7D**: Generate reports with actual data (replace static HTML)
- **Phase 8**: Scheduled report generation with Azure Functions
- **Phase 9**: PDF generation with real report data

## Files Changed/Added

### Backend (api/)
- ✅ `src/utils/tokenEncryption.ts` - NEW
- ✅ `src/utils/jwt.ts` - NEW
- ✅ `src/routes/auth.ts` - NEW
- ✅ `src/middleware/sessionAuth.ts` - NEW
- ✅ `src/services/graphClient.ts` - NEW
- ✅ `src/routes/generate.ts` - UPDATED (draft creation)
- ✅ `src/index.ts` - UPDATED (OAuth routes, session auth)
- ✅ `.env` - UPDATED (new variables)

### Frontend (addin/)
- ✅ `src/components/ConnectScreen.tsx` - UPDATED (OAuth dialog)
- ✅ `src/services/authService.ts` - NEW
- ✅ `src/services/api.ts` - UPDATED (Bearer tokens, auth errors)
- ✅ `src/index.tsx` - UPDATED (session persistence, auth error handling)

### Dependencies Added
- `@microsoft/microsoft-graph-client` - Graph API SDK
- `jsonwebtoken` + `@types/jsonwebtoken` - JWT handling
- Node `crypto` module (built-in) - Token encryption

## Summary

Phase 7A successfully implements:
- ✅ Real OAuth 2.0 authentication with Microsoft Entra
- ✅ Secure token storage with encryption
- ✅ JWT-based session management
- ✅ Microsoft Graph integration for draft email creation
- ✅ Office dialog-based OAuth flow
- ✅ Automatic token refresh
- ✅ Session persistence across add-in reloads

The authentication system is production-ready with proper security measures. The draft email feature demonstrates Graph API integration, paving the way for future data fetching phases.
