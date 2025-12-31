# Cosmos DB Setup Guide

This guide covers setting up Azure Cosmos DB for local development and running the bootstrap script.

## Option 1: Local Development with Cosmos DB Emulator (Windows Only)

The Azure Cosmos DB Emulator provides a local environment for development and testing without requiring an Azure subscription.

### Download and Install

1. **Download the Cosmos DB Emulator**:
   - Visit: https://aka.ms/cosmosdb-emulator
   - Download and install the latest version (minimum version 2.14.0 recommended)
   - The installer will automatically start the emulator after installation

2. **Verify Installation**:
   - Open your browser to: https://localhost:8081/_explorer/index.html
   - You should see the Cosmos DB Emulator UI
   - Accept the SSL certificate warning (the emulator uses a self-signed certificate)

### Default Connection Settings

The emulator runs with these default settings (already configured in `.env.example`):

```env
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==
COSMOS_DATABASE_ID=outlook-weekly
```

**Note**: The emulator key is a well-known public key used for local development only. Never use this key in production!

### Starting the Emulator

The emulator typically starts automatically when Windows starts. If not:

1. **Start from Windows Menu**:
   - Search for "Azure Cosmos DB Emulator" in the Start menu
   - Click to launch

2. **Or use Command Line**:
   ```powershell
   # Start the emulator (if not running)
   & "C:\Program Files\Azure Cosmos DB Emulator\Microsoft.Azure.Cosmos.Emulator.exe"
   
   # Check if it's running
   netstat -an | Select-String "8081"
   ```

3. **Verify it's running**:
   - Open: https://localhost:8081/_explorer/index.html
   - Or check Task Manager for "Microsoft.Azure.Cosmos.Emulator.exe"

### SSL Certificate Trust (Important!)

The emulator uses a self-signed SSL certificate. For Node.js to connect properly:

**Option A: Accept Self-Signed Certificates (Dev Only)**
```powershell
# In PowerShell, before running npm commands:
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"

# Or add to your .env file (api and worker):
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Option B: Trust the Emulator Certificate (Recommended)**
1. Open the emulator UI: https://localhost:8081/_explorer/index.html
2. Click the SSL certificate warning in your browser
3. Export the certificate
4. Import it into "Trusted Root Certification Authorities" in Windows Certificate Manager

### Emulator Limitations

- **Windows only** (for Mac/Linux, use Azure Cosmos DB in the cloud)
- **Data is not persistent** across emulator restarts by default
- **Free tier limits** don't apply to the emulator
- **Performance** may differ from production Azure Cosmos DB

---

## Option 2: Azure Cosmos DB (Cloud)

For non-Windows development or production deployment.

### Create a Cosmos DB Account

1. **Using Azure Portal**:
   - Go to: https://portal.azure.com
   - Create new "Azure Cosmos DB" resource
   - Select API: **Core (SQL)**
   - Choose pricing tier: **Free Tier** (1000 RU/s, 25 GB storage - sufficient for <100 users)

2. **Using Azure CLI**:
   ```bash
   # Login
   az login
   
   # Create resource group
   az group create --name outlook-weekly-rg --location eastus
   
   # Create Cosmos DB account (Free Tier)
   az cosmosdb create \
     --name outlook-weekly-cosmos \
     --resource-group outlook-weekly-rg \
     --enable-free-tier true \
     --default-consistency-level Session
   
   # Get connection details
   az cosmosdb keys list \
     --name outlook-weekly-cosmos \
     --resource-group outlook-weekly-rg \
     --type keys
   ```

3. **Update your `.env` file**:
   ```env
   COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
   COSMOS_KEY=your-primary-key-from-azure-portal
   COSMOS_DATABASE_ID=outlook-weekly
   ```

---

## Bootstrap the Database

After setting up the Cosmos DB Emulator (or Azure Cosmos DB), run the bootstrap script to create the database and containers.

### From the API Package

```powershell
# Navigate to api folder
cd api

# Copy .env.example to .env if you haven't already
Copy-Item .env.example .env

# Edit .env and verify COSMOS_* settings

# Run bootstrap
npm run bootstrap
```

### Expected Output

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

### What the Bootstrap Script Creates

1. **Database**: `outlook-weekly` (or your custom name)

2. **Containers** (with partition keys):
   - `tenants` - partition key: `/id` (or `/tenantId`)
   - `users` - partition key: `/tenantId`
   - `userTokens` - partition key: `/userId`
   - `userSettings` - partition key: `/userId`
   - `runs` - partition key: `/userId`

### Partition Key Strategy

- **tenants**: Partitioned by tenant ID (each tenant is a separate partition)
- **users**: Partitioned by tenant ID (all users in a tenant share a partition)
- **userTokens**: Partitioned by user ID (each user's tokens in one partition)
- **userSettings**: Partitioned by user ID (one settings doc per user)
- **runs**: Partitioned by user ID (all runs for a user in one partition)

This strategy ensures:
- Efficient queries for user-specific data
- Low cost for <100 users
- No cross-partition queries for user-specific operations
- Scheduler can use cross-partition query for due jobs (acceptable at small scale)

---

## Troubleshooting

### Error: "ECONNREFUSED localhost:8081"

- **Solution**: Start the Cosmos DB Emulator
- Verify it's running: https://localhost:8081/_explorer/index.html

### Error: "self signed certificate in certificate chain"

- **Solution**: Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in your environment
- Or trust the emulator's SSL certificate (see SSL Certificate Trust section above)

### Error: "COSMOS_ENDPOINT and COSMOS_KEY must be set"

- **Solution**: Copy `.env.example` to `.env` and verify the values
- Make sure you're running the command from the `api` directory

### Emulator Data Lost After Restart

- **Solution**: The emulator doesn't persist data by default
- For persistent storage, run: `Microsoft.Azure.Cosmos.Emulator.exe /DataPath=C:\CosmosData`
- Or simply re-run `npm run bootstrap` after each emulator restart

### Port 8081 Already in Use

- **Solution**: Another application is using port 8081
- Stop the conflicting app or configure the emulator to use a different port:
  ```powershell
  Microsoft.Azure.Cosmos.Emulator.exe /Port=8082
  ```
- Update `COSMOS_ENDPOINT` in your `.env` accordingly

---

## Verifying the Setup

After bootstrapping, you can verify the setup:

1. **Using the Emulator UI**:
   - Open: https://localhost:8081/_explorer/index.html
   - You should see the `outlook-weekly` database
   - Expand to see all 5 containers

2. **Using the Smoke Test** (see next section):
   ```powershell
   cd api
   npm test -- smoke.test.ts
   ```

---

## Next Steps

1. ✅ Install and start Cosmos DB Emulator (or set up Azure Cosmos DB)
2. ✅ Configure `.env` with connection details
3. ✅ Run `npm run bootstrap` to create database and containers
4. 🚀 Run the smoke test to verify repositories work
5. 🚀 Start building API endpoints and worker functions

---

## Additional Resources

- [Cosmos DB Emulator Documentation](https://learn.microsoft.com/en-us/azure/cosmos-db/local-emulator)
- [Azure Cosmos DB Free Tier](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier)
- [Cosmos DB Node.js SDK](https://learn.microsoft.com/en-us/javascript/api/overview/azure/cosmos-readme)
- [Partition Key Design](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
