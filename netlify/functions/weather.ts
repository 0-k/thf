/**
 * Netlify Function: Weather API
 * Fetches weather (and air quality) from Open-Meteo (free, no API key needed)
 *
 * Caching strategy:
 * - Tries Netlify Blobs (persistent, shared across instances) if available
 * - Falls back to in-memory cache if Blobs not configured
 * - If Open-Meteo is down, serves the last good data (up to STALE_LIMIT old)
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import fetch from 'node-fetch';
import type { HourData } from '../../src/utils/types';
import { startOfBerlinDay } from '../../src/utils/time';
import {
  FORECAST_VARIABLES,
  transformForecast,
  type OpenMeteoAirQuality,
  type OpenMeteoForecast,
} from '../lib/openMeteo';

interface WeatherData {
  lat: number;
  lon: number;
  timezone: string;
  hourly: HourData[];
  sources: { forecast: string; airQuality: string | null };
}

interface CachedData {
  data: WeatherData;
  timestamp: number;
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const STALE_LIMIT = 12 * 60 * 60 * 1000; // serve old data for up to 12 h if the API is down
const FETCH_TIMEOUT = 10_000;
// Bump when the cached data shape/semantics change (v1 had shifted timestamps and a fake AQI).
const CACHE_KEY = 'weather-data-v2';
const TEMPELHOFER_LAT = 52.4732;
const TEMPELHOFER_LON = 13.4053;

// In-memory cache fallback
let memoryCache: CachedData | null = null;

// Lazy-load Netlify Blobs (only if available)
let blobStore: any = null;
let blobsAvailable: boolean | null = null;

async function initBlobStore(event?: HandlerEvent): Promise<any> {
  if (blobsAvailable === false) return null;

  try {
    const { getStore, connectLambda } = await import('@netlify/blobs');
    // Lambda-style (v1) handlers must hand the Blobs context from the event to the
    // client; without this getStore() throws MissingBlobsEnvironmentError in production.
    const lambdaEvent = event as unknown as { blobs?: string; headers: Record<string, string> } | undefined;
    if (lambdaEvent?.blobs) connectLambda({ blobs: lambdaEvent.blobs, headers: lambdaEvent.headers });
    if (blobStore) return blobStore;
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
      const cachedBlob = await store.get(CACHE_KEY, { type: 'json' });
      if (cachedBlob && cachedBlob.data && cachedBlob.timestamp) {
        return cachedBlob as CachedData;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('Blob cache read failed, falling back to memory:', errorMessage);
    }
  }

  return memoryCache;
}

async function setCache(data: WeatherData, timestamp: number): Promise<void> {
  const store = await initBlobStore();

  // Always update memory cache
  memoryCache = { data, timestamp };

  // Try to update blob storage if available
  if (store) {
    try {
      await store.set(CACHE_KEY, JSON.stringify({ data, timestamp }), {
        metadata: { fetched_at: new Date(timestamp).toISOString() }
      });
      console.log('✅ Cached to Netlify Blobs');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('⚠️  Blob cache write failed (using memory cache only):', errorMessage);
    }
  }
}

async function fetchJson<T>(url: URL): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal as any });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`${url.hostname} returned ${response.status}: ${details.slice(0, 200)}`);
    }
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

function buildForecastUrl(): URL {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', TEMPELHOFER_LAT.toString());
  url.searchParams.set('longitude', TEMPELHOFER_LON.toString());
  url.searchParams.set('hourly', FORECAST_VARIABLES.join(','));
  url.searchParams.set('timezone', 'Europe/Berlin');
  url.searchParams.set('timeformat', 'unixtime'); // unambiguous UTC timestamps
  url.searchParams.set('past_days', '1');         // earlier hours of today
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('wind_speed_unit', 'ms');  // m/s instead of km/h
  return url;
}

function buildAirQualityUrl(): URL {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', TEMPELHOFER_LAT.toString());
  url.searchParams.set('longitude', TEMPELHOFER_LON.toString());
  url.searchParams.set('hourly', 'european_aqi');
  url.searchParams.set('timezone', 'Europe/Berlin');
  url.searchParams.set('timeformat', 'unixtime');
  url.searchParams.set('past_days', '1');
  url.searchParams.set('forecast_days', '5');
  return url;
}

async function fetchWeather(nowMs: number): Promise<WeatherData> {
  const [forecastResult, airQualityResult] = await Promise.allSettled([
    fetchJson<OpenMeteoForecast>(buildForecastUrl()),
    fetchJson<OpenMeteoAirQuality>(buildAirQualityUrl()),
  ]);

  if (forecastResult.status === 'rejected') throw forecastResult.reason;

  // Air quality is a nice-to-have: without it, scoring simply skips the AQI penalty.
  const airQuality = airQualityResult.status === 'fulfilled' ? airQualityResult.value : null;
  if (airQualityResult.status === 'rejected') {
    console.log('⚠️  Air quality fetch failed (continuing without AQI):', String(airQualityResult.reason));
  }

  const hourly = transformForecast(forecastResult.value, airQuality, Math.floor(nowMs / 1000));
  if (hourly.length === 0) throw new Error('Open-Meteo returned no usable hours');

  return {
    lat: TEMPELHOFER_LAT,
    lon: TEMPELHOFER_LON,
    timezone: 'Europe/Berlin',
    hourly,
    sources: {
      forecast: 'Open-Meteo forecast (DWD ICON)',
      airQuality: airQuality ? 'Open-Meteo air quality (CAMS Europe)' : null,
    },
  };
}

/** Drop hours from previous days (cached data can outlive midnight). */
function forToday(data: WeatherData, nowMs: number): WeatherData {
  const dayStart = startOfBerlinDay(Math.floor(nowMs / 1000));
  return { ...data, hourly: data.hourly.filter(h => h.dt >= dayStart) };
}

export const handler: Handler = async (event: HandlerEvent) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const now = Date.now();
  await initBlobStore(event);
  const cached = await getFromCache();
  const cacheType = blobsAvailable ? 'Netlify Blobs' : 'memory';
  const okHeaders = {
    ...headers,
    // Let Netlify's CDN absorb bursts; the function cache still bounds staleness.
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=600, stale-while-revalidate=1800',
  };

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`Returning cached data from ${cacheType} (age: ${Math.round((now - cached.timestamp) / 60000)} minutes)`);
    return {
      statusCode: 200,
      headers: okHeaders,
      body: JSON.stringify({
        success: true,
        data: forToday(cached.data, now),
        cached: true,
        cache_type: cacheType,
        fetched_at: new Date(cached.timestamp).toISOString()
      })
    };
  }

  try {
    console.log('Fetching weather data from Open-Meteo...');
    const weatherData = await fetchWeather(now);
    await setCache(weatherData, now);
    console.log(`Fetched and cached fresh data to ${cacheType}`);

    return {
      statusCode: 200,
      headers: okHeaders,
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

    // Upstream down: better slightly old forecasts than none.
    if (cached && now - cached.timestamp < STALE_LIMIT) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: forToday(cached.data, now),
          cached: true,
          stale: true,
          cache_type: cacheType,
          fetched_at: new Date(cached.timestamp).toISOString()
        })
      };
    }

    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ success: false, error: errorMessage })
    };
  }
};
