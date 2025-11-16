# Quick Start Guide 🚀

Get the Tempelhofer Feld Activity Forecast running in 2 minutes!

## Option 1: Test Locally with Mock Data (No API Key)

```bash
# You already have dependencies installed, so just run:
npm run dev
```

Open http://localhost:3000 in your browser. You'll see the app with realistic mock weather data!

## Option 2: Test with Real Weather API

### Step 1: Get a Free API Key

1. Go to https://openweathermap.org/api
2. Sign up for a free account
3. Go to your API keys page
4. Subscribe to **"One Call API 3.0"** (free tier: 1000 calls/day)
5. Copy your API key

### Step 2: Add API Key to .env

Open the `.env` file and add your key:

```bash
OPENWEATHER_API_KEY=your_actual_api_key_here
```

### Step 3: Run with Netlify Functions

```bash
npm run netlify:dev
```

Open http://localhost:8888 in your browser. The app will now fetch real weather data!

## What's the Difference?

- `npm run dev` (port 3000) - Vite dev server, uses **mock data** from the frontend
- `npm run netlify:dev` (port 8888) - Netlify dev server with serverless functions, uses **real OpenWeatherMap API**

## Deployment

When you're ready to deploy to production:

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin claude/build-minimal-website-01NnLNakY3n3TzbKqF2v2xJZ
   ```

2. Go to [Netlify](https://netlify.com)
3. Connect your GitHub repository
4. Add environment variable: `OPENWEATHER_API_KEY=your_key`
5. Deploy!

## Troubleshooting

**Build fails?**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Netlify dev not working?**
- Make sure you added the API key to `.env`
- Check that `.env` is in the project root (not in `src/`)

**API returns errors?**
- Verify your API key is correct
- Make sure you subscribed to "One Call API 3.0" (not the old 2.5)
- Check you haven't exceeded the free tier limit (1000 calls/day)

## Next Steps

- See `README.md` for full documentation
- See `CLAUDE.md` for technical details and architecture
- Customize scoring in `src/App.jsx`

Happy forecasting! 🌤️
