# Quick Setup Guide - Phase 7A OAuth

Follow these steps to get the OAuth-enabled Outlook Weekly Reports running locally.

## Prerequisites

- ✅ Node.js >= 18.0.0
- ✅ Cosmos DB Emulator (Windows) or Azure Cosmos DB
- ✅ Azure subscription (for App Registration)
- ✅ Microsoft 365 account for testing

## Step 1: Azure App Registration (5 minutes)

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click **New registration**
3. Set up:
   - **Name**: Outlook Weekly Reports (Dev)
   - **Account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: Web → `http://localhost:3000/auth/callback`
4. Click **Register**
5. **Save the Application (client) ID** - you'll need this as `AZURE_CLIENT_ID`

### Add API Permissions

1. Go to **API permissions** tab
2. Click **Add a permission** → Microsoft Graph → Delegated permissions
3. Add these 5 permissions:
   - ✅ offline_access
   - ✅ User.Read
   - ✅ Mail.Read
   - ✅ Mail.ReadWrite
   - ✅ Calendars.Read
4. Click **Add permissions**
5. Click **Grant admin consent** (if available) OR note that users will consent individually

### Create Client Secret

1. Go to **Certificates & secrets** tab
2. Click **New client secret**
3. Description: "Dev Secret"
4. Expiration: 6 months (or your preference)
5. Click **Add**
6. **⚠️ COPY THE SECRET VALUE IMMEDIATELY** - you won't see it again
7. Save as `AZURE_CLIENT_SECRET`

## Step 2: Generate Encryption Secrets (1 minute)

Open PowerShell in the `api` folder:

```powershell
cd api

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Save output as JWT_SECRET

# Generate encryption secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Save output as ENCRYPTION_SECRET
```

## Step 3: Configure Environment Variables (2 minutes)

### API Environment (`api/.env`)

1. Copy example: `Copy-Item api/.env.example api/.env`
2. Update these values:

```env
# From Step 1
AZURE_CLIENT_ID=<your-app-client-id>
AZURE_CLIENT_SECRET=<your-client-secret-value>

# From Step 2
JWT_SECRET=<your-generated-jwt-secret>
ENCRYPTION_SECRET=<your-generated-encryption-secret>

# Already set (Cosmos Emulator defaults)
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
COSMOS_DATABASE_ID=outlook-weekly
NODE_TLS_REJECT_UNAUTHORIZED=0

# Already set
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
FRONTEND_URL=http://localhost:3001
```

### Add-in Environment (`addin/.env`)

1. Copy example: `Copy-Item addin/.env.example addin/.env`
2. Update if needed (defaults should work):

```env
REACT_APP_API_URL=http://localhost:3000
NODE_ENV=development
```

## Step 4: Install Dependencies (2 minutes)

```powershell
# From root directory
npm install
```

This installs all workspace dependencies including the new OAuth packages:
- @microsoft/microsoft-graph-client
- jsonwebtoken

## Step 5: Bootstrap Cosmos DB (1 minute)

```powershell
cd api
npm run bootstrap
```

Expected output:
```
============================================================
Cosmos DB Bootstrap
============================================================

[Cosmos] Database ready: outlook-weekly
[Cosmos] Container ready: tenants
[Cosmos] Container ready: users
[Cosmos] Container ready: userTokens
[Cosmos] Container ready: userSettings
[Cosmos] Container ready: runs

✅ Bootstrap complete!
============================================================
```

## Step 6: Start Services (1 minute)

Open two PowerShell terminals:

**Terminal 1 - API:**
```powershell
cd api
npm run dev
```

Wait for:
```
============================================================
✅ Outlook Weekly API Server
============================================================
Port:        3000
Environment: development
Auth:        Microsoft Entra OAuth 2.0
Health:      http://localhost:3000/health
OAuth:       http://localhost:3000/auth/login
============================================================
```

**Terminal 2 - Add-in:**
```powershell
cd addin
npm start
```

Wait for:
```
webpack compiled successfully
```

## Step 7: Test OAuth Flow (3 minutes)

### Option A: Test in Browser

1. Open browser to `http://localhost:3001`
2. You should see "Welcome to Outlook Weekly Reports"
3. Click **Connect with Microsoft 365**
4. Sign in with your Microsoft 365 account
5. Consent to permissions (if prompted)
6. You should be redirected back and see Settings screen
7. Success! ✅

### Option B: Test in Outlook (Recommended)

1. Open Outlook Desktop or Outlook Web
2. Load the add-in manifest:
   - Desktop: File → Manage Add-ins → My Add-ins → Add a custom add-in from file
   - Web: Settings → View all Outlook settings → Customize actions → Add custom add-in from URL
3. Select `addin/manifest.xml`
4. Open any email
5. Click **Outlook Weekly** in ribbon or add-in panel
6. Click **Connect with Microsoft 365**
7. Office dialog opens with Microsoft login
8. Sign in and consent
9. Dialog closes, you see Settings screen
10. Success! ✅

## Step 8: Test Draft Email Creation (2 minutes)

1. In the add-in, go to **Settings** tab
2. Configure:
   - Frequency: Weekly
   - Output: Draft email to self
   - Day/Time: (any values)
   - Include calendar: Yes
   - Include sent mail: Yes
3. Click **Save Settings**
4. Go to **Generate** tab
5. Click **Generate Report Now**
6. Wait ~3 seconds
7. You should see "Draft created successfully"
8. Open Outlook → **Drafts** folder
9. Find draft email: "Weekly Report: [date range]"
10. Open draft - you should see HTML report with your name and email
11. Success! ✅

## Troubleshooting

### "Failed to open sign-in dialog"

**Problem**: Office.context.ui.displayDialogAsync fails  
**Fix**: 
- Ensure API is running on `http://localhost:3000`
- Check browser dev tools console for errors
- Try using Outlook Web instead of Desktop

### "admin_consent_required" error

**Problem**: Your organization requires admin approval  
**Fix**: 
1. Copy the admin consent URL from error message
2. Send to your tenant admin with permission list
3. Admin visits URL and clicks "Accept"
4. Try connecting again

### "Token refresh failed"

**Problem**: Refresh token invalid  
**Fix**: 
- Sign out and sign in again
- Check ENCRYPTION_SECRET hasn't changed
- Verify `offline_access` scope was granted

### "AZURE_CLIENT_ID not configured"

**Problem**: Environment variables not loaded  
**Fix**: 
- Verify `api/.env` exists and has correct values
- Restart API server
- Check for typos in variable names

### No draft appears in Outlook

**Problem**: Draft created but not visible  
**Fix**: 
- Refresh Drafts folder (F5)
- Check API response for `draftMessageId`
- Verify Mail.ReadWrite permission was granted
- Try Outlook Web to rule out sync issues

## Verify Setup

Run these checks to verify everything is working:

### 1. API Health Check
```powershell
curl http://localhost:3000/health
```
Expected: `{"status":"ok","timestamp":"..."}`

### 2. OAuth Login Redirect
Open browser: `http://localhost:3000/auth/login`  
Expected: Redirects to Microsoft login page

### 3. Session Token in Browser
1. Sign in to add-in
2. Open browser dev tools → Console
3. Run: `localStorage.getItem('outlook-weekly-session-token')`
4. Expected: Long JWT string (e.g., `eyJhbGciOiJIUzI1NiIsInR5cCI6...`)

### 4. Authenticated API Call
```powershell
# Get your session token from browser console first
$token = "your-session-token-here"
curl http://localhost:3000/me/settings -H "Authorization: Bearer $token"
```
Expected: Settings JSON or 404 if not configured yet

### 5. Database Check
Open Cosmos Emulator: `https://localhost:8081/_explorer/index.html`
- Database: `outlook-weekly`
- Check containers have documents:
  - `tenants`: 1+ documents
  - `users`: 1+ documents
  - `userTokens`: 1+ documents (with encryptedRefreshToken)

## Next Steps

After successful setup:

1. ✅ Configure your report settings in Settings tab
2. ✅ Generate your first report in Generate tab
3. ✅ Check report history in History tab
4. 📖 Read [PHASE_7A_OAUTH.md](PHASE_7A_OAUTH.md) for architecture details
5. 🚀 Future phases will add real calendar/email data fetching

## Support

If you encounter issues:
1. Check [PHASE_7A_OAUTH.md](PHASE_7A_OAUTH.md) troubleshooting section
2. Verify all prerequisites are installed
3. Check environment variables are correct
4. Review API server logs for error messages
5. Check browser console for client-side errors

---

**Setup Time**: ~15-20 minutes  
**Current Phase**: 7A - OAuth + Draft Email Creation  
**Status**: ✅ Production-ready authentication, static HTML reports
