/**
 * Calendar facts for Tempelhofer Feld: sunrise/sunset and Berlin public holidays.
 * Pure functions, no network, so they work for mock data and tests too.
 */

import { berlinOffsetMinutes, dayOfYear } from './time';

export const THF_LAT = 52.4732;
export const THF_LON = 13.4053;

export interface SunTimes {
  /** Decimal hours in Berlin local time, e.g. 6.25 = 06:15 */
  sunrise: number;
  sunset: number;
}

const sunCache = new Map<string, SunTimes>();

/**
 * Sunrise/sunset in Berlin local time (NOAA low-precision solar position;
 * good to a couple of minutes, which is plenty for crowd modelling).
 * Month is 0-based.
 */
export const getSunTimes = (year: number, month: number, day: number): SunTimes => {
  const key = `${year}-${month}-${day}`;
  const cached = sunCache.get(key);
  if (cached) return cached;

  const rad = Math.PI / 180;
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear(year, month, day) - 1);
  const eqTimeMin = 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  const lat = THF_LAT * rad;
  const cosHa = Math.cos(90.833 * rad) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl);
  const haDeg = Math.acos(Math.max(-1, Math.min(1, cosHa))) / rad;

  const sunriseUtcMin = 720 - 4 * (THF_LON + haDeg) - eqTimeMin;
  const sunsetUtcMin = 720 - 4 * (THF_LON - haDeg) - eqTimeMin;
  const offsetMin = berlinOffsetMinutes(Date.UTC(year, month, day, 12) / 1000);

  const times = {
    sunrise: (sunriseUtcMin + offsetMin) / 60,
    sunset: (sunsetUtcMin + offsetMin) / 60,
  };
  sunCache.set(key, times);
  return times;
};

/** Easter Sunday (anonymous Gregorian algorithm). Returns [month0, day]. */
export const easterSunday = (year: number): [number, number] => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return [Math.floor(n / 31) - 1, (n % 31) + 1];
};

const holidayCache = new Map<number, Map<string, string>>();

/** Berlin public holidays for a year, keyed by "month0-day". */
export const getBerlinHolidays = (year: number): Map<string, string> => {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const holidays = new Map<string, string>();
  const add = (month: number, day: number, name: string): void => {
    holidays.set(`${month}-${day}`, name);
  };
  const addOffsetFromEaster = (offsetDays: number, name: string): void => {
    const [em, ed] = easterSunday(year);
    const d = new Date(Date.UTC(year, em, ed + offsetDays));
    add(d.getUTCMonth(), d.getUTCDate(), name);
  };

  add(0, 1, "New Year's Day");
  add(2, 8, "International Women's Day"); // Berlin-only since 2019
  addOffsetFromEaster(-2, 'Good Friday');
  addOffsetFromEaster(1, 'Easter Monday');
  add(4, 1, 'Labour Day');
  addOffsetFromEaster(39, 'Ascension Day');
  addOffsetFromEaster(50, 'Whit Monday');
  add(9, 3, 'German Unity Day');
  add(11, 25, 'Christmas Day');
  add(11, 26, 'Boxing Day');

  holidayCache.set(year, holidays);
  return holidays;
};

/** Holiday name if the Berlin date is a public holiday, else null. Month is 0-based. */
export const getHolidayName = (year: number, month: number, day: number): string | null =>
  getBerlinHolidays(year).get(`${month}-${day}`) ?? null;
