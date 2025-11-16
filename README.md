# Tempelhofer Feld Activity Forecast

A weather-based activity scoring app for Tempelhofer Feld in Berlin. Get hourly forecasts optimized for **cycling**, **jogging**, **kiting**, and **picnics** with intelligent, activity-specific scoring algorithms.

![Status](https://img.shields.io/badge/status-ready_to_deploy-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **4 Activity Types** with unique scoring algorithms:
  - **Cycling** - Penalizes wind, rain, and crowds
  - **Jogging** - Heat-sensitive, rain-tolerant
  - **Kiting** - NEEDS wind! Safety-focused crowd penalties
  - **Picnic** - Rain-averse, crowd-positive

- **Smart Scoring** (0-100):
  - Continuous penalty scales (no step functions)
  - Opening hours aware (auto-zero when closed)
  - Weather factors: temp, wind, rain, UV, air quality
  - Crowd estimation based on day/time/weather

- **7-Day Hourly Forecast**:
  - Top 3 best times highlighted
  - 2-row grid layout per day
  - Mobile-optimized design

- **Dual Modes**:
  - Mock data for development
  - Real OpenWeatherMap API for production

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- (Optional) OpenWeatherMap API key for real weather data

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd thf

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# (Optional) Add your OpenWeatherMap API key to .env
# OPENWEATHER_API_KEY=your_key_here
```

### Local Development

**Option 1: Quick start with mock data (no API key needed)**
```bash
npm run dev
```
Opens at http://localhost:3000

**Option 2: Test with real API (requires API key in `.env`)**
```bash
npm run netlify:dev
```
Opens at http://localhost:8888

The app works in mock mode by default. To enable real weather data:
1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Subscribe to "One Call API 3.0" (1000 calls/day free tier)
3. Add the key to your `.env` file
4. Run `npm run netlify:dev`

## Deployment to Netlify (100% Free)

### Step 1: Get an API Key

1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Subscribe to **One Call API 3.0** (free tier: 1000 calls/day)
3. Copy your API key

### Step 2: Deploy to Netlify

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

3. **Add Environment Variable:**
   - In Netlify dashboard → Site settings → Environment variables
   - Add: `OPENWEATHER_API_KEY` = `your_api_key_here`

4. **Deploy!**
   - Click "Deploy site"
   - Future pushes auto-deploy

Your site will be live at `https://your-site-name.netlify.app`

## Project Structure

```
thf/
├── src/
│   ├── App.jsx           # Main React component
│   ├── main.jsx          # React entry point
│   └── index.css         # Tailwind CSS imports
├── netlify/
│   └── functions/
│       └── weather.js    # Serverless API endpoint
├── public/               # Static assets
├── tmp/                  # Original prototypes
├── index.html           # HTML entry point
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── netlify.toml         # Netlify deployment config
├── .env.example         # Environment template
└── package.json         # Dependencies and scripts
```

## How Scoring Works

Each activity has a unique scoring algorithm with continuous penalty scales:

### Cycling
- **Rain**: -40 base (worst factor)
- **Wind**: Up to -40 (starts at 3 m/s)
- **Crowds**: Up to -25
- **Temperature**: Optimal 15-22°C (+5 bonus)
- **Opening hours**: Auto-zero when closed

### Jogging
- **Heat**: Up to -35 (more sensitive than cycling!)
- **Rain**: -20 base (runners don't mind light rain)
- **Wind**: Up to -15 (less affected than cycling)
- **UV**: Starts penalizing at 4 (more exposure time)
- **Temperature**: Optimal 12-20°C (+5 bonus)

### Kiting
- **Wind**: INVERTED! 4-7 m/s = +30 bonus
- **Crowds**: Up to -35 (safety critical)
- **Thunderstorms**: Instant zero (deadly combination)
- **Low wind**: &lt;2 m/s = -50 penalty

### Picnic
- **Rain**: -60 base (worst for picnics!)
- **Crowds**: +10 bonus (good atmosphere)
- **Temperature**: Optimal 18-24°C (+10 bonus)
- **Wind**: Moderate penalty (flies blankets)

## Tech Stack

- **Frontend**: React 19 + Vite 7
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Backend**: Netlify Functions (Node.js serverless)
- **API**: OpenWeatherMap One Call 3.0
- **Deployment**: Netlify (free tier)

## API Endpoints

### `/.netlify/functions/weather`

**GET** - Fetch weather forecast

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "cached": false,
  "fetched_at": "2025-11-16T12:00:00Z"
}
```

**Caching:** 1 hour server-side cache to minimize API calls

## Scripts

```bash
npm run dev          # Start Vite dev server (mock data)
npm run build        # Build for production
npm run preview      # Preview production build
npm run netlify:dev  # Start Netlify dev server (with functions)
```

## Location

**Tempelhofer Feld, Berlin**
- Coordinates: 52.4732°N, 13.4053°E
- Opening Hours:
  - Summer (Apr-Sep): 6:00-22:00
  - Winter (Oct-Mar): 7:00-21:00

## Security & Rate Limits

- API key stored server-side in Netlify environment
- 1-hour caching reduces API calls
- Free tier: 1000 calls/day
- Estimated usage: ~24 calls/day (hourly refresh)

## License

MIT License - feel free to use and modify!

## Credits

- Weather data: [OpenWeatherMap](https://openweathermap.org)
- Icons: [Lucide](https://lucide.dev)
- Built with: React, Vite, Tailwind CSS

---

**Enjoy your activities at Tempelhofer Feld!**
