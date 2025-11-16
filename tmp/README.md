# Tempelhofer Feld Bike Forecast 🚴

A web app that predicts the best times to ride your bike at Tempelhofer Feld in Berlin based on weather conditions, crowds, and opening hours.

## 📁 Files Overview

### Frontend
1. **tempelhofer-bike-forecast-mock.jsx** - Demo version with mock data (works immediately, no setup needed)
2. **tempelhofer-bike-forecast-production.jsx** - Production version that fetches from backend API

### Backend
3. **weather_backend.py** - Flask server that fetches weather data from OpenWeatherMap

## 🚀 Quick Start (Demo)

The easiest way to see the app in action:

1. Use `tempelhofer-bike-forecast-mock.jsx` - it has realistic mock weather data
2. No API keys or backend needed!
3. Just open it in your React environment

## 🏗️ Production Setup

### Step 1: Get an OpenWeatherMap API Key

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Subscribe to "One Call API 3.0" (1000 calls/day free)
4. Copy your API key

### Step 2: Deploy the Backend

#### Option A: PythonAnywhere (Recommended - Free tier available)

1. Sign up at [PythonAnywhere.com](https://www.pythonanywhere.com)
2. Upload `weather_backend.py`
3. Create a new Flask web app
4. Install dependencies in a bash console:
   ```bash
   pip install flask flask-cors requests
   ```
5. Set your API key as an environment variable:
   ```bash
   export OPENWEATHER_API_KEY='your_api_key_here'
   ```
   Or edit the file directly to add your key
6. Configure the web app to use `weather_backend.py`
7. Your API will be available at `https://yourusername.pythonanywhere.com/api/weather`

#### Option B: Heroku

1. Create a `requirements.txt`:
   ```
   flask
   flask-cors
   requests
   gunicorn
   ```
2. Create a `Procfile`:
   ```
   web: gunicorn weather_backend:app
   ```
3. Deploy to Heroku and set the `OPENWEATHER_API_KEY` config var

#### Option C: Any Linux VPS

1. Install Python 3 and pip
2. Install dependencies: `pip install flask flask-cors requests gunicorn`
3. Set environment variable: `export OPENWEATHER_API_KEY='your_key'`
4. Run with gunicorn: `gunicorn -w 4 -b 0.0.0.0:5000 weather_backend:app`
5. Set up nginx as reverse proxy (optional but recommended)

### Step 3: Configure the Frontend

1. Open `tempelhofer-bike-forecast-production.jsx`
2. Update the `API_URL` constant:
   ```javascript
   const API_URL = 'https://yourusername.pythonanywhere.com/api/weather';
   ```
3. Deploy your React app to Netlify, Vercel, or any static hosting

## 🎯 How the Scoring Works

The app calculates a "bikeability score" (0-100) for each hour based on:

### Penalties (in priority order):
1. **Rain**: -40 points (plus probability penalties)
   - Rain forecast: -40
   - >70% chance: additional -20
   - >50% chance: additional -15
   - >30% chance: additional -5

2. **Wind**: Up to -30 points
   - >10 m/s: -30
   - >7 m/s: -20
   - >5 m/s: -10

3. **Crowds**: Up to -25 points (estimated based on)
   - Weekends: +30% base
   - Peak hours (11-18): +25%
   - Good weather: +20%
   - Bad weather: -20%

4. **Temperature**:
   - <0°C: -25 points
   - <5°C: -15 points
   - <10°C: -8 points
   - >32°C: -20 points
   - >28°C: -12 points
   - >25°C: -5 points
   - Bonus: 15-22°C gets +5 points

5. **Closed hours**: Automatic 0 score

### Score Ranges:
- **75-100**: Excellent 🌟
- **50-74**: Good ✓
- **25-49**: Fair ~
- **1-24**: Poor ✗
- **0**: Closed 🔒

## 📊 Features

- **7-day hourly forecast** (168 hours)
- **Top 5 best riding times** highlighted
- **Smart crowd estimation** based on day/time/weather
- **Color-coded conditions** for quick scanning
- **Auto-refresh** every hour (backend caches for 1 hour)
- **Responsive design** works on mobile and desktop

## 🔧 Customization Ideas

### Adjust scoring weights:
Edit the `calculateBikeabilityScore` function to change penalties. For example, if you don't mind crowds:
```javascript
score -= (crowdFactor * 0.1); // Reduced from 0.25
```

### Change forecast duration:
```javascript
const hourlyData = forecastData.hourly.slice(0, 72); // 3 days instead of 7
```

### Modify opening hours:
Update the `getOpeningHours` function with actual seasonal hours from Tempelhofer Feld's website.

### Add more factors:
- UV index
- Visibility
- Air quality (requires additional API)

## 🌐 API Endpoints

### GET /api/weather
Returns weather forecast with caching.

**Response:**
```json
{
  "success": true,
  "data": {
    "hourly": [...]
  },
  "cached": false,
  "fetched_at": "2025-10-31T10:30:00"
}
```

### GET /api/health
Health check endpoint.

## 🔒 Security Notes

- The backend caches weather data for 1 hour to avoid hitting API rate limits
- API keys are kept server-side only
- CORS is enabled - configure appropriately for production
- Consider adding rate limiting to your backend

## 💡 Future Improvements

- [ ] Add user preferences (e.g., "I don't mind rain")
- [ ] Historical data comparison
- [ ] Push notifications for ideal conditions
- [ ] Add other Berlin cycling spots
- [ ] Integration with Strava or other fitness apps
- [ ] Real crowd data (if available from city APIs)
- [ ] Bike lane conditions/closures

## 📝 License

Feel free to use and modify for your own projects!

## 🙏 Credits

- Weather data from [OpenWeatherMap](https://openweathermap.org)
- Icons from [Lucide React](https://lucide.dev)
- Built with React and Tailwind CSS

---

**Enjoy your rides at Tempelhofer Feld! 🚴‍♂️🌤️**
