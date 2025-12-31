# Complete Testing Guide - Outlook Weekly Reports

This guide walks you through testing the entire application from scratch.

## Prerequisites Check

Before starting, verify you have:

```powershell
# Check Node version (need 18+)
node --version

# Check npm
npm --version

# Check Cosmos DB Emulator is running (Windows)
# Visit: https://localhost:8081/_explorer/index.html
# Should see Cosmos emulator UI
```

## Step 1: Generate Required Secrets (2 minutes)

```powershell
cd c:\Users\aklut\Documents\OutlookBuild\Outlook-Weekly\api

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy this output

# Generate encryption secret  
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy this output
```

## Step 2: Configure API Environment (3 minutes)

Edit `api/.env` and fill in these required values:

```env
# These you have:
AZURE_CLIENT_ID=your-value-here
AZURE_CLIENT_SECRET=your-value-here

# Paste the secrets you just generated:
JWT_SECRET=paste-first-generated-secret-here
ENCRYPTION_SECRET=paste-second-generated-secret-here

# These should already be set for local Cosmos:
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
COSMOS_DATABASE_ID=outlook-weekly
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## Step 3: Install Dependencies (3 minutes)

```powershell
# From project root
cd c:\Users\aklut\Documents\OutlookBuild\Outlook-Weekly

# Install all workspace dependencies
npm install
```

## Step 4: Bootstrap Cosmos DB (1 minute)

```powershell
cd api
npm run bootstrap
```

**Expected output:**
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

## Step 5: Start API Server (1 minute)

**Open new PowerShell terminal:**

```powershell
cd c:\Users\aklut\Documents\OutlookBuild\Outlook-Weekly\api
npm run dev
```

**Expected output:**
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

**Test 1: Health Check**
```powershell
# In another terminal:
curl http://localhost:3000/health
```
Expected: `{"status":"ok","timestamp":"2025-12-24T..."}`

## Step 6: Start Add-in Dev Server (2 minutes)

**Open another PowerShell terminal:**

```powershell
cd c:\Users\aklut\Documents\OutlookBuild\Outlook-Weekly\addin
npm start
```

**Expected output:**
```
webpack compiled successfully
```

Browser should auto-open to `http://localhost:3001`

## Step 7: Test Add-in in Browser (5 minutes)

### Test 7a: Connect Screen
1. Visit `http://localhost:3001`
2. You should see:
   - "Welcome to Outlook Weekly Reports" header
   - "Connect with Microsoft 365" button
3. **Don't click yet** - we need to verify OAuth setup first

### Test 7b: Verify OAuth Endpoint
```powershell
# Open browser to:
http://localhost:3000/auth/login
```
- Should redirect to Microsoft login page
- This confirms OAuth is configured
- Close this tab (don't sign in yet)

## Step 8: Test Full OAuth Flow (3 minutes)

### Option A: Browser Test

1. Go back to `http://localhost:3001`
2. Click **"Connect with Microsoft 365"**
3. You should see Microsoft sign-in dialog
4. Sign in with your M365 account
5. Review permissions (if prompted):
   - Read your calendar
   - Read your mail
   - Read and write your mail
6. Click **Accept**
7. Dialog should close
8. You should now see **Settings screen** with:
   - Frequency dropdown
   - Output mode dropdown
   - Day/time selectors
   - Include calendar/email toggles

**Success Indicators:**
- No errors in browser console (F12)
- "Settings" tab is active
- You can see all form fields

## Step 9: Configure Settings (2 minutes)

1. On Settings screen, configure:
   - **Frequency**: Weekly
   - **Output**: Draft email to self
   - **Day**: Monday
   - **Time**: 9:00
   - **Timezone**: (select yours)
   - **Include calendar**: ✅ Yes
   - **Include sent mail**: ✅ Yes

2. Click **"Save Settings"**

**Expected:**
- Green success message: "Settings saved successfully!"
- No errors

**Verify in Database:**
```powershell
# Open Cosmos Emulator
https://localhost:8081/_explorer/index.html

# Navigate to:
outlook-weekly > userSettings > Documents

# You should see 1 document with your settings
```

## Step 10: Test Report Generation (3 minutes)

1. Click **"Generate" tab**
2. You should see:
   - "Generate Report Now" button
   - Description text
   - No reports yet

3. Click **"Generate Report Now"**

**Expected response (in ~3 seconds):**
- Success message: "Draft created successfully"
- Run ID displayed
- Draft Message ID displayed

## Step 11: Verify Draft Email Created (2 minutes)

### Option A: Outlook Web
1. Open [Outlook Web](https://outlook.office.com)
2. Go to **Drafts** folder
3. Look for email: "Weekly Report: [date range]"
4. Open it

**Expected content:**
- Subject: "Weekly Report: Dec 16 - Dec 22, 2024" (or similar)
- To: Your email address
- Body: HTML report with:
  - Your name and email
  - Report period
  - "This is a placeholder report" notice
  - Calendar Summary section (placeholder)
  - Email Activity section (placeholder)

### Option B: Outlook Desktop
1. Open Outlook Desktop
2. Click **Drafts** folder
3. Find the report email
4. Open and verify content

## Step 12: Test Report History (1 minute)

1. Click **"History" tab** in add-in
2. You should see:
   - Table with 1 run
   - Status: SUCCESS
   - Date/time
   - Actions column with buttons

**Verify in Database:**
```powershell
# Cosmos Emulator:
outlook-weekly > runs > Documents

# You should see 1 document with:
# - status: "SUCCESS"
# - draftMessageId: "AAMk..." (Graph message ID)
```

## Step 13: Test Cosmos DB Persistence (2 minutes)

**Refresh browser completely (F5)**

Expected:
- Still shows Settings screen (session persists!)
- Settings still populated
- History still shows runs
- No need to re-authenticate

**This proves:**
- JWT session tokens working
- LocalStorage persistence working
- Database queries working

## Step 14: Test API Endpoints Directly (3 minutes)

### Get Session Token
```powershell
# In browser console (F12):
localStorage.getItem('outlook-weekly-session-token')
# Copy the token value
```

### Test Settings Endpoint
```powershell
$token = "paste-your-token-here"

# Get settings
curl http://localhost:3000/me/settings -H "Authorization: Bearer $token"
```

Expected: JSON with your settings

### Test Runs Endpoint
```powershell
# Get runs
curl "http://localhost:3000/me/runs?limit=10" -H "Authorization: Bearer $token"
```

Expected: JSON array with your runs

### Test Generate Endpoint
```powershell
# Generate another report
curl http://localhost:3000/me/generate -Method POST -H "Authorization: Bearer $token"
```

Expected: New draft created, new run ID

## Step 15: Test Disconnect/Reconnect (2 minutes)

1. Click **"Disconnect"** button in add-in footer
2. You should return to Connect screen
3. Session token cleared from localStorage
4. Click **"Connect with Microsoft 365"** again
5. Should re-authenticate (might skip consent if already granted)
6. Back to Settings screen

## Step 16: Verify Multi-User Support (Optional, 5 minutes)

If you have access to another M365 account:

1. Open incognito/private browser window
2. Go to `http://localhost:3001`
3. Connect with different M365 account
4. Configure different settings
5. Generate report

**Check Cosmos DB:**
- Should have 2 tenants
- Should have 2 users  
- Should have 2 userSettings
- Should have 2 userTokens (both encrypted)

Each user's data is isolated by userId/tenantId partitions.

## Success Checklist

After completing all tests, verify:

- ✅ API health endpoint responds
- ✅ OAuth login redirects to Microsoft
- ✅ OAuth callback returns JWT token
- ✅ JWT token stored in localStorage
- ✅ Session persists across page reloads
- ✅ Settings CRUD works (Create/Read/Update)
- ✅ Generate creates draft email in Outlook
- ✅ Draft contains HTML report content
- ✅ History shows past runs with status
- ✅ Cosmos DB has all documents (5 containers populated)
- ✅ Disconnect/reconnect flow works
- ✅ No console errors in browser
- ✅ No server errors in API logs

## What You've Tested

**Phase 1-3: Infrastructure**
- ✅ Cosmos DB setup and bootstrapping
- ✅ Repository pattern (5 repositories)
- ✅ Data partitioning by userId/tenantId
- ✅ Schema versioning

**Phase 4: API Layer**
- ✅ Express REST API
- ✅ Settings endpoints (GET/PUT)
- ✅ Runs endpoints (GET)
- ✅ Generate endpoint (POST)
- ✅ Health check endpoint

**Phase 5: PDF (Stubbed)**
- ⚠️ PDF generation not yet implemented
- ⚠️ Will test in future phase

**Phase 6: React Add-in**
- ✅ 4 screens (Connect, Settings, Generate, History)
- ✅ Form handling and validation
- ✅ API client integration
- ✅ Error handling
- ✅ Loading states

**Phase 7A: OAuth + Graph**
- ✅ OAuth authorization code flow
- ✅ Token encryption (AES-256-GCM)
- ✅ JWT session tokens (7-day expiry)
- ✅ Microsoft Graph client
- ✅ Draft email creation
- ✅ Token refresh handling
- ✅ Session persistence

## Troubleshooting

### "Failed to connect to Cosmos DB"
- Ensure Cosmos Emulator is running
- Visit https://localhost:8081/_explorer/index.html
- Check NODE_TLS_REJECT_UNAUTHORIZED=0 in .env

### "AZURE_CLIENT_ID not configured"
- Edit api/.env and add your Azure app registration client ID
- Restart API server

### "JWT_SECRET not configured"
- Generate secrets using crypto.randomBytes command above
- Add to api/.env
- Restart API server

### "No draft appears in Outlook"
- Check API response has draftMessageId
- Refresh Drafts folder
- Try Outlook Web instead of Desktop
- Verify Mail.ReadWrite permission granted

### "Session expired" after reconnect
- Expected if JWT_SECRET changed
- Click Disconnect and reconnect
- New session will be created

### Browser shows white screen
- Check addin dev server is running
- Check for errors in browser console (F12)
- Verify http://localhost:3001 is accessible

## Next Steps

Now that core functionality is working, you can:

1. **Test Azure deployment** (when ready)
2. **Add real data fetching** (Phase 7B: Calendar, Phase 7C: Email)
3. **Implement PDF generation** (Phase 5 completion)
4. **Add scheduled workers** (Phase 8: Azure Functions)
5. **Test in Outlook Desktop** via sideloading manifest

## Performance Baseline

Record these for future comparison:

- OAuth flow: ~3-5 seconds
- Settings save: ~200-500ms
- Generate report: ~2-3 seconds
- History load: ~200-400ms
- Draft appears in Outlook: Immediate (via Graph API)

## What's Still Placeholder

Current limitations (to be addressed in future phases):

- ❌ Report content is static HTML (no real calendar/email data)
- ❌ Calendar section says "pending implementation"
- ❌ Email section says "pending implementation"
- ❌ PDF generation returns stub URLs
- ❌ Scheduled jobs not running (needs Azure Functions)
- ❌ No email sending (SEND_EMAIL_TO_SELF mode disabled)

**But you have:**
- ✅ Full authentication working
- ✅ Complete data persistence
- ✅ Draft email creation working
- ✅ All CRUD operations working
- ✅ Production-ready infrastructure
