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
  - Weather factors: temp, wind, rain probability/actual, UV, air quality
  - Crowd estimation based on day/time/weather

- **7-Day Hourly Forecast**:
  - Top 3 best times highlighted (next 4 days)
  - 2-row grid layout per day (mobile-optimized)
  - Detailed modal for each hour

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

**Test Coverage:** 63 comprehensive unit tests covering all scoring functions, edge cases, and opening hours logic.

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
│   ├── utils/
│   │   ├── scoring.ts       # Scoring logic (TypeScript)
│   │   └── scoring.test.ts  # 63 unit tests
│   └── test/
│       └── setup.ts         # Test configuration
├── netlify/
│   └── functions/
│       └── weather.ts       # Serverless API endpoint (TypeScript)
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

Each activity starts at **100 points**. Penalties are applied based on weather conditions.

### Cycling
- **Rain (actual)**: -40 base penalty
- **Rain (probability)**: Up to -20 additional
- **Wind**: Up to -40 (starts at 3 m/s)
- **Crowds**: Up to -25
- **Cold**: -40 max below 12°C
- **Opening hours**: Auto-zero when closed

### Jogging
- **Heat**: Up to -35 (threshold: 22°C)
- **Rain (actual)**: -25 base (runners are more tolerant)
- **Rain (probability)**: Up to -12 additional
- **Cold**: -20 max below 10°C
- **UV**: Up to -25 above index 3

### Kiting
- **Wind requirements**: 5-11 m/s ideal range
  - Too light (<5 m/s): -50
  - Too strong (>13 m/s): -50
- **Rain (actual)**: -30 base
- **Rain (probability)**: Up to -15 additional
- **Crowds**: Up to -35 (safety critical)
- **Thunderstorms**: Instant zero (deadly)

### Picnic (Socializing)
- **Rain (actual)**: -60 base (worst for picnics!)
- **Rain (probability)**: Up to -20 additional
- **Wind**: Up to -40 (flies blankets away)
- **Cold**: -35 max below 15°C
- **UV**: Up to -30 above index 4

## Tech Stack

- **Frontend**: React 19 + Vite 7 (100% TypeScript)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Backend**: Netlify Functions (TypeScript serverless)
- **API**: Open-Meteo (DWD ICON model, free)
- **Testing**: Vitest + React Testing Library (63 tests)
- **Deployment**: Netlify (free tier)

## API Details

### `/.netlify/functions/weather`

**GET** - Fetch weather forecast

**Response:**
```json
{
  "success": true,
  "data": {
    "hourly": [...],
    "current": {...}
  },
  "cached": true,
  "cache_type": "Netlify Blobs",
  "cached_at": "2025-11-23T10:00:00Z"
}
```

**Caching Strategy:**
- Tries Netlify Blobs (persistent, shared across instances)
- Falls back to in-memory cache if Blobs unavailable
- 1-hour cache duration
- Automatic fallback ensures site always works

**Data Source:** [Open-Meteo](https://open-meteo.com) - Free weather API with:
- Hourly forecasts up to 16 days
- DWD ICON model (German Weather Service)
- Historical data for past hours
- No API key required
- No rate limits (within reasonable use)

## Scripts

```bash
npm run dev          # Start Vite dev server (mock data)
npm run build        # Build for production
npm run preview      # Preview production build
npm run netlify:dev  # Start Netlify dev server (with functions)
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
```

## Location

**Tempelhofer Feld, Berlin**
- Coordinates: 52.4732°N, 13.4053°E
- Opening Hours:
  - Summer (Apr-Sep): 6:00-22:00
  - Winter (Oct-Mar): 7:00-21:00

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
- Icons: [Lucide](https://lucide.dev)
- Built with: React, TypeScript, Vite, Tailwind CSS

---

**Enjoy your activities at Tempelhofer Feld! 🚴 🏃 🪁 🧺**
