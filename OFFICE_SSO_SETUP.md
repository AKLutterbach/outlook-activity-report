# Office SSO Setup Guide

## Azure AD App Registration Configuration

### 1. Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Name: `Outlook Weekly Reports`
4. Supported account types: Choose based on your needs:
   - **Accounts in this organizational directory only** (single tenant)
   - **Accounts in any organizational directory** (multi-tenant)
5. Click "Register"
6. **Note your Application (client) ID and Directory (tenant) ID**

### 2. Expose an API

1. In your app registration, go to **Expose an API**
2. Click "Set" next to Application ID URI
3. Set it to: `api://localhost:3001/<your-client-id>`
   - Replace `<your-client-id>` with your actual client ID
   - For production: `api://your-domain.com/<client-id>`
4. Click "Add a scope":
   - Scope name: `access_as_user`
   - Who can consent: **Admins and users**
   - Admin consent display name: `Access Outlook Weekly Reports`
   - Admin consent description: `Allows the app to access Outlook Weekly Reports on behalf of the signed-in user`
   - User consent display name: `Access Outlook Weekly Reports`
   - User consent description: `Allows the app to access your Outlook data`
   - State: **Enabled**
5. Click "Add scope"

### 3. Authorize Office Client Applications

Still in "Expose an API":
1. Click "Add a client application"
2. Add these Office client application IDs (pre-authorize them):
   - `d3590ed6-52b3-4102-aeff-aad2292ab01c` (Office on Windows, Mac, mobile)
   - `bc59ab01-8403-45c6-8796-ac3ef710b3e3` (Outlook on Windows, Mac, mobile)
   - `57fb890c-0dab-4253-a5e0-7188c88b2bb4` (Office.com, Outlook.com)
   - `08e18876-6177-487e-b8b5-cf950c1e598c` (Office on mobile)
3. Select the `access_as_user` scope for each
4. Click "Add application"

### 4. API Permissions (for Microsoft Graph access - optional)

If you want to use the On-Behalf-Of (OBO) flow to call Microsoft Graph:

1. Go to **API permissions**
2. Click "Add a permission" → **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `User.Read` (basic profile)
   - `Mail.Read` (read email)
   - `Mail.ReadWrite` (read/write email)
   - `Calendars.Read` (read calendar)
   - `offline_access` (refresh tokens)
4. Click "Add permissions"
5. **Click "Grant admin consent"** (requires admin)

### 5. Authentication Platform Configuration

1. Go to **Authentication**
2. Click "Add a platform" → **Single-page application**
3. Add redirect URIs:
   - `https://localhost:3001`
   - For production: `https://your-domain.com`
4. Under "Implicit grant and hybrid flows": **Do not check anything** (not needed for Office SSO)
5. Click "Configure"

### 6. Certificates & Secrets (only needed for OBO flow)

If you want to use On-Behalf-Of to call Microsoft Graph from your backend:

1. Go to **Certificates & secrets**
2. Click "New client secret"
3. Description: `Outlook Weekly Reports API`
4. Expires: Choose duration (recommend 12 months for dev)
5. Click "Add"
6. **Copy the secret value immediately** (you won't see it again)
7. Add to `api/.env` as `AZURE_CLIENT_SECRET`

## Add-in Manifest Configuration

Update your `addin/manifest.xml` to include the WebApplicationInfo section:

```xml
<VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides" xsi:type="VersionOverridesV1_0">
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides/1.1" xsi:type="VersionOverridesV1_1">
    
    <!-- Add WebApplicationInfo for Office SSO -->
    <WebApplicationInfo>
      <Id>YOUR_CLIENT_ID_HERE</Id>
      <Resource>api://localhost:3001/YOUR_CLIENT_ID_HERE</Resource>
      <Scopes>
        <Scope>User.Read</Scope>
        <Scope>Mail.Read</Scope>
        <Scope>Calendars.Read</Scope>
        <Scope>offline_access</Scope>
      </Scopes>
    </WebApplicationInfo>

    <Hosts>
      <Host xsi:type="MailHost">
        <!-- rest of your manifest -->
```

**Replace:**
- `YOUR_CLIENT_ID_HERE` with your actual Azure AD client ID
- For production, change `localhost:3001` to your production domain

## Environment Variables

### Frontend (addin/.env)
```env
REACT_APP_API_URL=https://localhost:3000
```

### Backend (api/.env)
```env
# Azure AD Configuration
AZURE_CLIENT_ID=your-client-id-here
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_SECRET=your-client-secret-here  # Only needed for OBO

# JWT for session tokens
JWT_SECRET=your-long-random-secret-here
ENCRYPTION_SECRET=your-encryption-secret-here

# Other settings
FRONTEND_URL=https://localhost:3001
PORT=3000
NODE_ENV=development

# Cosmos DB
COSMOS_ENDPOINT=https://localhost:8081
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE=outlook-weekly
```

## Local Development Setup

### 1. Trust SSL Certificates

Both servers use HTTPS with self-signed certificates:

1. Start both servers
2. Visit `https://localhost:3000/health` and accept the certificate (type "thisisunsafe")
3. Visit `https://localhost:3001` and accept the certificate

### 2. Same Tenant Requirement

Office SSO requires the user to be in the same Azure AD tenant as the app registration. For development:
- Use a work/school account from your Azure AD tenant
- Personal Microsoft accounts (outlook.com, live.com) won't work with single-tenant apps

### 3. Sideload the Add-in

1. In Outlook on the web, click the "…" menu → "Get Add-ins"
2. Click "My add-ins" → "Add a custom add-in" → "Add from file"
3. Upload your `addin/manifest.xml`
4. The add-in will appear in the ribbon/overflow menu

### 4. Test the Flow

1. Open the add-in in Outlook
2. Click "Connect with Microsoft 365"
3. If prompted, sign in and consent to permissions
4. The add-in should authenticate without opening a popup
5. You should see the Settings screen

## Troubleshooting

### Error 13001 - User not signed in
- User must be signed into Office with a work/school account
- Personal Microsoft accounts may not work depending on tenant configuration

### Error 13002 - User aborted consent
- User clicked "Cancel" on the consent prompt
- Try again and click "Accept"

### Error 13004 - Invalid resource
- `WebApplicationInfo > Resource` in manifest doesn't match Azure AD app's Application ID URI
- Check manifest.xml and Azure AD "Expose an API" section

### Error 13005 - Invalid grant / Consent required
- Admin consent may be required for your organization
- Ask your IT admin to pre-consent to the app in Azure AD

### Error 13006 - Client ID mismatch
- `WebApplicationInfo > Id` in manifest doesn't match Azure AD client ID
- Verify manifest.xml has the correct client ID

### Token validation fails (401)
- Check `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` in api/.env
- Verify Application ID URI in Azure AD matches what's in the token's `aud` claim
- Check token expiration (tokens are typically valid for 1 hour)

### OBO flow fails
- Ensure `AZURE_CLIENT_SECRET` is set in api/.env
- Verify Microsoft Graph API permissions are granted
- Admin consent may be required for Graph permissions

## Production Checklist

- [ ] Change Application ID URI from `api://localhost:3001/...` to `api://your-domain.com/...`
- [ ] Update manifest.xml with production domain
- [ ] Use real SSL certificates (not self-signed)
- [ ] Set `AZURE_TENANT_ID` to your actual tenant ID (not "common")
- [ ] Rotate and secure `AZURE_CLIENT_SECRET`
- [ ] Use environment-specific app registrations (dev, staging, prod)
- [ ] Enable diagnostic logging in Azure AD
- [ ] Set up proper CORS origins
- [ ] Review and minimize API permission scopes
- [ ] Consider using managed identities for Azure resources
