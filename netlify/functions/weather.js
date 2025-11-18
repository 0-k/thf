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

    // Using basic free APIs - no subscription needed, works immediately
    // Fetch current weather + 5-day/3-hour forecast
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${TEMPELHOFER_LAT}&lon=${TEMPELHOFER_LON}&units=metric&appid=${apiKey}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${TEMPELHOFER_LAT}&lon=${TEMPELHOFER_LON}&units=metric&appid=${apiKey}`;

    console.log('Fetching weather data from basic free API...');

    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl)
    ]);

    if (!currentResponse.ok) {
      console.error('Current weather API error:', currentResponse.status);
      const errorText = await currentResponse.text();
      console.error('Error details:', errorText);
      return {
        statusCode: currentResponse.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Current weather API returned ${currentResponse.status}`,
          details: errorText
        })
      };
    }

    if (!forecastResponse.ok) {
      console.error('Forecast API error:', forecastResponse.status);
      return {
        statusCode: forecastResponse.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Forecast API returned ${forecastResponse.status}`
        })
      };
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    // Convert to One Call API format for compatibility
    // Forecast API gives 3-hour intervals for 5 days (40 data points)
    const hourly = forecastData.list.map(item => ({
      dt: item.dt,
      temp: item.main.temp,
      feels_like: item.main.feels_like,
      pressure: item.main.pressure,
      humidity: item.main.humidity,
      dew_point: item.main.temp - ((100 - item.main.humidity) / 5), // approximation
      uvi: 0, // Not available in free API
      clouds: item.clouds.all,
      visibility: item.visibility || 10000,
      wind_speed: item.wind.speed,
      wind_deg: item.wind.deg,
      wind_gust: item.wind.gust || item.wind.speed,
      weather: item.weather,
      pop: item.pop || 0,
      rain: item.rain ? { '3h': item.rain['3h'] || 0 } : undefined,
      snow: item.snow ? { '3h': item.snow['3h'] || 0 } : undefined,
      air_quality: { aqi: 2 } // Mock AQI since not available
    }));

    // Backfill past hours of today (from midnight to current hour)
    // Free API doesn't provide historical data, so we interpolate from current conditions
    const nowTimestamp = currentData.dt;
    const nowDate = new Date(nowTimestamp * 1000);
    const midnightToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0);
    const midnightTimestamp = Math.floor(midnightToday.getTime() / 1000);

    const pastHours = [];
    for (let ts = midnightTimestamp; ts < nowTimestamp; ts += 3600) {
      // Interpolate temperature (slightly cooler in early morning)
      const hour = new Date(ts * 1000).getHours();
      const tempVariation = hour < 6 ? -2 : (hour < 12 ? -1 : 0);

      pastHours.push({
        dt: ts,
        temp: currentData.main.temp + tempVariation,
        feels_like: currentData.main.feels_like + tempVariation,
        pressure: currentData.main.pressure,
        humidity: currentData.main.humidity,
        dew_point: currentData.main.temp - ((100 - currentData.main.humidity) / 5),
        uvi: 0,
        clouds: currentData.clouds.all,
        visibility: currentData.visibility || 10000,
        wind_speed: currentData.wind.speed * (hour < 6 ? 0.7 : 0.9),
        wind_deg: currentData.wind.deg,
        wind_gust: currentData.wind.gust || currentData.wind.speed,
        weather: currentData.weather,
        pop: 0,
        air_quality: { aqi: 2 }
      });
    }

    // Combine past hours + current + future forecast
    const allHourly = [...pastHours, ...hourly];

    const weatherData = {
      lat: TEMPELHOFER_LAT,
      lon: TEMPELHOFER_LON,
      timezone: 'Europe/Berlin',
      timezone_offset: 3600,
      current: {
        dt: currentData.dt,
        temp: currentData.main.temp,
        weather: currentData.weather
      },
      hourly: allHourly
    };

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
