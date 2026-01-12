# Phase 2 Deployment Checklist

## ✅ Completed: Build System Fixes

- [x] Fixed tsconfig.json (rootDir: "./src" → outputs dist/functions.js)
- [x] Fixed package.json main entry (dist/functions.js)
- [x] Fixed functions-package.json main entry (dist/functions.js)
- [x] Fixed .funcignore (removed source folder exclusions)
- [x] Added health endpoint with zero dependencies
- [x] Fixed module-load crash (lazy Cosmos init)
- [x] Validated: 8/8 automated tests passed

## ✅ Completed: GitHub Workflow Fixes

- [x] Added Node.js setup with npm caching
- [x] Added deterministic build step (npm ci && npm run build)
- [x] Moved package.json swap AFTER build
- [x] Removed tsconfig.json deletion
- [x] Changed skip_api_build: true (deploy pre-built artifacts)
- [x] Added validation that dist/functions.js exists

## 🔄 Next: Local Validation

Run the manual test to verify Functions host works locally:

```powershell
cd api
.\test-health.ps1
```

**Expected Results:**
- Functions host starts without errors
- All 7 functions discovered:
  - health: [GET] /api/health
  - auth-start, auth-exchange, auth-signout
  - me, me-generate, me-runs
- Health endpoint returns: `{ status: 'ok', timestamp: '...', nodeVersion: '...' }`
- No module-load crashes
- No duplicate registrations

## 🚀 Next: Azure Deployment

### Option A: Test via GitHub Actions

1. **Commit all changes:**
   ```powershell
   git add .
   git commit -m "Fix: Deterministic Functions build & unified v4 model

   - Fixed tsconfig to output dist/functions.js
   - Fixed module-load crash with lazy Cosmos init
   - Added health endpoint with zero dependencies
   - Fixed workflow to build locally before deploy
   - Eliminated duplicate function registrations
   "
   git push origin master
   ```

2. **Monitor GitHub Actions:**
   - Go to: https://github.com/YOUR-REPO/actions
   - Watch for "Azure Static Web Apps CI/CD" workflow
   - Verify build step succeeds
   - Check for "✓ TypeScript compiled successfully"

3. **Verify in Azure Portal:**
   - Navigate to your Static Web App
   - Check Functions tab for 7 functions listed
   - Test health endpoint: `https://happy-rock-01b03941e.1.azurestaticapps.net/api/health`

### Option B: Manual Azure Functions Deployment (Standalone)

If you want to deploy just the API to a Function App (not SWA):

```powershell
cd api
npm ci
npm run build

# Deploy to Azure Function App (if you have one)
func azure functionapp publish <your-function-app-name>
```

## 📊 Success Criteria

**Deployment is successful when:**

✅ GitHub Actions build completes without TypeScript errors
✅ Azure Portal shows "Running" status (not "Stopped" or error)
✅ Functions tab lists all 7 functions
✅ Health endpoint returns 200 OK with JSON: `{ "status": "ok", ... }`
✅ No 503 errors in Application Insights or logs
✅ Can invoke health endpoint within 5 seconds of cold start

## 🔍 Troubleshooting (If Health Endpoint Still Fails)

### Check Azure Logs:

```powershell
# If using func CLI
func azure functionapp logstream <your-function-app-name>

# Or in Azure Portal:
# Function App → Monitor → Log Stream
```

**Look for:**
- "Host started" message
- "Worker process started and initialized"
- Function discovery messages
- Any module load errors

### Common Issues:

1. **Still 503**: Check Application Insights for startup errors
2. **Module not found**: Verify node_modules/ was included in deployment
3. **Cannot find module './db/cosmosClient'**: Check dist/ folder structure
4. **Environment variables**: Verify all required env vars are set in Azure

## 📝 Environment Variables Required in Azure

Make sure these are set in Azure Portal → Configuration:

```
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE_ID=OutlookReports
JWT_SECRET=your-jwt-secret-32-chars-min
ENTRA_CLIENT_ID=your-entra-client-id
ENTRA_CLIENT_SECRET=your-entra-client-secret (if needed)
ENTRA_TENANT_ID=your-tenant-id (or "organizations")
SWA_URL=https://happy-rock-01b03941e.1.azurestaticapps.net
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection (if using queues)
```

## 🎯 Post-Deployment Validation

After successful deployment:

```powershell
# Test health endpoint
Invoke-RestMethod "https://happy-rock-01b03941e.1.azurestaticapps.net/api/health"

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-01-11T...",
#   "nodeVersion": "v20.x.x"
# }
```

## 🔄 Phase 3: Type Errors & Cleanup (Future)

After health endpoint is stable in production:
- Fix remaining 46 TypeScript errors in routes/ and repositories
- Delete redundant individual function folders (auth-start/, me/, etc.)
- Unify Cosmos repository instantiation
- Fix MSAL TokenCache usage
- Add integration tests

---

**Current Status:** ✅ Ready for deployment testing
**Next Step:** Run `.\test-health.ps1` for local validation
