/**
 * Netlify Function: Weather API
 * Fetches weather data from Open-Meteo (free, no API key needed)
 *
 * Caching strategy:
 * - Tries Netlify Blobs (persistent, shared across instances) if available
 * - Falls back to in-memory cache if Blobs not configured
 */

const fetch = require('node-fetch');

// In-memory cache fallback
let memoryCache = {
  data: null,
  timestamp: null
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const TEMPELHOFER_LAT = 52.4732;
const TEMPELHOFER_LON = 13.4053;

// Lazy-load Netlify Blobs (only if available)
let blobStore = null;
let blobsAvailable = null;

async function initBlobStore() {
  if (blobsAvailable === false) return null;
  if (blobStore) return blobStore;

  try {
    const { getStore } = require('@netlify/blobs');
    blobStore = getStore('weather-cache');
    blobsAvailable = true;
    console.log('✅ Netlify Blobs initialized successfully');
    return blobStore;
  } catch (error) {
    blobsAvailable = false;
    console.log('⚠️  Netlify Blobs not available, using in-memory cache:', error.message);
    return null;
  }
}

async function getFromCache() {
  const store = await initBlobStore();

  if (store) {
    try {
      const cachedBlob = await store.get('weather-data', { type: 'json' });
      if (cachedBlob && cachedBlob.data && cachedBlob.timestamp) {
        return cachedBlob;
      }
    } catch (error) {
      console.log('Blob cache read failed, falling back to memory:', error.message);
    }
  }

  // Fallback to memory cache
  if (memoryCache.data && memoryCache.timestamp) {
    return memoryCache;
  }

  return null;
}

async function setCache(data, timestamp) {
  const store = await initBlobStore();

  // Always update memory cache
  memoryCache.data = data;
  memoryCache.timestamp = timestamp;

  // Try to update blob storage if available
  if (store) {
    try {
      await store.set('weather-data', JSON.stringify({
        data,
        timestamp
      }), {
        metadata: {
          fetched_at: new Date(timestamp).toISOString()
        }
      });
      console.log('✅ Cached to Netlify Blobs');
    } catch (error) {
      console.log('⚠️  Blob cache write failed (using memory cache only):', error.message);
    }
  }
}

// WMO Weather interpretation codes
const WMO_WEATHER_CODES = {
  0: { main: 'Clear', description: 'clear sky' },
  1: { main: 'Clear', description: 'mainly clear' },
  2: { main: 'Clouds', description: 'partly cloudy' },
  3: { main: 'Clouds', description: 'overcast' },
  45: { main: 'Fog', description: 'fog' },
  48: { main: 'Fog', description: 'depositing rime fog' },
  51: { main: 'Drizzle', description: 'light drizzle' },
  53: { main: 'Drizzle', description: 'moderate drizzle' },
  55: { main: 'Drizzle', description: 'dense drizzle' },
  61: { main: 'Rain', description: 'slight rain' },
  63: { main: 'Rain', description: 'moderate rain' },
  65: { main: 'Rain', description: 'heavy rain' },
  71: { main: 'Snow', description: 'slight snow' },
  73: { main: 'Snow', description: 'moderate snow' },
  75: { main: 'Snow', description: 'heavy snow' },
  80: { main: 'Rain', description: 'slight rain showers' },
  81: { main: 'Rain', description: 'moderate rain showers' },
  82: { main: 'Rain', description: 'violent rain showers' },
  95: { main: 'Thunderstorm', description: 'thunderstorm' },
  96: { main: 'Thunderstorm', description: 'thunderstorm with slight hail' },
  99: { main: 'Thunderstorm', description: 'thunderstorm with heavy hail' }
};

function mapWeatherCode(code) {
  return WMO_WEATHER_CODES[code] || { main: 'Unknown', description: 'unknown' };
}

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Check cache (Blobs or memory)
    const now = Date.now();
    const cached = await getFromCache();

    if (cached && cached.data && cached.timestamp) {
      const cacheAge = now - cached.timestamp;
      if (cacheAge < CACHE_DURATION) {
        const cacheType = blobsAvailable ? 'Netlify Blobs' : 'memory';
        console.log(`Returning cached data from ${cacheType} (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: cached.data,
            cached: true,
            cache_type: cacheType,
            cached_at: new Date(cached.timestamp).toISOString()
          })
        };
      }
    }

    // Build Open-Meteo API URL for forecast
    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.searchParams.set('latitude', TEMPELHOFER_LAT);
    forecastUrl.searchParams.set('longitude', TEMPELHOFER_LON);
    forecastUrl.searchParams.set('hourly', [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'visibility',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'uv_index',
      'is_day'
    ].join(','));
    forecastUrl.searchParams.set('timezone', 'Europe/Berlin');
    forecastUrl.searchParams.set('forecast_days', '7');
    forecastUrl.searchParams.set('wind_speed_unit', 'ms'); // Get m/s instead of km/h

    // Fetch past 24 hours for today's historical data
    const historicalUrl = new URL('https://api.open-meteo.com/v1/forecast');
    historicalUrl.searchParams.set('latitude', TEMPELHOFER_LAT);
    historicalUrl.searchParams.set('longitude', TEMPELHOFER_LON);
    historicalUrl.searchParams.set('hourly', [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'visibility',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'uv_index',
      'is_day'
    ].join(','));
    historicalUrl.searchParams.set('timezone', 'Europe/Berlin');
    historicalUrl.searchParams.set('past_days', '1');
    historicalUrl.searchParams.set('forecast_days', '1');
    historicalUrl.searchParams.set('wind_speed_unit', 'ms'); // Get m/s instead of km/h

    console.log('Fetching weather data from Open-Meteo...');

    const [forecastResponse, historicalResponse] = await Promise.all([
      fetch(forecastUrl.toString()),
      fetch(historicalUrl.toString())
    ]);

    if (!forecastResponse.ok) {
      console.error('Forecast API error:', forecastResponse.status);
      const errorText = await forecastResponse.text();
      console.error('Error details:', errorText);
      return {
        statusCode: forecastResponse.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Forecast API returned ${forecastResponse.status}`,
          details: errorText
        })
      };
    }

    if (!historicalResponse.ok) {
      console.error('Historical API error:', historicalResponse.status);
      // Non-fatal, we can continue without past hours
    }

    const forecastData = await forecastResponse.json();
    const historicalData = historicalResponse.ok ? await historicalResponse.json() : null;

    // Convert Open-Meteo hourly data to our format
    const convertHourlyData = (data, startIndex = 0) => {
      const hourly = [];
      const times = data.hourly.time;

      for (let i = startIndex; i < times.length; i++) {
        const time = new Date(times[i]);
        const weatherInfo = mapWeatherCode(data.hourly.weather_code[i]);

        hourly.push({
          dt: Math.floor(time.getTime() / 1000),
          temp: data.hourly.temperature_2m[i],
          feels_like: data.hourly.apparent_temperature[i],
          pressure: 1013, // Not available in free tier, using standard pressure
          humidity: 50, // Not available in free tier, using typical value
          dew_point: data.hourly.temperature_2m[i] - 5, // Approximation
          uvi: data.hourly.uv_index[i] || 0,
          clouds: data.hourly.cloud_cover[i],
          visibility: data.hourly.visibility[i] || 10000,
          wind_speed: data.hourly.wind_speed_10m[i],
          wind_deg: data.hourly.wind_direction_10m[i],
          wind_gust: data.hourly.wind_gusts_10m[i] || data.hourly.wind_speed_10m[i],
          weather: [weatherInfo],
          pop: (data.hourly.precipitation_probability[i] || 0) / 100,
          rain: data.hourly.precipitation[i] > 0 ? { '1h': data.hourly.precipitation[i] } : undefined,
          air_quality: { aqi: 2 }, // Not available in Open-Meteo, using mock value
          hasThunderstorm: data.hourly.weather_code[i] >= 95
        });
      }

      return hourly;
    };

    // Get midnight of today
    const nowDate = new Date();
    const midnightToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0);
    const midnightTimestamp = Math.floor(midnightToday.getTime() / 1000);
    const currentTimestamp = Math.floor(nowDate.getTime() / 1000);

    // Combine historical (past hours of today) + forecast
    let allHourly = [];

    if (historicalData) {
      // Get ALL hours from midnight onwards (includes past hours of today)
      const historicalHourly = convertHourlyData(historicalData);
      const todayHours = historicalHourly.filter(h => {
        // Include from midnight up to (but not including) current hour
        return h.dt >= midnightTimestamp && h.dt < currentTimestamp;
      });
      allHourly = todayHours;
    }

    // Add forecast data (includes current hour onwards)
    const forecastHourly = convertHourlyData(forecastData);
    allHourly = [...allHourly, ...forecastHourly];

    // Remove duplicates (in case of overlap)
    const seen = new Set();
    allHourly = allHourly.filter(h => {
      if (seen.has(h.dt)) return false;
      seen.add(h.dt);
      return true;
    });

    // Sort by timestamp
    allHourly.sort((a, b) => a.dt - b.dt);

    const weatherData = {
      lat: TEMPELHOFER_LAT,
      lon: TEMPELHOFER_LON,
      timezone: 'Europe/Berlin',
      timezone_offset: 3600,
      current: {
        dt: allHourly[0]?.dt || Math.floor(Date.now() / 1000),
        temp: allHourly[0]?.temp || 15,
        weather: allHourly[0]?.weather || [{ main: 'Clear', description: 'clear sky' }]
      },
      hourly: allHourly
    };

    // Save to cache (Blobs or memory)
    await setCache(weatherData, now);

    const cacheType = blobsAvailable ? 'Netlify Blobs' : 'memory';
    console.log(`Fetched and cached fresh data to ${cacheType}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: weatherData,
        cached: false,
        cache_type: cacheType,
        fetched_at: new Date(now).toISOString()
      })
    };

  } catch (error) {
    console.error('Error in weather function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
