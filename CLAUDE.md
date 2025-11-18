# Tempelhofer Feld Activity Forecast

Weather-based activity scoring app for Tempelhofer Feld in Berlin. Provides hourly forecasts optimized for cycling, jogging, kiting, and picnics with activity-specific scoring algorithms.

## Project Status

**Current State:** Production with Open-Meteo API + Netlify Functions
**Next Steps:** Implement scheduled functions + persistent storage → Testing → TypeScript

## Tech Stack

- **Frontend:** React 19 + Vite 7 + Tailwind CSS 4
- **Backend:** Netlify Functions (serverless)
- **Data Source:** Open-Meteo API (free, no key required)
- **Deployment:** Netlify (all-in-one, 100% free)

## Key Files

- `src/App.jsx` - Main React app with 4 activities (cycling/jogging/kiting/picnic)
- `netlify/functions/weather.js` - Serverless API endpoint for weather data
- `SCORING_CONFIG` - Externalized scoring configuration (top of App.jsx)
- `netlify.toml` - Netlify deployment configuration
- `vite.config.js` - Vite bundler configuration
- `tailwind.config.js` - Tailwind CSS configuration

## Architecture

### Scoring System (Penalty-Only)
All activities start at 100 points. Only penalties reduce score (no bonuses).

Four activity-specific scoring functions:
- `calculateCyclingScore()` - Wind -40, Rain -40, Cold -40 (12°C), Crowds -25
- `calculateJoggingScore()` - Heat -35 (22°C), Rain -25, Cold -20 (10°C), UV -25
- `calculateKitingScore()` - Wind critical (5-11 m/s ideal), Cold -40 (10°C), Rain -30
- `calculatePicnicScore()` - Rain -60, Wind -40, Cold -35 (15°C), UV -30

### Data Flow
1. Frontend requests weather data from Netlify Function
2. Function fetches from Open-Meteo API (hourly, 7 days)
3. In-memory cache (1 hour) reduces API calls
4. Past hours backfilled using Open-Meteo historical API
5. Frontend applies scoring algorithms client-side

### Layout
- 2-row grid per day (2x12 on desktop, 2x6 on mobile)
- Top 3 best times from next 72 hours (future hours only)
- Activity selector: 2x2 grid on mobile, 1x4 on desktop
- Compact cards: time, score, temp, wind, rain %, AQI
- Detail modal: All weather data for selected hour

## Roadmap: Professional Robustness

### Phase 1: Data Infrastructure (IN PROGRESS)
**Goal:** Reliable, high-quality weather data with proper persistence

✅ **Completed:**
- Switch to Open-Meteo API (free, unlimited, hourly forecasts up to 16 days)
- No API key management needed
- True hourly data (not 3-hour intervals)

🔲 **Next:**
- Implement Netlify Blobs for persistent caching across function instances
- Add scheduled function (cron) to fetch weather every hour in background
- Use Open-Meteo historical API for proper past hours (no interpolation)
- Store 7 days of forecast data persistently

**Benefits:**
- Eliminates cold starts and inconsistent caching
- Always-fast responses (served from blob storage)
- More reliable than in-memory cache per function instance
- Reduces API calls to 24/day (scheduled fetches only)

### Phase 2: Testing Infrastructure
**Goal:** Prevent regressions, ensure scoring accuracy

🔲 **To Implement:**
- Unit tests for all scoring functions (Vitest)
  - Test edge cases (0°C, 40°C, 15 m/s wind, etc.)
  - Verify penalty calculations match config
  - Test opening hours logic
- Integration tests for weather API function
  - Mock Open-Meteo responses
  - Test cache behavior
  - Test error handling
- React Error Boundaries for graceful UI degradation
- Sentry or similar for production error tracking
- Better loading/error states in UI

**Benefits:**
- Catch scoring bugs before deployment
- Confidence when tuning penalty values
- Production monitoring and alerts
- Professional-grade reliability

### Phase 3: TypeScript Migration
**Goal:** Type safety, better developer experience, self-documenting code

🔲 **To Implement:**
- Convert `.js`/`.jsx` → `.ts`/`.tsx`
- Define strict types for:
  - Open-Meteo API responses
  - SCORING_CONFIG object
  - Weather data structures
  - Component props
- Enable strict mode in tsconfig.json
- Add type checking to build process

**Benefits:**
- Catches bugs at compile-time (e.g., config property mismatches)
- Makes refactoring safer
- Improves IDE autocomplete and inline documentation
- Industry standard for professional projects

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
- **Opening hours:** Summer (Apr-Sep) 6:00-22:00, Winter (Oct-Mar) 7:00-21:00
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

**Rain tolerance:**
- Picnic: worst (-60 base penalty, ruins everything)
- Cycling: severe (-40 base penalty)
- Kiting: moderate (-30 base penalty)
- Jogging: lightest (-25 base penalty, runners don't mind)

**Crowd impact:**
- Kiting: highest penalty (safety, need space)
- Cycling: moderate penalty (navigation)
- Picnic: light penalty (less of an issue)
- Jogging: minimal penalty (easy to navigate)

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
- Opening hours logic (Tempelhofer Feld specific)
- Penalty-only scoring system (no bonuses)
