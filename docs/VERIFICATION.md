# Monorepo Verification Guide

## Setup Complete ✅

The monorepo has been configured with:
- ✅ npm workspaces: `shared`, `api`, `worker`, `addin`
- ✅ Root package.json with proper scripts
- ✅ TypeScript configs for each workspace
- ✅ ESLint + Prettier at root level
- ✅ Jest testing configuration
- ✅ Minimal source files with placeholder tests
- ✅ Environment variable templates

## Verification Commands

Run these commands in order from the repository root:

### 1. Install Dependencies

```powershell
npm install
```

**Expected outcome**: 
- All workspace dependencies installed
- No errors
- `node_modules/` created in root and each workspace

### 2. Build All Packages

```powershell
npm run build
```

**Expected outcome**:
- `shared/dist/` created with compiled TypeScript
- `api/dist/` created with compiled TypeScript
- `worker/dist/` created with compiled TypeScript
- `addin/dist/` created (webpack build)
- No compilation errors

### 3. Run All Tests

```powershell
npm test
```

**Expected outcome**:
- Tests run in all 4 workspaces
- All placeholder tests pass
- Test summary shows passed tests

### 4. Run Linter

```powershell
npm run lint
```

**Expected outcome**:
- ESLint runs across all workspaces
- No errors (warnings are okay)

### 5. Type Check

```powershell
npm run typecheck
```

**Expected outcome**:
- TypeScript type checking passes in all workspaces
- No type errors

### 6. Check Formatting

```powershell
npm run format:check
```

**Expected outcome**:
- Prettier checks all files
- All files properly formatted

## Optional: Development Mode Test

```powershell
npm run dev
```

**Expected outcome**:
- API server starts on port 3000
- Addin webpack dev server starts on port 3001
- Both run concurrently (press Ctrl+C to stop)

## Individual Workspace Commands

If you need to work on individual packages:

```powershell
# Build only shared
npm run build --workspace=shared

# Test only api
npm test --workspace=api

# Dev mode for worker
npm run dev --workspace=worker

# Lint only addin
npm run lint --workspace=addin
```

## Troubleshooting

### If `npm install` fails:
- Ensure Node.js >= 18.0.0: `node --version`
- Ensure npm >= 9.0.0: `npm --version`
- Clear npm cache: `npm cache clean --force`

### If `npm run build` fails:
- Build shared first: `npm run build --workspace=shared`
- Check TypeScript is installed: `npm list typescript`

### If `npm test` fails:
- Ensure Jest is installed in each workspace
- Check jest.config.js exists in each workspace

## Next Steps

After verification succeeds:
1. Review [BUILD_SPEC.md](../BUILD_SPEC.md) for implementation requirements
2. Review [DECISIONS.md](./DECISIONS.md) for architecture decisions
3. Begin implementation per BUILD_SPEC.md Section "IMPLEMENTATION ORDER"
