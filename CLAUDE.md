# Tempelhofer Feld Activity Forecast

Weather-based activity scoring app for Tempelhofer Feld in Berlin. Provides hourly forecasts optimized for cycling and jogging with activity-specific scoring algorithms.

## Project Status

**Current State:** Production-ready with Vite + React + Netlify Functions
**Next Step:** Add OpenWeatherMap API key and deploy to Netlify

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Netlify Functions (serverless)
- **Data:** Mock weather generation (dev) OR OpenWeatherMap API (production)
- **Deployment:** Netlify (all-in-one, 100% free)

## Key Files

- `src/App.jsx` - Main React app with 4 activities (cycling/jogging/kiting/picnic)
- `netlify/functions/weather.js` - Serverless API endpoint for weather data
- `netlify.toml` - Netlify deployment configuration
- `.env` - Environment variables (API key)
- `vite.config.js` - Vite bundler configuration
- `tailwind.config.js` - Tailwind CSS configuration

## Architecture

### Scoring System
Two separate scoring functions with different penalty scales:
- `calculateCyclingScore()` - Rain -40, Wind -40, Crowds -25, UV starts at 5
- `calculateJoggingScore()` - Rain -20, Wind -15, Crowds -10, Heat -35, UV starts at 4

### Mock Data Generation
`generateMockWeatherData()` creates realistic patterns:
- Temperature: 15°C base with daily/weekly variation
- Wind: 2-9 m/s, calmer at night
- Rain: Some days rainier (day 3,4 typically)
- UV: Peaks at noon, reduced on cloudy/rainy days
- Air Quality: Worse during rush hours

### Layout
- 2-row grid per day (2x12 on desktop, 2x6 on mobile)
- Top 3 best times from next 72 hours
- Activity selector tabs (🚴 Cycling / 🏃 Jogging)
- Compact cards: time, score, temp, wind, rain %

## Coding Conventions

- Use ES6+ React hooks (useState, useEffect)
- Tailwind utility classes only (no custom CSS)
- Continuous penalty scales (no step functions)
- All temps in Celsius
- All wind speeds in m/s
- Score range: 0-100 (0 = closed)

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set your API key in `.env`:**
   ```
   OPENWEATHER_API_KEY=your_key_here
   ```

3. **Run locally (with mock data):**
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3000

4. **Run with Netlify Functions (test real API):**
   ```bash
   npm run netlify:dev
   ```
   Opens at http://localhost:8888

## Deployment to Netlify

1. Push code to GitHub
2. Connect repository to Netlify
3. Add environment variable: `OPENWEATHER_API_KEY`
4. Deploy! (auto-builds on push)

## Features Implemented

- ✅ **4 Activities:** Cycling, Jogging, Kiting, Picnic
- ✅ **Activity-specific scoring:** Each has unique penalty/bonus scales
- ✅ **Mock data mode:** Works without API key for development
- ✅ **Real API mode:** Fetches from OpenWeatherMap via Netlify Function
- ✅ **Caching:** Backend caches for 1 hour to save API calls
- ✅ **Responsive design:** Mobile-first with 2-row grid layout

## Important Context

- **Location:** Tempelhofer Feld, Berlin (52.4732°N, 13.4053°E)
- **Opening hours:** Summer (Apr-Sep) 6:00-22:00, Winter (Oct-Mar) 7:00-21:00
- **Closed hours:** Automatic score of 0
- **Mobile-first:** Cards optimized for 6-column mobile grid
- **Time display:** 10px font to prevent overflow on mobile

## Design Decisions

- Heat worse for jogging than cycling (overheating risk)
- UV more important for jogging (longer exposure)
- Crowds less important for jogging (easier to navigate)
- Wind much less important for jogging (lower profile)
- Rain penalty halved for jogging (runners don't mind)

## API Notes

- OpenWeatherMap One Call API 2.5 (free tier, 48 hours)
- For 7-day forecast need One Call API 3.0 subscription
- Cache backend responses for 1 hour minimum
- Current implementation uses mock data - no API calls yet

## Don't Change

- The continuous penalty formulas (tuned through trial)
- The 2-row grid layout (tested on mobile)
- Time font size (10px prevents overflow)
- Opening hours logic (Tempelhofer Feld specific)
