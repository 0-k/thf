import { describe, it, expect } from 'vitest';
import {
  CROWD_MODEL,
  calculateCrowdFactor,
  diurnalProfile,
  estimateCrowd,
  getDayType,
  timeOfWeekFactor,
  weatherAttraction,
} from './crowd';
import { getSunTimes } from './calendar';
import { berlinToUnix } from './time';
import type { HourData } from './types';

// 2026: Jun 13 = Sat, Jun 14 = Sun, Jun 16 = Tue, Jun 19 = Fri
const hour = (y: number, m: number, d: number, h: number, overrides: Partial<HourData> = {}): HourData => ({
  dt: berlinToUnix(y, m, d, h),
  temp: 25,
  wind_speed: 3,
  pop: 0,
  clouds: 5,
  weather: [{ main: 'Clear', description: 'clear sky' }],
  hasThunderstorm: false,
  ...overrides,
});

describe('Crowd model calibration (Besuchermonitoring 2014)', () => {
  // Counting days: late May + mid June 2014. Daily entries: weekday 12,598,
  // Saturday 25,614, Sunday 31,040. Occupancy-hours = entries x mean visit
  // duration (2023 survey: ~1.9 h weekday, 2.0 h Saturday, 2.25 h Sunday).
  const days = [{ m: 4, d: 28, open: 6, close: 22 }, { m: 5, d: 14, open: 6, close: 23 }];
  const occupancyHours = (config: typeof CROWD_MODEL.weekday, fridayBoostFrom?: number): number => {
    let total = 0;
    for (const { m, d, open, close } of days) {
      const { sunrise, sunset } = getSunTimes(2014, m, d);
      for (let h = open; h < close; h++) {
        const boost = fridayBoostFrom !== undefined && h >= fridayBoostFrom ? CROWD_MODEL.fridayEveningBoost : 1;
        total += config.level * diurnalProfile(config, h, sunrise, sunset) * boost;
      }
    }
    return total / days.length;
  };

  it('reproduces the Saturday/Sunday ratio within 3%', () => {
    const ratio = occupancyHours(CROWD_MODEL.saturday) / occupancyHours(CROWD_MODEL.sunday);
    const target = (25614 * 2.0) / (31040 * 2.25);
    expect(Math.abs(ratio / target - 1)).toBeLessThan(0.03);
  });

  it('reproduces the weekday/Sunday ratio within 3% (Mon-Thu + Friday uplift)', () => {
    const weekdayMean = (4 * occupancyHours(CROWD_MODEL.weekday) + occupancyHours(CROWD_MODEL.weekday, 15)) / 5;
    const ratio = weekdayMean / occupancyHours(CROWD_MODEL.sunday);
    const target = (12598 * 1.9) / (31040 * 2.25);
    expect(Math.abs(ratio / target - 1)).toBeLessThan(0.03);
  });

  it('peaks near the observed autumn peak times (weekday 16:30, Sat 14:30, Sun 14:00)', () => {
    // Autumn monitoring 2012; mid-September sunset ~19:10 CEST
    const peakHour = (y: number, m: number, d: number): number => {
      let best = 0;
      let bestValue = -1;
      for (let h = 6; h < 21; h++) {
        const v = timeOfWeekFactor(y, m, d, new Date(Date.UTC(y, m, d)).getUTCDay(), h).factor;
        if (v > bestValue) { bestValue = v; best = h; }
      }
      return best + 0.5; // slot midpoint
    };
    expect(Math.abs(peakHour(2012, 8, 18) - 16.5)).toBeLessThanOrEqual(1);  // Tuesday
    expect(Math.abs(peakHour(2012, 8, 22) - 14.5)).toBeLessThanOrEqual(1);  // Saturday
    expect(Math.abs(peakHour(2012, 8, 23) - 14.0)).toBeLessThanOrEqual(1);  // Sunday
  });
});

describe('Crowd model behaviour', () => {
  it('is ~100 at the reference: sunny summer Sunday afternoon', () => {
    expect(calculateCrowdFactor(hour(2026, 5, 14, 15))).toBeGreaterThanOrEqual(90);
  });

  it('weekends are busier than weekdays at the same time and weather', () => {
    const tue = calculateCrowdFactor(hour(2026, 5, 16, 15));
    const sat = calculateCrowdFactor(hour(2026, 5, 13, 15));
    const sun = calculateCrowdFactor(hour(2026, 5, 14, 15));
    expect(sat).toBeGreaterThan(tue * 1.5);
    expect(sun).toBeGreaterThan(sat);
  });

  it('treats public holidays like Sundays', () => {
    // Whit Monday 2026-05-25 vs the Sunday before
    expect(getDayType(2026, 4, 25, 1)).toBe('holiday');
    const holiday = estimateCrowd(hour(2026, 4, 25, 15));
    const sunday = estimateCrowd(hour(2026, 4, 24, 15));
    expect(holiday.holiday).toBe('Whit Monday');
    expect(Math.abs(holiday.index - sunday.index)).toBeLessThanOrEqual(2);
  });

  it('rain empties the field on any day (multiplicative, not additive)', () => {
    const pouring = { temp: 17, pop: 1, rain: { '1h': 3 }, clouds: 100 };
    expect(calculateCrowdFactor(hour(2026, 5, 13, 15, pouring))).toBeLessThan(10);
    expect(calculateCrowdFactor(hour(2026, 5, 14, 15, pouring))).toBeLessThan(10);
  });

  it('a grey winter weekday is quiet', () => {
    const jan = estimateCrowd(hour(2026, 0, 13, 14, { temp: 3, clouds: 100 }));
    expect(jan.level).toBe('quiet');
  });

  it('weekday crowds peak in the evening in summer (after work)', () => {
    const noon = calculateCrowdFactor(hour(2026, 5, 16, 12));
    const evening = calculateCrowdFactor(hour(2026, 5, 16, 19));
    expect(evening).toBeGreaterThan(noon * 2);
  });

  it('Friday evenings are busier than other weekday evenings', () => {
    expect(calculateCrowdFactor(hour(2026, 5, 19, 19))).toBeGreaterThan(calculateCrowdFactor(hour(2026, 5, 16, 19)));
  });

  it('weather attraction responds in the expected direction to each driver', () => {
    const base = weatherAttraction(22, 0, 0, 0, 3);
    expect(weatherAttraction(8, 0, 0, 0, 3)).toBeLessThan(base);      // cold
    expect(weatherAttraction(35, 0, 0, 0, 3)).toBeLessThan(base);     // heat, no shade
    expect(weatherAttraction(22, 0.6, 0, 0, 3)).toBeLessThan(base);   // rain risk
    expect(weatherAttraction(22, 0, 0, 100, 3)).toBeLessThan(base);   // overcast
    expect(weatherAttraction(22, 0, 0, 0, 12)).toBeLessThan(base);    // strong wind
    expect(weatherAttraction(22, 1, 3, 0, 3)).toBeLessThan(weatherAttraction(22, 1, 0.1, 0, 3)); // heavy vs drizzle
  });

  it('has a continuous daily curve (no step functions)', () => {
    const { sunrise, sunset } = getSunTimes(2026, 5, 13);
    for (const config of [CROWD_MODEL.weekday, CROWD_MODEL.saturday, CROWD_MODEL.sunday]) {
      // A step function shows a jump however small dt gets; a continuous curve's change shrinks with dt.
      const dt = 0.01;
      for (let t = 5; t < 23; t += dt) {
        const step = Math.abs(diurnalProfile(config, t + dt, sunrise, sunset) - diurnalProfile(config, t, sunrise, sunset));
        expect(step).toBeLessThan(0.01); // slope < 1 (full peak) per hour
      }
    }
  });

  it('stays within 0-100 for extreme inputs', () => {
    for (const o of [{ temp: -15, pop: 1, clouds: 100, wind_speed: 25 }, { temp: 26, pop: 0, clouds: 0, wind_speed: 0 }]) {
      for (const d of [13, 14, 16]) {
        const c = calculateCrowdFactor(hour(2026, 5, d, 15, o));
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(100);
      }
    }
  });
});
