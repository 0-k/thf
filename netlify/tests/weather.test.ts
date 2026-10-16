// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent, HandlerContext } from '@netlify/functions';

const fetchMock = vi.fn();
vi.mock('node-fetch', () => ({ default: (...args: unknown[]) => fetchMock(...args) }));
// Blobs are unavailable outside Netlify: exercise the memory-cache path.
vi.mock('@netlify/blobs', () => ({ getStore: () => { throw new Error('no blobs in tests'); } }));

const now = Math.floor(Date.now() / 1000);
const hourStart = now - (now % 3600);
const forecastBody = {
  hourly: {
    time: [hourStart, hourStart + 3600],
    temperature_2m: [18, 19],
    wind_speed_10m: [3, 4],
    precipitation_probability: [0, 20],
    precipitation: [0, 0],
    weather_code: [1, 2],
    wind_gusts_10m: [5, 6],
  },
};
const aqBody = { hourly: { time: [hourStart, hourStart + 3600], european_aqi: [25, 30] } };

const respond = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const routeFetch = (opts: { forecast?: number; aq?: number } = {}) => {
  fetchMock.mockImplementation(async (url: string) =>
    url.includes('air-quality')
      ? respond(aqBody, opts.aq ?? 200)
      : respond(forecastBody, opts.forecast ?? 200)
  );
};

const invoke = async (method = 'GET') => {
  const { handler } = await import('../functions/weather');
  const res = await handler({ httpMethod: method } as HandlerEvent, {} as HandlerContext);
  return { ...res!, json: res && 'body' in res && res.body ? JSON.parse(res.body) : null };
};

describe('weather function', () => {
  beforeEach(() => {
    vi.resetModules(); // fresh in-memory cache per test
    fetchMock.mockReset();
  });

  it('requests unambiguous unix timestamps, past hours and m/s winds', async () => {
    routeFetch();
    await invoke();
    const forecastUrl = new URL(fetchMock.mock.calls.find(c => !String(c[0]).includes('air-quality'))![0]);
    expect(forecastUrl.searchParams.get('timeformat')).toBe('unixtime');
    expect(forecastUrl.searchParams.get('past_days')).toBe('1');
    expect(forecastUrl.searchParams.get('wind_speed_unit')).toBe('ms');
    expect(forecastUrl.searchParams.get('timezone')).toBe('Europe/Berlin');
  });

  it('returns hours with real AQI merged in', async () => {
    routeFetch();
    const res = await invoke();
    expect(res.statusCode).toBe(200);
    expect(res.json.success).toBe(true);
    expect(res.json.data.hourly[0].air_quality).toEqual({ european_aqi: 25 });
  });

  it('treats an air-quality outage as non-fatal', async () => {
    routeFetch({ aq: 503 });
    const res = await invoke();
    expect(res.statusCode).toBe(200);
    expect(res.json.data.hourly[0].air_quality).toBeUndefined();
    expect(res.json.data.sources.airQuality).toBeNull();
  });

  it('serves from cache within the TTL', async () => {
    routeFetch();
    const { handler } = await import('../functions/weather');
    await handler({ httpMethod: 'GET' } as HandlerEvent, {} as HandlerContext);
    const second = await handler({ httpMethod: 'GET' } as HandlerEvent, {} as HandlerContext);
    expect(JSON.parse((second as { body: string }).body).cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2); // forecast + AQ once
  });

  it('serves stale data when Open-Meteo fails after the cache expired', async () => {
    routeFetch();
    const { handler } = await import('../functions/weather');
    await handler({ httpMethod: 'GET' } as HandlerEvent, {} as HandlerContext);

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000); // 2 h later: past the 1 h TTL
    routeFetch({ forecast: 500 });
    const res = await handler({ httpMethod: 'GET' } as HandlerEvent, {} as HandlerContext);
    vi.useRealTimers();

    const body = JSON.parse((res as { body: string }).body);
    expect(body.success).toBe(true);
    expect(body.stale).toBe(true);
  });

  it('returns a 502 error (not fake data) when there is nothing to fall back to', async () => {
    routeFetch({ forecast: 500 });
    const res = await invoke();
    expect(res.statusCode).toBe(502);
    expect(res.json.success).toBe(false);
  });

  it('rejects non-GET methods', async () => {
    expect((await invoke('POST')).statusCode).toBe(405);
  });
});
