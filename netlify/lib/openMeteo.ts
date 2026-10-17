/**
 * Pure Open-Meteo -> HourData transformation (no I/O, unit-tested).
 *
 * Two subtleties this handles:
 *
 * 1. Timestamps. With timezone=Europe/Berlin, Open-Meteo returns local times
 *    ("2025-07-15T14:00") without an offset. `new Date()` parses those as the
 *    *server's* local time, and Netlify Functions run in UTC, so every hour
 *    used to be shifted by 1 h (winter) / 2 h (summer). We request
 *    timeformat=unixtime, and if strings come back anyway we convert them as
 *    Berlin wall-clock time explicitly.
 *
 * 2. Hour semantics. Precipitation, precipitation probability and gusts are
 *    aggregates over the *preceding* hour (the 15:00 record covers
 *    14:00-15:00), while temperature, wind, clouds and UV are instantaneous.
 *    The UI shows slots ("14:00" = 14:00-15:00), so slot values for those
 *    aggregates come from the next record.
 */

import type { HourData, WeatherCondition } from '../../src/utils/types';
import { berlinToUnix, startOfBerlinDay } from '../../src/utils/time';

type Series = Array<number | null | undefined>;

export interface OpenMeteoForecast {
  utc_offset_seconds?: number;
  hourly: {
    time: Array<number | string>;
    temperature_2m: Series;
    apparent_temperature?: Series;
    precipitation_probability?: Series;
    precipitation?: Series;
    weather_code?: Series;
    cloud_cover?: Series;
    visibility?: Series;
    wind_speed_10m: Series;
    wind_direction_10m?: Series;
    wind_gusts_10m?: Series;
    uv_index?: Series;
    is_day?: Series;
  };
}

export interface OpenMeteoAirQuality {
  hourly: {
    time: Array<number | string>;
    european_aqi?: Series;
  };
}

export const FORECAST_VARIABLES = [
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
  'is_day',
] as const;

// WMO weather interpretation codes
const WMO_WEATHER_CODES: Record<number, WeatherCondition> = {
  0: { main: 'Clear', description: 'clear sky' },
  1: { main: 'Clear', description: 'mainly clear' },
  2: { main: 'Clouds', description: 'partly cloudy' },
  3: { main: 'Clouds', description: 'overcast' },
  45: { main: 'Fog', description: 'fog' },
  48: { main: 'Fog', description: 'depositing rime fog' },
  51: { main: 'Drizzle', description: 'light drizzle' },
  53: { main: 'Drizzle', description: 'moderate drizzle' },
  55: { main: 'Drizzle', description: 'dense drizzle' },
  56: { main: 'Drizzle', description: 'light freezing drizzle' },
  57: { main: 'Drizzle', description: 'dense freezing drizzle' },
  61: { main: 'Rain', description: 'slight rain' },
  63: { main: 'Rain', description: 'moderate rain' },
  65: { main: 'Rain', description: 'heavy rain' },
  66: { main: 'Rain', description: 'light freezing rain' },
  67: { main: 'Rain', description: 'heavy freezing rain' },
  71: { main: 'Snow', description: 'slight snow' },
  73: { main: 'Snow', description: 'moderate snow' },
  75: { main: 'Snow', description: 'heavy snow' },
  77: { main: 'Snow', description: 'snow grains' },
  80: { main: 'Rain', description: 'slight rain showers' },
  81: { main: 'Rain', description: 'moderate rain showers' },
  82: { main: 'Rain', description: 'violent rain showers' },
  85: { main: 'Snow', description: 'slight snow showers' },
  86: { main: 'Snow', description: 'heavy snow showers' },
  95: { main: 'Thunderstorm', description: 'thunderstorm' },
  96: { main: 'Thunderstorm', description: 'thunderstorm with slight hail' },
  99: { main: 'Thunderstorm', description: 'thunderstorm with heavy hail' },
};

export const mapWeatherCode = (code: number): WeatherCondition =>
  WMO_WEATHER_CODES[code] ?? { main: 'Unknown', description: 'unknown' };

/** Unix seconds from an Open-Meteo time value (unixtime number, or Berlin-local ISO string). */
export const parseOpenMeteoTime = (value: number | string): number => {
  if (typeof value === 'number') return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) throw new Error(`Unrecognised Open-Meteo time: ${value}`);
  return berlinToUnix(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
};

const num = (series: Series | undefined, i: number): number | undefined => {
  const v = series?.[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
};

/**
 * Convert an Open-Meteo forecast (+ optional air-quality response) into hour slots.
 * Drops hours before Berlin midnight of `nowSeconds` and hours with no temperature/wind.
 */
export const transformForecast = (
  forecast: OpenMeteoForecast,
  airQuality: OpenMeteoAirQuality | null,
  nowSeconds: number
): HourData[] => {
  const h = forecast.hourly;
  const times = h.time.map(parseOpenMeteoTime);

  const aqiByTime = new Map<number, number>();
  if (airQuality?.hourly?.european_aqi) {
    airQuality.hourly.time.forEach((t, i) => {
      const v = num(airQuality.hourly.european_aqi, i);
      if (v !== undefined) aqiByTime.set(parseOpenMeteoTime(t), v);
    });
  }

  const dayStart = startOfBerlinDay(nowSeconds);
  const hourly: HourData[] = [];

  for (let i = 0; i < times.length; i++) {
    const dt = times[i]!;
    if (dt < dayStart) continue;

    const temp = num(h.temperature_2m, i);
    const wind = num(h.wind_speed_10m, i);
    if (temp === undefined || wind === undefined) continue;

    // "Preceding hour" aggregates for slot [dt, dt+1h) live in the next record.
    const next = times[i + 1] === dt + 3600 ? i + 1 : i;
    const pop = num(h.precipitation_probability, next) ?? num(h.precipitation_probability, i) ?? 0;
    const precip = num(h.precipitation, next) ?? 0;
    const gust = num(h.wind_gusts_10m, next) ?? num(h.wind_gusts_10m, i);
    // Most significant weather touching the slot (WMO codes rise with severity).
    const code = Math.max(num(h.weather_code, i) ?? 0, num(h.weather_code, next) ?? 0);

    const hour: HourData = {
      dt,
      temp,
      wind_speed: wind,
      weather: [mapWeatherCode(code)],
      pop: Math.min(1, Math.max(0, pop / 100)),
      hasThunderstorm: code >= 95,
    };
    const feels = num(h.apparent_temperature, i);
    if (feels !== undefined) hour.feels_like = feels;
    const uvi = num(h.uv_index, i);
    if (uvi !== undefined) hour.uvi = uvi;
    const clouds = num(h.cloud_cover, i);
    if (clouds !== undefined) hour.clouds = clouds;
    const visibility = num(h.visibility, i);
    if (visibility !== undefined) hour.visibility = visibility;
    const dir = num(h.wind_direction_10m, i);
    if (dir !== undefined) hour.wind_deg = dir;
    if (gust !== undefined) hour.wind_gust = Math.max(gust, wind);
    if (precip > 0) hour.rain = { '1h': precip };
    const isDay = num(h.is_day, i);
    if (isDay !== undefined) hour.is_day = isDay === 1;
    const aqi = aqiByTime.get(dt);
    if (aqi !== undefined) hour.air_quality = { european_aqi: aqi };

    hourly.push(hour);
  }

  return hourly;
};
