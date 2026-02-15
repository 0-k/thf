# Tempelhofer Feld Activity Forecast

Weather-based activity scoring app for Tempelhofer Feld in Berlin. Provides hourly forecasts optimized for cycling, jogging, kiting, and picnics with activity-specific scoring algorithms.

## Project Status

**Current State:** Production-ready with 100% TypeScript + Open-Meteo API + Netlify Functions + Smart Caching
**All Phases Complete:** ✅ Data Infrastructure | ✅ Testing Infrastructure | ✅ TypeScript Migration

## Tech Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS 4
- **Backend:** Netlify Functions (serverless)
- **Data Source:** Open-Meteo API (free, no key required)
- **Deployment:** Netlify (all-in-one, 100% free)

## Key Files

- `src/App.tsx` - Main React app with 4 activities (TypeScript, fully typed)
- `src/main.tsx` - React entry point (TypeScript)
- `src/utils/scoring.ts` - Scoring logic and configuration (TypeScript, fully typed)
- `src/utils/scoring.test.ts` - Comprehensive unit tests (77 tests, TypeScript)
- `netlify/functions/weather.ts` - Serverless API endpoint for weather data (TypeScript)
- `vitest.config.js` - Vitest testing configuration
- `tsconfig.json` - TypeScript configuration (strict mode)
- `tsconfig.node.json` - TypeScript configuration for build tools
- `netlify.toml` - Netlify deployment configuration
- `vite.config.js` - Vite bundler configuration
- `tailwind.config.js` - Tailwind CSS configuration

## Architecture

### Scoring System (Penalty-Only)
All activities start at 100 points. Only penalties reduce score (no bonuses).

Four activity-specific scoring functions:
- `calculateCyclingScore()` - Wind -40, Rain -55 (continuous by probability + intensity), Cold -40 (12°C), Crowds -25
- `calculateJoggingScore()` - Heat -35 (22°C), Rain -32 (continuous), Cold -20 (10°C), UV -25
- `calculateKitingScore()` - Wind critical (5-11 m/s ideal), Cold -40 (10°C), Rain -40 (continuous)
- `calculateSocializingScore()` - Rain -70 (continuous), Wind -40, Cold -35 (15°C), UV -30

### Data Flow
1. Frontend requests weather data from Netlify Function (`/.netlify/functions/weather`)
2. Function checks cache (tries Netlify Blobs first, falls back to in-memory)
3. If cached and fresh (<1 hour old): Return cached data immediately
4. If stale or missing: Fetch fresh data from Open-Meteo API
   - Fetch forecast (7 days ahead)
   - Fetch historical data (past 24 hours) for today's earlier hours
   - Combine and deduplicate
5. Cache the fresh data (Blobs if available, otherwise in-memory)
6. Frontend applies scoring algorithms client-side using `src/utils/scoring.ts`

### Layout
- 2-row grid per day (2x12 on desktop, 2x6 on mobile)
- Top 3 best times from next 72 hours (future hours only)
- Activity selector: 2x2 grid on mobile, 1x4 on desktop
- Compact cards: time, score, temp, wind, rain %, AQI
- Detail modal: All weather data for selected hour

## Roadmap: Professional Robustness

### Phase 1: Data Infrastructure (COMPLETED ✅)
**Goal:** Reliable, high-quality weather data with smart caching

✅ **Completed:**
- Switch to Open-Meteo API (free, no key required, hourly forecasts up to 16 days)
- No API key management needed (100% free)
- True hourly data (not 3-hour intervals)
- **Smart hybrid caching**: Tries Netlify Blobs, falls back to in-memory
  - Blobs: Persistent, shared across function instances (when available)
  - Memory: Works everywhere, automatic fallback
- Use Open-Meteo historical API for proper past hours (including 0:00)
- Fixed timezone handling (Berlin time vs UTC)
- Store 7 days of forecast data with 1-hour cache TTL

**Benefits Achieved:**
- Works in all environments (dev, staging, prod) ✅
- No configuration required ✅
- Graceful degradation when Blobs unavailable ✅
- Fast responses when cached (<100ms) ✅
- Reduces API calls (24-500/day depending on traffic and Blobs availability) ✅

### Phase 2: Testing Infrastructure (COMPLETED ✅)
**Goal:** Prevent regressions, ensure scoring accuracy

✅ **Completed:**
- Set up Vitest testing framework with jsdom and React Testing Library
- Extracted scoring functions into testable `src/utils/scoring.ts` module
- Written 63 comprehensive unit tests covering:
  - Opening hours logic (summer/winter, wraparound periods)
  - Crowd factor calculation
  - All 4 activity scoring functions (cycling, jogging, kiting, socializing)
  - Edge cases (extreme temps, high wind, thunderstorms, etc.)
  - Penalty calculations and threshold behavior
  - Score bounds (0-100) and integer return values
- All tests passing (63/63) ✅
- **Updated App.tsx to import from scoring module** ✅
- **Removed 369 lines of duplicate code (31.8% reduction)** ✅

**Benefits Achieved:**
- Scoring functions now fully tested and verifiable ✅
- Can catch regressions when tuning penalty values ✅
- Edge cases documented and validated ✅
- Foundation for continuous integration ✅
- **Single source of truth - no code duplication** ✅

### Phase 3: TypeScript Migration (COMPLETED ✅)
**Goal:** Type safety, better developer experience, self-documenting code

✅ **Completed:**
- Install TypeScript and React type definitions
- Create tsconfig.json with strict mode (all checks enabled)
- Convert `src/utils/scoring.js` → `scoring.ts` with full type definitions:
  - 15+ interface types for configs and data structures
  - Complete type safety for all scoring functions
  - Strict null checks and type inference
- Convert `src/utils/scoring.test.js` → `scoring.test.ts`
- **Convert `src/App.jsx` → `App.tsx` with comprehensive types:**
  - Activity type: 'cycling' | 'jogging' | 'kiting' | 'socializing'
  - WeatherData, HourDataWithScore, ScoreColor, APIResponse interfaces
  - All state typed with useState<Type>
  - All event handlers typed
  - All function signatures with explicit return types
- All 77 tests passing with TypeScript ✅
- Build process working perfectly ✅
- Zero TypeScript errors ✅

**Benefits Achieved:**
- Compile-time error checking for entire frontend AND backend ✅
- Full IDE autocomplete and IntelliSense everywhere ✅
- Self-documenting code (types as inline documentation) ✅
- Safer refactoring with type guarantees ✅
- Prevents common bugs (undefined/null, type mismatches) ✅
- 31.8% code reduction by eliminating duplicates ✅
- **100% TypeScript coverage** (no .js/.jsx files remaining) ✅

### Recent Improvements & Bug Fixes

**Timezone Bug Fixed (2025-11-23):**
- Fixed missing 0:00 hour due to UTC vs Berlin timezone mismatch
- Now properly converts between timezones using `toLocaleString`
- All hours from midnight (Berlin time) onwards now included

**Rain Penalty Logic - Fully Continuous:**
- Every % of precipitation probability contributes to penalty (no threshold, no binary check)
- Formula: `pop^exponent * maxPenalty` (smooth power curve from 0% to 100%)
- Additional intensity penalty when actual precipitation amount > 0 (mm/h)
- Examples (cycling): 10% pop = -3, 50% pop = -23, 80% pop = -42, 100% pop = -55
- No more binary "is it raining" flip switch

**UI Improvements:**
- Removed "Live Data" green box (cleaner UI)
- Added weather data source to bottom explainer (Open-Meteo credit)
- Simplified scoring explanation text

**Code Cleanup:**
- Removed 2,706 lines of obsolete code from initial setup
- Deleted old backend/, tmp/ directories
- Removed outdated documentation (QUICKSTART.md, DEPLOYMENT.md, .env.example)
- All docs now up-to-date (README.md, CLAUDE.md, DEV_README.md)

## Coding Conventions

- Use ES6+ React hooks (useState, useEffect)
- Tailwind utility classes only (no custom CSS)
- Continuous penalty scales (no step functions)
- All temps in Celsius
- All wind speeds in m/s
- Score range: 0-100 (0 = closed)
- Penalty-only scoring (no bonuses)

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run locally (with mock data):**
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000

3. **Run with Netlify Functions (test real API):**
   ```bash
   npm run netlify:dev
   ```
   Opens at http://localhost:8888

## Deployment to Netlify

1. Push code to GitHub
2. Connect repository to Netlify
3. Deploy! (auto-builds on push, no env vars needed)

## Features Implemented

- ✅ **4 Activities:** Cycling, Jogging, Kiting, Picnic
- ✅ **Activity-specific scoring:** Each has unique penalty scales
- ✅ **Externalized config:** All scoring values in SCORING_CONFIG object
- ✅ **Mock data mode:** Works without API for development
- ✅ **Real API mode:** Fetches from Open-Meteo via Netlify Function
- ✅ **Caching:** Backend caches for 1 hour to reduce API calls
- ✅ **Responsive design:** Mobile-first with 2-row grid layout
- ✅ **Detail modal:** Click any hour to see all weather data
- ✅ **Past hours display:** Full day shown (midnight to closing)

## Important Context

- **Location:** Tempelhofer Feld, Berlin (52.4732°N, 13.4053°E)
- **Opening hours:** Monthly schedule (Jan 8-17, Jun/Jul 6-23, Dec 8-17) - real Tempelhofer Feld hours from tempelhoferfeld.de
- **Closed hours:** Automatic score of 0, displayed as "-"
- **Mobile-first:** Cards optimized for 6-column mobile grid
- **Time display:** 10px font to prevent overflow on mobile

## Design Decisions

**Temperature sensitivity:**
- Picnic most sensitive to cold (15°C threshold, sitting still)
- Cycling moderately sensitive (12°C threshold)
- Jogging less sensitive (10°C threshold, you warm up)
- Heat worse for jogging than cycling (overheating risk)

**Wind requirements:**
- Kiting requires wind: 5-11 m/s ideal, <5 m/s = -50, >13 m/s = -50
- Cycling/Picnic: wind is penalty (affects comfort, stability)
- Jogging: minimal wind penalty (lower profile)

**Rain sensitivity (fully continuous, no binary switch):**
- Socializing: worst (maxPenalty -70, steepest curve, ruins food/blankets)
- Cycling: severe (maxPenalty -55, wet roads, poor visibility)
- Kiting: moderate (maxPenalty -40, wet equipment)
- Jogging: lightest (maxPenalty -32, runners tolerate rain)

**Crowd estimation:**
- Multi-factor model: day of week (+30 weekend), time of day (+25 peak), season (+5 to +25), temperature bell curve (~22°C ideal, +15), rain probability (-25 at 100%), cloud cover (+10 sunny)
- Kiting: highest penalty multiplier (0.35, safety/space)
- Cycling: moderate multiplier (0.25, navigation)
- Socializing: moderate multiplier (0.25, less of an issue)
- Jogging: minimal multiplier (0.10, easy to navigate)

## Data Source: Open-Meteo API

**Why Open-Meteo:**
- 100% free, no API key, unlimited requests
- Hourly forecasts up to 16 days
- Uses DWD (ICON model) + European weather models
- Historical data API for proper past hours
- Clean JSON API, easy to parse

**API Endpoint:**
```
https://api.open-meteo.com/v1/forecast
  ?latitude=52.4732
  &longitude=13.4053
  &hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,uv_index
  &timezone=Europe/Berlin
  &forecast_days=7
```

**Note:** Air Quality Index (AQI) not available in Open-Meteo. Currently using mock value (aqi: 2).

## Don't Change

- The continuous penalty formulas (tuned through trial)
- The 2-row grid layout (tested on mobile)
- Time font size (10px prevents overflow)
- Monthly opening hours table (real Tempelhofer Feld hours from official website)
- Penalty-only scoring system (no bonuses)
