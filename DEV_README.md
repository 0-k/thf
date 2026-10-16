# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Run locally (frontend only, mock data)
npm run dev

# Run with Netlify Functions (real weather API)
npm run netlify:dev

# Run tests
npm test

# Build for production
npm run build
```

## Architecture Overview

### Frontend (React + Vite)
- **Entry point:** `src/main.tsx`
- **Main app:** `src/App.tsx` (TypeScript, fully typed)
- **Scoring logic:** `src/utils/scoring.ts` (exported, testable)
- **Tests:** `src/App.test.tsx`, `src/utils/*.test.ts`, `netlify/**/*.test.ts` (138 tests)

### Backend (Netlify Functions)
- **Weather API:** `netlify/functions/weather.ts`
  - Fetches forecast + air quality from Open-Meteo (free, no key required)
  - Transform in `netlify/lib/openMeteo.ts` (unix timestamps, preceding-hour alignment)
  - Smart caching: Netlify Blobs (prod, via `connectLambda`) → In-memory (fallback) → stale data if the API is down
  - Returns 7 days forecast + today's past hours
  - Don't put non-function files (tests, helpers) in `netlify/functions/`: Netlify deploys every file there

### Caching Strategy

The weather function uses a **hybrid caching approach**:

1. **Production with Netlify Blobs enabled:**
   - ✅ Persistent cache shared across all function instances
   - ✅ Survives cold starts
   - ✅ ~24 API calls/day (minimal)

2. **Production/Dev without Netlify Blobs:**
   - ⚠️ In-memory cache per function instance
   - ⚠️ Lost on cold starts
   - Still works fine, just uses more API calls

**How it detects Blobs availability:**
- Tries to initialize `getStore()` from `@netlify/blobs`
- If it fails (MissingBlobsEnvironmentError), falls back to memory
- Logs which cache type is being used

## Local Development

### Option 1: Frontend Only (Mock Data)

```bash
npm run dev
# Opens http://localhost:5173
```

- Uses mock weather data from `src/App.tsx`
- Good for UI development
- No backend needed

### Option 2: Full Stack (Real API)

```bash
npm run netlify:dev
# Opens http://localhost:8888
```

- Runs Netlify Functions locally
- Real weather data from Open-Meteo
- Simulates production environment
- Uses **in-memory cache** (Blobs not available locally)

**API endpoint:** `http://localhost:8888/api/weather`

## Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

**Test coverage (138 tests):**
- UI smoke test: renders, activity switch, detail sheet, production error state
- All scoring functions, penalties, breakdown, generated explanations
- Opening hours logic (monthly, Berlin time)
- Crowd model incl. calibration against the 2014 visitor counts and observed peak times
- Berlin time, DST switches, sunrise/sunset, public holidays
- Best-window ranking
- Open-Meteo transform and the Netlify Function (cache, stale fallback, errors)

Typecheck everything (the function has its own config): `npm run typecheck`

`npm run verify` = typecheck + all tests. Netlify runs it before every build (production, deploy
previews, branch deploys), so a red test blocks the deploy.

## Deployment

### Production (master branch)

1. Push to GitHub
2. Netlify auto-deploys from master
3. Functions deployed automatically
4. Live at: your-site.netlify.app

### Staging/Preview Deployments

**Option 1: Pull Request Previews (Automatic)**

Create a PR and Netlify automatically deploys a preview:
- URL: `deploy-preview-X--your-site.netlify.app`
- Full Netlify environment (Functions + Blobs)
- Perfect for testing before merge

**Option 2: Branch Deploys (For Development Testing)**

For branches named `claude/dev_*`:

1. **First time setup** - Configure in Netlify UI:
   - Go to: Site settings → Build & deploy → Continuous deployment → Branch deploys
   - Select: "Let me add individual branches"
   - Add pattern: `claude/dev_*`

2. **Create dev branch:**
   ```bash
   git checkout -b claude/dev_feature-name
   git push -u origin claude/dev_feature-name
   ```

3. **Netlify auto-deploys to:**
   - URL: `claude-dev-feature-name--your-site.netlify.app`
   - Full environment with real Functions and Blobs
   - Updates on every push

**Branch naming convention:**
- `claude/dev_*` → Auto-deploys to staging (e.g., `claude/dev_blobs-test`)
- `claude/*` (other) → No auto-deploy (manual testing only)
- PRs from any branch → Always get deploy preview

**Netlify Blobs Setup (Optional but Recommended):**

Netlify Blobs should work automatically in production. If you see errors like:
```
MissingBlobsEnvironmentError: The environment has not been configured to use Netlify Blobs
```

This means Blobs isn't enabled for your site. The function will **automatically fall back to in-memory caching**, so your site will still work fine.

To enable Netlify Blobs (better caching):
1. Check your Netlify dashboard → Site settings → Build & deploy
2. Blobs should be auto-enabled for most sites
3. If not, contact Netlify support or accept the in-memory fallback

## Checking Cache Type in Production

The weather API response includes a `cache_type` field:

```json
{
  "success": true,
  "data": { ... },
  "cached": true,
  "cache_type": "Netlify Blobs",  // or "memory"
  "cached_at": "2025-11-23T10:00:00.000Z"
}
```

Check the Netlify function logs to see:
- `✅ Netlify Blobs initialized successfully` - Blobs working
- `⚠️ Netlify Blobs not available, using in-memory cache` - Fallback mode

## API Rate Limits

**Open-Meteo Free Tier:**
- 10,000 API calls/day
- 5,000/hour
- 600/minute

**Current usage:**
- With Blobs: ~24 calls/day (scheduled hourly)
- Without Blobs: 50-500 calls/day (depends on traffic)
- Well within limits for small-medium sites

## Project Structure

```
thf/
├── src/
│   ├── App.tsx               # Main React app (TypeScript)
│   ├── main.tsx              # Entry point
│   ├── components/           # UI components
│   ├── utils/
│   │   ├── scoring.ts        # Scoring engine + config
│   │   ├── crowd.ts          # Crowd model
│   │   ├── ranking.ts        # Best 2-hour windows
│   │   ├── time.ts           # Berlin time helpers
│   │   ├── calendar.ts       # Sun times, holidays
│   │   └── *.test.ts         # Tests
│   └── test/
│       └── setup.ts          # Vitest setup
├── netlify/
│   ├── functions/
│   │   └── weather.ts        # Weather API (hybrid caching)
│   ├── lib/openMeteo.ts      # Pure transform
│   └── tests/                # Function tests
├── dist/                     # Build output (gitignored)
├── netlify.toml              # Netlify config
├── package.json              # Dependencies & scripts
├── vite.config.js            # Vite bundler config
├── vitest.config.js          # Test config
├── tsconfig.json             # TypeScript config (strict mode)
└── tailwind.config.js        # Tailwind CSS config
```

## Common Issues

### Issue: "Couldn't load the forecast" in production

**Cause:** Weather function is failing and has no cached data to fall back on (production never shows mock data)
**Solution:** Check Netlify function logs for errors

### Issue: Times look shifted

All forecast logic uses Berlin time (`src/utils/time.ts`). Never call `Date#getHours()`/`getDay()` on
forecast timestamps, and never parse Open-Meteo local time strings with `new Date()` (the function runs in UTC).

### Issue: Cache not working

**Cause:** Netlify Blobs not enabled, cold starts clearing memory cache
**Solution:** This is expected without Blobs. Enable Blobs in Netlify dashboard or accept slightly higher API usage

### Issue: Tests failing

**Cause:** Scoring logic changed
**Solution:** Update tests in `src/utils/scoring.test.ts` to match new behavior. If `crowd.test.ts`
calibration tests fail after changing profile shapes, re-solve the day levels (see `src/utils/crowd.ts`).

## Coding Conventions

- TypeScript strict mode (all checks enabled)
- React hooks (useState, useEffect)
- Tailwind utility classes only
- Penalty-only scoring (no bonuses)
- All temps in Celsius
- All wind speeds in m/s
- Score range: 0-100

## Next Steps

Want to contribute? Check `CLAUDE.md` for the full project roadmap!
