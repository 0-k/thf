/**
 * Netlify Function: Weather API
 * Fetches weather data from Open-Meteo (free, no API key needed)
 *
 * Caching strategy:
 * - Tries Netlify Blobs (persistent, shared across instances) if available
 * - Falls back to in-memory cache if Blobs not configured
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import fetch from 'node-fetch';

// Type definitions
interface WeatherCache {
  data: WeatherData | null;
  timestamp: number | null;
}

interface WeatherData {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: {
    dt: number;
    temp: number;
    weather: Array<{ main: string; description: string }>;
  };
  hourly: HourlyData[];
}

interface HourlyData {
  dt: number;
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust: number;
  weather: Array<{ main: string; description: string }>;
  pop: number;
  rain?: { '1h': number };
  air_quality: { aqi: number };
  hasThunderstorm: boolean;
}

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    cloud_cover: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    uv_index: number[];
    is_day: number[];
  };
}

interface CachedData {
  data: WeatherData;
  timestamp: number;
}

// In-memory cache fallback
const memoryCache: WeatherCache = {
  data: null,
  timestamp: null
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const TEMPELHOFER_LAT = 52.4732;
const TEMPELHOFER_LON = 13.4053;

// Lazy-load Netlify Blobs (only if available)
let blobStore: any = null;
let blobsAvailable: boolean | null = null;

async function initBlobStore(): Promise<any> {
  if (blobsAvailable === false) return null;
  if (blobStore) return blobStore;

  try {
    const { getStore } = await import('@netlify/blobs');
    blobStore = getStore('weather-cache');
    blobsAvailable = true;
    console.log('✅ Netlify Blobs initialized successfully');
    return blobStore;
  } catch (error) {
    blobsAvailable = false;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('⚠️  Netlify Blobs not available, using in-memory cache:', errorMessage);
    return null;
  }
}

async function getFromCache(): Promise<CachedData | null> {
  const store = await initBlobStore();

  if (store) {
    try {
      const cachedBlob = await store.get('weather-data', { type: 'json' });
      if (cachedBlob && cachedBlob.data && cachedBlob.timestamp) {
        return cachedBlob as CachedData;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('Blob cache read failed, falling back to memory:', errorMessage);
    }
  }

  // Fallback to memory cache
  if (memoryCache.data && memoryCache.timestamp) {
    return {
      data: memoryCache.data,
      timestamp: memoryCache.timestamp
    };
  }

  return null;
}

async function setCache(data: WeatherData, timestamp: number): Promise<void> {
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('⚠️  Blob cache write failed (using memory cache only):', errorMessage);
    }
  }
}

// WMO Weather interpretation codes
const WMO_WEATHER_CODES: Record<number, { main: string; description: string }> = {
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

function mapWeatherCode(code: number): { main: string; description: string } {
  return WMO_WEATHER_CODES[code] || { main: 'Unknown', description: 'unknown' };
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
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
    forecastUrl.searchParams.set('latitude', TEMPELHOFER_LAT.toString());
    forecastUrl.searchParams.set('longitude', TEMPELHOFER_LON.toString());
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
    historicalUrl.searchParams.set('latitude', TEMPELHOFER_LAT.toString());
    historicalUrl.searchParams.set('longitude', TEMPELHOFER_LON.toString());
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

    const forecastData = await forecastResponse.json() as OpenMeteoResponse;
    const historicalData = historicalResponse.ok ? await historicalResponse.json() as OpenMeteoResponse : null;

    // Convert Open-Meteo hourly data to our format
    const convertHourlyData = (data: OpenMeteoResponse, startIndex = 0): HourlyData[] => {
      const hourly: HourlyData[] = [];
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

    // Get midnight of today IN BERLIN TIME (UTC+1 in winter, UTC+2 in summer)
    // The API returns data in Europe/Berlin timezone, so we need to align our midnight calculation
    const nowDate = new Date();
    const berlinOffset = 60; // Berlin is UTC+1 or UTC+2, we'll use the data to determine actual day boundary

    // Get current timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Combine historical (past hours of today) + forecast
    let allHourly: HourlyData[] = [];

    if (historicalData) {
      // Get ALL hours from historical data
      const historicalHourly = convertHourlyData(historicalData);

      // Simple approach: Include ALL historical hours that match today's date in Berlin
      // The API returns data in Berlin timezone, so we just need to check the date

      // Get today's date in Berlin (YYYY-MM-DD format)
      const berlinDateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const todayBerlinDate = berlinDateFormatter.format(new Date());

      const todayHours = historicalHourly.filter(h => {
        // Convert this hour's timestamp to Berlin date
        const hourBerlinDate = berlinDateFormatter.format(new Date(h.dt * 1000));

        // Include if it's today in Berlin and not in the future
        return hourBerlinDate === todayBerlinDate && h.dt < currentTimestamp;
      });

      allHourly = todayHours;
    }

    // Add forecast data (includes current hour onwards)
    const forecastHourly = convertHourlyData(forecastData);
    allHourly = [...allHourly, ...forecastHourly];

    // Remove duplicates (in case of overlap)
    const seen = new Set<number>();
    allHourly = allHourly.filter(h => {
      if (seen.has(h.dt)) return false;
      seen.add(h.dt);
      return true;
    });

    // Sort by timestamp
    allHourly.sort((a, b) => a.dt - b.dt);

    const weatherData: WeatherData = {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in weather function:', errorMessage);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    };
  }
};
