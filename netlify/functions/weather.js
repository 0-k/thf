/**
 * Netlify Function: Weather API
 * Fetches weather data from OpenWeatherMap and caches it for 1 hour
 */

const fetch = require('node-fetch');

// In-memory cache (simple solution for serverless)
// Note: Each function instance has its own cache, but that's OK for our use case
let cache = {
  data: null,
  timestamp: null
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const TEMPELHOFER_LAT = 52.4732;
const TEMPELHOFER_LON = 13.4053;

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
    // Check if we have valid cached data
    const now = Date.now();
    if (cache.data && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
      console.log('Returning cached data');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: cache.data,
          cached: true,
          cached_at: new Date(cache.timestamp).toISOString()
        })
      };
    }

    // Fetch fresh data from OpenWeatherMap
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      console.error('OPENWEATHER_API_KEY not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'API key not configured'
        })
      };
    }

    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${TEMPELHOFER_LAT}&lon=${TEMPELHOFER_LON}&exclude=minutely,current,alerts&units=metric&appid=${apiKey}`;

    console.log('Fetching fresh weather data...');
    const response = await fetch(url);

    if (!response.ok) {
      console.error('OpenWeatherMap API error:', response.status);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Weather API returned ${response.status}`
        })
      };
    }

    const weatherData = await response.json();

    // Update cache
    cache.data = weatherData;
    cache.timestamp = now;

    console.log('Fetched and cached fresh data');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: weatherData,
        cached: false,
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
