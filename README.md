# Tempelhofer Feld Activity Forecast

A weather-based activity scoring app for Tempelhofer Feld in Berlin. Get hourly forecasts optimized for **cycling**, **jogging**, **kiting**, and **picnics** with intelligent, activity-specific scoring algorithms.

![Status](https://img.shields.io/badge/status-production-green)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **4 Activity Types** with unique scoring algorithms:
  - **Cycling** - Penalizes wind, rain, and crowds
  - **Jogging** - Heat-sensitive, rain-tolerant
  - **Kiting** - NEEDS wind (5-11 m/s ideal)! Safety-focused crowd penalties
  - **Picnic** - Rain-averse, optimal for good weather

- **Smart Scoring** (0-100):
  - Penalty-only system (start at 100, deduct for bad conditions)
  - Continuous penalty scales (no step functions)
  - Opening hours aware (auto-zero when closed)
  - Weather factors: temp, wind, gusts (kiting), rain probability/amount, UV, sunshine (picnic), real air quality (European AQI)
  - **Transparent:** tap any hour to see exactly which penalties cost how many points

- **Crowd estimate** calibrated to Grün Berlin's visitor counts:
  weekday/Saturday/Sunday levels, public holidays, sunset-anchored daily peaks, and weather response

- **7-Day Hourly Forecast**:
  - Best 3 non-overlapping 2-hour windows (next 4 days), plus each day's best window
  - 2-row grid layout per day (mobile-optimized), 3 more days on demand
  - Detailed modal for each hour
  - Always in Berlin time, wherever you open it

- **Airfield design**: live sky header that follows the time of day and weather, a "Departures" board
  for the best times, runway markings, a self-hosted DIN-style display font

- **100% Free**:
  - No API keys required
  - Free weather data from Open-Meteo (DWD ICON model)
  - Free hosting on Netlify

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd thf

# Install dependencies
npm install
```

### Local Development

**Option 1: Quick start with mock data**
```bash
npm run dev
```
Opens at http://localhost:5173 with realistic mock weather data

**Option 2: Test with real API and Netlify Functions**
```bash
npm run netlify:dev
```
Opens at http://localhost:8888 with real weather data from Open-Meteo

### Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

**Test Coverage:** 138 tests: a UI smoke test plus unit tests covering scoring (all activities, edge cases, opening hours), the crowd
model (including its calibration against the visitor counts), Berlin time/DST/holidays, ranking, the
Open-Meteo transform (timestamps, hour alignment) and the Netlify Function (caching, stale fallback).

```bash
npm run typecheck    # frontend + Netlify Function
npm run verify       # typecheck + all tests (what Netlify runs before every build)
```

## Deployment to Netlify (100% Free)

### One-Time Setup

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository
   - Build settings are auto-detected from `netlify.toml`

3. **Deploy!**
   - Click "Deploy site"
   - Future pushes auto-deploy

Your site will be live at `https://your-site-name.netlify.app`

**No environment variables needed!** Open-Meteo API is free and requires no API key.

### Pipeline

Netlify is the CI/CD: every deploy context runs `npm run verify && npm run build`, so a failing test or
type error stops the deploy.

- **Production:** https://thfweather.netlify.app (from `master`)
- **Pull requests:** automatic deploy preview at `https://deploy-preview-<PR#>--thfweather.netlify.app`

### Staging Deployments

For testing before production, see [DEV_README.md](./DEV_README.md) for:
- Pull request preview deployments
- Branch deploys for `claude/dev_*` branches

## Project Structure

```
thf/
├── src/
│   ├── App.tsx              # Main React component (TypeScript)
│   ├── main.tsx             # React entry point (TypeScript)
│   ├── components/          # HourCard, DetailModal, BestTimes, ScoreExplainer
│   ├── utils/
│   │   ├── scoring.ts       # Scoring engine + config (breakdown per hour)
│   │   ├── crowd.ts         # Crowd model (calibrated)
│   │   ├── ranking.ts       # Best 2-hour windows
│   │   ├── time.ts          # Berlin time helpers
│   │   ├── calendar.ts      # Sunrise/sunset, public holidays
│   │   ├── mockData.ts      # Dev-only simulated forecast
│   │   └── *.test.ts        # Unit tests
│   └── test/
│       └── setup.ts         # Test configuration
├── netlify/
│   ├── functions/
│   │   └── weather.ts       # Serverless API endpoint (TypeScript)
│   ├── lib/
│   │   └── openMeteo.ts     # Open-Meteo -> hour slots (pure, tested)
│   └── tests/               # Function tests (kept out of functions/)
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── vitest.config.js         # Test configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript config (strict mode)
├── netlify.toml             # Netlify deployment config
├── CLAUDE.md                # Project roadmap & architecture
├── DEV_README.md            # Development guide
└── package.json             # Dependencies and scripts
```

## How Scoring Works

Each activity starts at **100 points**; penalties are deducted on continuous scales. Thunderstorms and
closed hours score 0. The page's explainer is generated from `SCORING_CONFIG`, so it always shows the
numbers actually applied.

### Cycling
- **Rain**: up to -55 by probability (every % counts) + up to -10 for intensity
- **Wind**: from 3 m/s, up to -40
- **Crowds**: 0.25 × crowd index (up to -25)
- **Cold**: below 12°C, up to -40 · **Heat**: above 24°C, up to -30
- **UV**: above 3, up to -20 · **Air quality**: European AQI above "good", up to -35

### Jogging
- **Heat**: above 22°C, up to -35 (overheating)
- **Rain**: up to -32 + intensity (runners tolerate rain)
- **Cold**: below 10°C, up to -20 · **Wind**: from 5 m/s, up to -15
- **UV**: above 3, up to -25 · **Crowds**: 0.10 × index

### Kiting
- **Wind**: 5-11 m/s workable; continuous ramps outside (2 m/s ≈ -83, 14 m/s ≈ -51, no wind or a gale → 0)
- **Gusts**: more than 5 m/s above the mean wind, up to -40
- **Rain**: up to -40 + intensity · **Cold**: below 10°C, up to -40
- **Crowds**: 0.35 × index (safety critical)

### Picnic (Socializing)
- **Rain**: up to -70 + intensity (worst for picnics!)
- **Wind**: from 3 m/s, up to -40 (flies blankets away)
- **Cold**: below 15°C, up to -35 · **UV**: above 3, up to -30
- **No sun**: cloud cover above 40% in daylight, up to -20

### Crowd estimate
`100 × day level × time-of-day profile × weather attraction`. Day levels are solved so daily totals match
Grün Berlin's 2014 visitor monitoring (≈12,600 visits on weekdays, 25,600 on Saturdays, 31,000 on
Sundays); daily peaks follow sunset (16:30 weekdays / 14:00-14:30 weekends in autumn, later in summer);
public holidays count as Sundays. 100 = a sunny summer Sunday afternoon.

## Tech Stack

- **Frontend**: React 19 + Vite 7 (100% TypeScript)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Backend**: Netlify Functions (TypeScript serverless)
- **API**: Open-Meteo (DWD ICON model, free)
- **Testing**: Vitest + React Testing Library (138 tests)
- **Deployment**: Netlify (free tier)

## API Details

### `/.netlify/functions/weather`

**GET** - Fetch weather forecast

**Response:**
```json
{
  "success": true,
  "data": {
    "hourly": [{ "dt": 1792144800, "temp": 14.2, "wind_speed": 4.1, "wind_gust": 8.3, "pop": 0.2,
                 "rain": { "1h": 0.3 }, "air_quality": { "european_aqi": 27 }, "...": "..." }],
    "sources": { "forecast": "Open-Meteo forecast (DWD ICON)", "airQuality": "Open-Meteo air quality (CAMS Europe)" }
  },
  "cached": true,
  "cache_type": "Netlify Blobs",
  "fetched_at": "2026-10-16T06:00:00.000Z"
}
```
`dt` is the unix start of the hour slot. `stale: true` marks last-good data served while Open-Meteo is down.

**Caching Strategy:**
- Tries Netlify Blobs (persistent, shared across instances)
- Falls back to in-memory cache if Blobs unavailable
- 1-hour cache duration; serves the last good forecast for up to 12 h if Open-Meteo is down
- Response is CDN-cacheable for 10 minutes

**Data Source:** [Open-Meteo](https://open-meteo.com) - Free weather API with:
- Hourly forecasts up to 16 days
- DWD ICON model (German Weather Service)
- Earlier hours of today via `past_days`
- Air quality (European AQI) from CAMS via the Open-Meteo air-quality API
- No API key required
- No rate limits (within reasonable use)

## Scripts

```bash
npm run dev          # Start Vite dev server (mock data)
npm run build        # Build for production
npm run typecheck    # Typecheck frontend + Netlify Function
npm run verify       # Typecheck + run all tests (Netlify runs this before building)
npm run preview      # Preview production build
npm run netlify:dev  # Start Netlify dev server (with functions)
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
```

## Location

**Tempelhofer Feld, Berlin**
- Coordinates: 52.4732°N, 13.4053°E
- Opening Hours: follow daylight and change monthly (e.g. Jan 7:30-17:00, Jun/Jul 6:00-22:30);
  see `OPENING_HOURS_CONFIG` in `src/utils/scoring.ts`

## Performance

- **API Calls**: ~24-500/day depending on traffic
  - With Netlify Blobs: ~24/day (optimal)
  - Without Blobs: ~50-500/day (still well within limits)
- **Cache Duration**: 1 hour
- **Response Time**:
  - Cached: <100ms
  - Fresh fetch: ~500ms

## Development

See [DEV_README.md](./DEV_README.md) for:
- Local development setup
- Testing guide
- Deployment workflows
- Caching strategy details
- Troubleshooting

## Contributing

See [CLAUDE.md](./CLAUDE.md) for:
- Project architecture
- Coding conventions
- Roadmap and completed phases
- Design decisions

## License

MIT License - feel free to use and modify!

## Credits

- Weather data: [Open-Meteo](https://open-meteo.com) (DWD ICON model)
- Air quality: CAMS European air quality forecasts via Open-Meteo
- Visitor counts for crowd calibration: Grün Berlin / Tempelhofer Feld visitor monitoring (2012, 2014) and visitor survey (2023)
- Icons: [Lucide](https://lucide.dev)
- Built with: React, TypeScript, Vite, Tailwind CSS

---

**Enjoy your activities at Tempelhofer Feld! 🚴 🏃 🪁 🧺**
