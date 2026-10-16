/**
 * Simulated forecast for local development (`npm run dev` without Netlify Functions).
 * Never shown in production builds. Seasonal and seeded per day, so the page
 * looks plausible all year and doesn't reshuffle on every refresh.
 */

import type { HourData } from './types';
import { berlinParts, startOfBerlinDay } from './time';
import { getSunTimes } from './calendar';

// Berlin monthly mean daily max/min (°C), Jan..Dec
const MEAN_MAX = [3, 5, 9, 15, 19, 23, 25, 24, 20, 14, 8, 4];
const MEAN_MIN = [-2, -2, 1, 4, 8, 12, 14, 13, 10, 6, 2, -1];

const seededRandom = (seed: number): (() => number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

export const generateMockWeatherData = (nowSeconds = Math.floor(Date.now() / 1000)): { hourly: HourData[] } => {
  const start = startOfBerlinDay(nowSeconds);
  const today = berlinParts(start);
  const rand = seededRandom(today.year * 1000 + today.month * 40 + today.day);
  const hourly: HourData[] = [];

  // Per-day weather "regime": dry, showery, or wet
  const regimes = Array.from({ length: 7 }, () => rand());

  for (let i = 0; i < 168; i++) {
    const dt = start + i * 3600;
    const p = berlinParts(dt);
    const dayIndex = Math.floor(i / 24);
    const regime = regimes[dayIndex] ?? 0.5;
    const { sunrise, sunset } = getSunTimes(p.year, p.month, p.day);

    // Diurnal temperature: min near sunrise, max mid-afternoon
    const max = (MEAN_MAX[p.month] ?? 15) + (regime < 0.4 ? 2 : regime > 0.75 ? -3 : 0) + (rand() - 0.5) * 2;
    const min = MEAN_MIN[p.month] ?? 5;
    const phase = Math.cos(((p.hour - 15) / 24) * 2 * Math.PI);
    const temp = min + (max - min) * (0.5 + 0.5 * phase) + (rand() - 0.5);

    const windSpeed = Math.max(0, (p.hour >= 10 && p.hour <= 18 ? 5 : 3) + (regime > 0.6 ? 2 : 0) + (rand() - 0.5) * 4);
    const windGust = windSpeed * (1.4 + rand() * 0.5);

    const basePop = regime < 0.4 ? 0.05 : regime < 0.75 ? 0.35 : 0.7;
    const pop = Math.max(0, Math.min(0.95, basePop + (rand() - 0.5) * 0.3));
    const precip = pop > 0.5 ? Math.round(rand() * pop * 30) / 10 : 0;
    const clouds = Math.max(0, Math.min(100, Math.round(pop * 100 + (rand() - 0.3) * 40)));

    const daylight = p.hour + 0.5 > sunrise && p.hour + 0.5 < sunset;
    const solarNoon = (sunrise + sunset) / 2;
    const peakUv = Math.max(0, (MEAN_MAX[p.month] ?? 15) / 4);
    const uvi = daylight
      ? Math.round(Math.max(0, peakUv * Math.cos(((p.hour + 0.5 - solarNoon) / (sunset - sunrise)) * Math.PI)) * (1 - clouds / 140) * 10) / 10
      : 0;

    const thunder = p.month >= 5 && p.month <= 7 && pop > 0.7 && rand() > 0.85;
    const main = thunder ? 'Thunderstorm' : precip > 0 ? 'Rain' : clouds > 60 ? 'Clouds' : 'Clear';
    const description = thunder ? 'thunderstorm' : precip > 1.5 ? 'moderate rain' : precip > 0 ? 'slight rain'
      : clouds > 85 ? 'overcast' : clouds > 40 ? 'partly cloudy' : 'clear sky';

    const hour: HourData = {
      dt,
      temp: Math.round(temp * 10) / 10,
      feels_like: Math.round((temp - Math.max(0, windSpeed - 3) * 0.7) * 10) / 10,
      wind_speed: Math.round(windSpeed * 10) / 10,
      wind_gust: Math.round(windGust * 10) / 10,
      wind_deg: 250,
      pop: Math.round(pop * 100) / 100,
      clouds,
      uvi,
      visibility: precip > 0 ? 8000 : 24000,
      weather: [{ main, description }],
      hasThunderstorm: thunder,
      is_day: daylight,
    };
    if (precip > 0) hour.rain = { '1h': precip };
    // CAMS forecasts cover ~5 days; mimic that so the UI handles missing AQI
    if (dayIndex < 5) hour.air_quality = { european_aqi: Math.round(15 + rand() * 30 + (p.hour >= 7 && p.hour <= 9 ? 10 : 0)) };
    hourly.push(hour);
  }

  return { hourly };
};
