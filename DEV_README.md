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
- **Tests:** `src/utils/scoring.test.ts` (63 comprehensive tests)

### Backend (Netlify Functions)
- **Weather API:** `netlify/functions/weather.js`
  - Fetches from Open-Meteo API (free, no key required)
  - Smart caching: Netlify Blobs (prod) → In-memory (fallback)
  - Returns 7 days forecast + today's past hours

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

**Test coverage:**
- 63 tests covering all scoring functions
- Opening hours logic (summer/winter)
- Crowd factors
- All weather penalties
- Edge cases (extreme temps, thunderstorms, etc.)

## Deployment

### To Netlify

1. Push to GitHub
2. Netlify auto-deploys from master
3. Functions deployed automatically

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
│   ├── utils/
│   │   ├── scoring.ts        # Scoring logic (exported)
│   │   └── scoring.test.ts   # 63 comprehensive tests
│   └── test/
│       └── setup.js          # Vitest setup
├── netlify/
│   └── functions/
│       └── weather.js        # Weather API (hybrid caching)
├── dist/                     # Build output (gitignored)
├── netlify.toml              # Netlify config
├── package.json              # Dependencies & scripts
├── vite.config.js            # Vite bundler config
├── vitest.config.js          # Test config
├── tsconfig.json             # TypeScript config (strict mode)
└── tailwind.config.js        # Tailwind CSS config
```

## Common Issues

### Issue: "Mock data" showing in production

**Cause:** Weather function is failing
**Solution:** Check Netlify function logs for errors

### Issue: Cache not working

**Cause:** Netlify Blobs not enabled, cold starts clearing memory cache
**Solution:** This is expected without Blobs. Enable Blobs in Netlify dashboard or accept slightly higher API usage

### Issue: Tests failing

**Cause:** Scoring logic changed
**Solution:** Update tests in `src/utils/scoring.test.ts` to match new behavior

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
