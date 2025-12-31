# Outlook Weekly Reports - Add-in

Office.js Outlook add-in task pane for weekly status reports.

## Features

- 📧 **Connect**: Mock authentication for local development
- ⚙️ **Settings**: Configure report schedule, frequency, and output options
- ⚡ **Generate**: Create on-demand reports
- 📋 **History**: View past report runs

## Tech Stack

- **React 18** + TypeScript
- **Office.js** for Outlook integration
- **Webpack** for bundling
- **CSS** for styling (no framework dependencies)

## Prerequisites

- Node.js 18+
- npm or yarn
- Outlook Desktop (Windows/Mac) or Outlook on the Web
- Backend API running on http://localhost:3001

## Setup

### 1. Install Dependencies

```powershell
cd addin
npm install
```

### 2. Start Development Server

```powershell
npm run dev
```

The add-in will be available at `https://localhost:3000/taskpane.html`

### 3. Start Backend API

In a separate terminal:

```powershell
cd ../api
npm run dev
```

The API should be running on http://localhost:3001

## Sideloading the Add-in

### Option 1: Outlook on Windows (Recommended for Development)

1. **Trust Self-Signed Certificate**
   - Navigate to `https://localhost:3000` in your browser
   - Accept the certificate warning (this is your development server)

2. **Sideload via Manifest**
   - Open Outlook Desktop
   - Go to **File** > **Get Add-ins** > **My Add-ins**
   - Click **Add a custom add-in** > **Add from File...**
   - Browse to `Outlook-Weekly/addin/manifest.xml`
   - Click **Install**

3. **Verify Installation**
   - Open any email message
   - Look for **Weekly Reports** button in the ribbon
   - Click it to open the task pane

### Option 2: Outlook on the Web

1. **Upload Manifest**
   - Go to https://outlook.office.com
   - Click the gear icon (⚙️) > **View all Outlook settings**
   - Go to **General** > **Manage add-ins**
   - Click **+ Add from file**
   - Upload `manifest.xml`
   - Click **Install**

2. **Access Add-in**
   - Open any email
   - Click the **More actions** (•••) menu
   - Select **Weekly Reports**

### Option 3: Outlook for Mac

1. **Sideload Manifest**
   - Open Outlook for Mac
   - Go to **Tools** > **Custom Add-ins**
   - Click **Add Custom Add-in** > **Add from File...**
   - Select `manifest.xml`
   - Click **Install**

### Option 4: Command Line (Advanced)

Use the Office Add-in Debugging tools:

```powershell
# Start Outlook with add-in
npm run start

# Stop debugging
npm run stop
```

## Development Workflow

### 1. Run in Development Mode

```powershell
# Terminal 1: Start add-in dev server
cd addin
npm run dev

# Terminal 2: Start API server
cd api
npm run dev

# Terminal 3: Start Outlook with add-in
cd addin
npm run start
```

### 2. Make Changes

- Edit files in `src/` - webpack will hot reload
- Changes to manifest require reloading Outlook

### 3. Validate Manifest

```powershell
npm run validate
```

## Project Structure

```
addin/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── ConnectScreen.tsx   # Mock auth screen
│   │   ├── SettingsScreen.tsx  # Settings configuration
│   │   ├── GenerateScreen.tsx  # On-demand generation
│   │   └── HistoryScreen.tsx   # Run history
│   ├── services/
│   │   └── api.ts              # Backend API client
│   ├── styles/
│   │   └── app.css             # Global styles
│   └── index.tsx               # App entry point
├── manifest.xml                # Outlook add-in manifest
├── webpack.config.js           # Webpack configuration
├── tsconfig.json               # TypeScript configuration
└── package.json
```

## Screens

### Connect Screen
- Mock authentication for local dev
- Enter email address to "connect"
- In production, this will use Office SSO

### Settings Screen
- **Schedule**: Frequency (Weekly/Biweekly/Monthly), day, time, timezone
- **Content**: Include calendar events, sent mail stats
- **Output**: Draft email, send email, PDF only, or draft + PDF
- Shows next scheduled run time

### Generate Screen
- Generate on-demand report for current week
- Shows generation status
- Links to history

### History Screen
- List of past report runs
- Status badges (Pending, Running, Completed, Error)
- Report period and timestamps
- View report links (when available)

## API Integration

The add-in calls these backend endpoints:

- `GET /health` - Health check
- `GET /me/settings` - Fetch user settings
- `PUT /me/settings` - Update settings
- `POST /me/generate` - Generate report
- `GET /me/runs?limit=N` - Fetch run history
- `GET /me/runs/:runId/pdf-link` - Get PDF link (stub)

API client is in `src/services/api.ts`

## Building for Production

```powershell
npm run build
```

Output will be in `dist/` directory.

## Testing

```powershell
# Run tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix
```

## Troubleshooting

### Add-in doesn't appear in Outlook
- Verify dev server is running on `https://localhost:3000`
- Check Outlook supports sideloading (not all versions do)
- Try removing and re-adding the manifest
- Check browser console in task pane (F12)

### Certificate errors
- Make sure you've accepted the localhost certificate
- Visit `https://localhost:3000` in browser and accept warning
- Some corporate networks block self-signed certs

### API connection fails
- Verify backend is running on http://localhost:3001
- Check CORS settings in API server
- Open browser console for detailed errors
- Try `curl http://localhost:3001/health` to test API

### Changes not showing
- Hard refresh task pane (Ctrl+F5 in Windows)
- Close and reopen Outlook
- Restart webpack dev server
- Clear browser cache

## Responsive Design

The UI is responsive and supports:
- Desktop Outlook (Windows/Mac)
- Outlook on the Web
- Outlook on iOS (minimal support)

Safe areas and touch targets are optimized for mobile.

## Security Notes

- This is a **development-only** setup
- Self-signed HTTPS certificate for localhost
- Mock authentication (no real OAuth)
- Production deployment will require:
  - Valid SSL certificate
  - Office SSO integration
  - Proper OAuth flow
  - Hosted manifest and assets

## Next Steps

1. ✅ Basic UI and API wiring (Current)
2. 🔲 Office SSO authentication
3. 🔲 Real Outlook data integration (Graph API)
4. 🔲 Production manifest with valid URLs
5. 🔲 AppSource submission

## Resources

- [Office Add-ins Documentation](https://learn.microsoft.com/en-us/office/dev/add-ins/)
- [Outlook Add-in API](https://learn.microsoft.com/en-us/javascript/api/outlook)
- [Sideloading Guide](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/test-debug-office-add-ins)
- [Manifest Reference](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/add-in-manifests)
