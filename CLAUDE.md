# Tempelhofer Feld Activity Forecast

Weather-based activity scoring app for Tempelhofer Feld in Berlin. Provides hourly forecasts optimized for cycling and jogging with activity-specific scoring algorithms.

## Project Status

**Current State:** Proof of concept complete with mock data
**Next Step:** Production deployment setup

## Tech Stack

- **Frontend:** React with Tailwind CSS (single-file artifact)
- **Data:** Mock weather generation OR OpenWeatherMap API
- **Deployment Target:** Netlify (frontend) + PythonAnywhere (backend optional)

## Key Files

- `bike-forecast.jsx` - Main React app with activity switching
- `weather_backend.py` - Flask backend for API key protection (optional)
- `requirements.txt` - Python dependencies
- OpenWeatherMap API key: `` (free tier, 1000 calls/day)

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

## Next Development Tasks

1. **Deployment Option 1 (Quick):**
   - Modify app to fetch directly from OpenWeatherMap
   - Deploy single-file React app to Netlify
   - API key exposed but free tier limits protect

2. **Deployment Option 2 (Proper):**
   - Deploy `weather_backend.py` to PythonAnywhere
   - Update frontend `API_URL` to backend endpoint
   - Deploy frontend to Netlify
   - API key protected server-side

3. **Future Activities:**
   - Kite sports (inverted wind scoring!)
   - Picnic/socializing (crowds = bonus)
   - Each needs custom `calculate<Activity>Score()` function

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
