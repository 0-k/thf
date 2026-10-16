// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseOpenMeteoTime, transformForecast, type OpenMeteoForecast } from './openMeteo';
import { berlinParts, berlinToUnix } from '../../src/utils/time';

// Synthetic payload in Open-Meteo's response shape: Jul 15 2026, 12:00-15:00 Berlin.
const T0 = berlinToUnix(2026, 6, 15, 12);
const times = [T0, T0 + 3600, T0 + 7200, T0 + 10800];
const forecast = (overrides: Partial<OpenMeteoForecast['hourly']> = {}): OpenMeteoForecast => ({
  hourly: {
    time: times,
    temperature_2m: [24, 25, 26, 25],
    apparent_temperature: [25, 26, 27, 26],
    precipitation_probability: [0, 10, 80, 20],  // preceding-hour: 80% belongs to 13:00-14:00
    precipitation: [0, 0, 2.5, 0],
    weather_code: [1, 2, 63, 3],
    cloud_cover: [10, 30, 90, 60],
    visibility: [24000, 24000, 8000, 20000],
    wind_speed_10m: [3, 4, 6, 4],
    wind_direction_10m: [270, 270, 250, 260],
    wind_gusts_10m: [6, 7, 15, 8],
    uv_index: [6.5, 6, 2, 4],
    is_day: [1, 1, 1, 1],
    ...overrides,
  },
});
const NOW = T0 + 1800;

describe('parseOpenMeteoTime', () => {
  it('passes unix timestamps through', () => {
    expect(parseOpenMeteoTime(T0)).toBe(T0);
  });

  it('interprets ISO strings as Berlin wall-clock time (not server-local/UTC)', () => {
    // The old code did new Date('2026-07-15T14:00') on a UTC server -> 16:00 Berlin.
    const dt = parseOpenMeteoTime('2026-07-15T14:00');
    expect(berlinParts(dt).hour).toBe(14);
    expect(new Date(dt * 1000).toISOString()).toBe('2026-07-15T12:00:00.000Z');
    expect(berlinParts(parseOpenMeteoTime('2026-01-15T00:00')).hour).toBe(0);
  });
});

describe('transformForecast', () => {
  it('labels each hour with its real Berlin time', () => {
    const hours = transformForecast(forecast(), null, NOW);
    expect(hours.map(h => berlinParts(h.dt).hour)).toEqual([12, 13, 14, 15]);
  });

  it('gives the same result for unixtime and ISO-string responses', () => {
    const iso = forecast({ time: ['2026-07-15T12:00', '2026-07-15T13:00', '2026-07-15T14:00', '2026-07-15T15:00'] });
    expect(transformForecast(iso, null, NOW)).toEqual(transformForecast(forecast(), null, NOW));
  });

  it('moves preceding-hour aggregates onto the slot they describe', () => {
    const [h12, h13, h14] = transformForecast(forecast(), null, NOW);
    // The 14:00 record (80%, 2.5 mm, gust 15) describes 13:00-14:00
    expect(h13!.pop).toBeCloseTo(0.8);
    expect(h13!.rain?.['1h']).toBe(2.5);
    expect(h13!.wind_gust).toBe(15);
    expect(h13!.weather[0]!.main).toBe('Rain');
    expect(h12!.pop).toBeCloseTo(0.1);
    expect(h14!.rain).toBeUndefined();
    // Instantaneous values stay on their own hour
    expect(h13!.temp).toBe(25);
    expect(h13!.uvi).toBe(6);
  });

  it('flags thunderstorms touching either end of the slot', () => {
    const hours = transformForecast(forecast({ weather_code: [1, 2, 95, 3] }), null, NOW);
    expect(hours.map(h => h.hasThunderstorm)).toEqual([false, true, true, false]);
  });

  it('merges real European AQI by timestamp and omits it when absent', () => {
    const aq = { hourly: { time: [T0, T0 + 3600], european_aqi: [22, null] } };
    const hours = transformForecast(forecast(), aq, NOW);
    expect(hours[0]!.air_quality).toEqual({ european_aqi: 22 });
    expect(hours[1]!.air_quality).toBeUndefined();
    expect(hours[2]!.air_quality).toBeUndefined();
  });

  it('does not invent data: no fake pressure/humidity/dew point/AQI', () => {
    const h = transformForecast(forecast(), null, NOW)[0]! as unknown as Record<string, unknown>;
    expect(h['pressure']).toBeUndefined();
    expect(h['humidity']).toBeUndefined();
    expect(h['dew_point']).toBeUndefined();
    expect(h['air_quality']).toBeUndefined();
  });

  it('drops hours before Berlin midnight (past_days returns yesterday too)', () => {
    const yesterday = T0 - 24 * 3600;
    const f = forecast({ time: [yesterday, T0, T0 + 3600, T0 + 7200] });
    expect(transformForecast(f, null, NOW).map(h => h.dt)).toEqual([T0, T0 + 3600, T0 + 7200]);
  });

  it('skips hours with missing core values instead of crashing', () => {
    const f = forecast({ temperature_2m: [24, null, 26, 25] });
    expect(transformForecast(f, null, NOW)).toHaveLength(3);
  });
});
