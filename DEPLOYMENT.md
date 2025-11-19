# Deployment Guide

Complete guide for testing locally with real data and deploying to production.

## Local Testing with Real Weather Data

### Step 1: Get an OpenWeatherMap API Key

1. Go to https://openweathermap.org/api
2. Sign up for a free account
3. Go to "API keys" in your account
4. Subscribe to **"One Call API 3.0"** (free tier: 1000 calls/day)
   - Note: The free tier is plenty for testing and small-scale use
5. Copy your API key

### Step 2: Add API Key to Your Environment

Edit the `.env` file in the project root:

```bash
OPENWEATHER_API_KEY=your_actual_api_key_here
```

### Step 3: Test Locally with Netlify Dev

Run the development server with Netlify Functions enabled:

```bash
npm run netlify:dev
```

This will:
- Start the Vite dev server
- Start the Netlify Functions locally
- Make the weather API function available at `http://localhost:8888/.netlify/functions/weather`

Open http://localhost:8888 in your browser. You should see:
- A **green banner** saying "Live Data: Showing real weather forecast from OpenWeatherMap"
- Real weather data for Berlin's Tempelhofer Feld

If you see a **yellow banner** saying "Mock Data", check:
- Your API key is correct in `.env`
- You subscribed to "One Call API 3.0" (not the old 2.5)
- The Netlify dev server is running (not just `npm run dev`)

### Step 4: Verify It's Working

Open your browser's Developer Console (F12) and check:
- Network tab: You should see a successful request to `/.netlify/functions/weather`
- Console: No errors about API key or failed requests

The app will automatically fall back to mock data if the API fails, so check the banner color to confirm.

---

## Deploy to Netlify (Production)

### Prerequisites

- GitHub account
- Netlify account (free tier is fine)
- OpenWeatherMap API key (from above)

### Step 1: Push to GitHub

If you haven't already:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main  # or your branch name
```

### Step 2: Connect to Netlify

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** as your Git provider
4. Authorize Netlify to access your repositories
5. Select your `thf` repository

### Step 3: Configure Build Settings

Netlify should auto-detect the settings from `netlify.toml`, but verify:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Functions directory:** `netlify/functions`

Click **"Deploy site"**

### Step 4: Add Environment Variable

**IMPORTANT:** Your site will use mock data until you add the API key.

1. In Netlify dashboard, go to **Site settings** → **Environment variables**
2. Click **"Add a variable"**
3. Add:
   - **Key:** `OPENWEATHER_API_KEY`
   - **Value:** Your OpenWeatherMap API key
   - **Scopes:** Select all (Production, Deploy Previews, Branch Deploys)
4. Click **"Create variable"**

### Step 5: Redeploy

After adding the environment variable:

1. Go to **Deploys** in the Netlify dashboard
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**

Your site will rebuild with the API key and start showing real weather data!

### Step 6: Verify Deployment

1. Visit your site URL (something like `https://your-site-name.netlify.app`)
2. Check for the **green banner** saying "Live Data"
3. Verify the weather forecast makes sense for Berlin

---

## Continuous Deployment

Once set up, Netlify will automatically:
- Build and deploy every time you push to your main branch
- Deploy preview builds for pull requests
- Keep your API key secure (never exposed to the client)

To update your site:
```bash
git add .
git commit -m "Your changes"
git push
```

Netlify will automatically rebuild and deploy in ~1-2 minutes.

---

## Troubleshooting

### "Mock Data" banner shows on production

**Cause:** API key not set or incorrect

**Solution:**
1. Check environment variable in Netlify dashboard
2. Make sure it's named exactly `OPENWEATHER_API_KEY`
3. Verify you subscribed to "One Call API 3.0" on OpenWeatherMap
4. Trigger a new deploy after adding/fixing the key

### "Failed to fetch" errors

**Cause:** Network issues or API quota exceeded

**Solution:**
- Check OpenWeatherMap dashboard for usage/quota
- Free tier: 1000 calls/day
- App caches for 1 hour, so ~24 calls/day typical usage
- Wait and try again if quota exceeded

### Local testing shows mock data

**Cause:** Not using `netlify dev` or API key missing

**Solution:**
- Use `npm run netlify:dev` (not `npm run dev`)
- Check `.env` file exists and has correct API key
- Make sure you're on http://localhost:8888 (not :3000)

### Build fails on Netlify

**Cause:** Missing dependencies or build errors

**Solution:**
1. Check deploy logs in Netlify dashboard
2. Try building locally: `npm run build`
3. Make sure `package.json` and `package-lock.json` are committed
4. Clear cache and redeploy in Netlify

---

## Cost Breakdown

**100% FREE for typical usage:**

- **Netlify:** Free tier includes:
  - 100GB bandwidth/month
  - 300 build minutes/month
  - Unlimited sites
  - Automatic HTTPS
  - Functions: 125k requests/month

- **OpenWeatherMap:** Free tier includes:
  - 1000 API calls/day
  - With 1-hour caching: ~24 calls/day
  - = ~720 calls/month (well under limit)

**You won't pay anything unless your site gets huge traffic!**
