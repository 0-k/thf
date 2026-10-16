import { describe, it, expect } from 'vitest';
import {
  SCORING_CONFIG,
  OPENING_HOURS_CONFIG,
  getOpeningHours,
  isOpen,
  isOpenAt,
  scoreHour,
  explainActivity,
  aqiLevel,
  kitingWindPenalty,
  calculateCyclingScore,
  calculateJoggingScore,
  calculateKitingScore,
  calculateSocializingScore,
} from './scoring';
import { berlinToUnix } from './time';
import type { Activity, HourData } from './types';

describe('Opening Hours Logic', () => {
  describe('OPENING_HOURS_CONFIG', () => {
    it('should have 12 months of opening hours', () => {
      expect(OPENING_HOURS_CONFIG.months).toHaveLength(12);
    });

    it('should have earliest opening in summer months (6:00)', () => {
      // March through September open at 6
      for (const month of [2, 3, 4, 5, 6, 7, 8]) {
        expect(OPENING_HOURS_CONFIG.months[month]!.open).toBe(6);
      }
    });

    it('should have latest closing in June/July (23:00)', () => {
      expect(OPENING_HOURS_CONFIG.months[5]!.close).toBe(23); // June
      expect(OPENING_HOURS_CONFIG.months[6]!.close).toBe(23); // July
    });

    it('should have earliest closing in winter (17:00 for Jan/Dec)', () => {
      expect(OPENING_HOURS_CONFIG.months[0]!.close).toBe(17);  // January
      expect(OPENING_HOURS_CONFIG.months[11]!.close).toBe(17); // December
    });
  });

  describe('getOpeningHours', () => {
    it('should return January hours (8-17)', () => {
      const date = new Date(2024, 0, 15); // January 15
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 8, close: 17 });
    });

    it('should return June hours (6-23)', () => {
      const date = new Date(2024, 5, 15); // June 15
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 6, close: 23 });
    });

    it('should return October hours (7-19)', () => {
      const date = new Date(berlinToUnix(2024, 9, 1) * 1000); // October 1, 00:00 Berlin
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 7, close: 19 });
    });

    it('should return December hours (8-17)', () => {
      const date = new Date(2024, 11, 25); // December 25
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 8, close: 17 });
    });

    it('should return April hours (6-21)', () => {
      const date = new Date(2024, 3, 15); // April 15
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 6, close: 21 });
    });
  });

  describe('isOpen', () => {
    it('should return true for 10:00 in June', () => {
      const date = new Date(2024, 5, 15); // June 15
      expect(isOpen(10, date)).toBe(true);
    });

    it('should return false for 5:00 in June (before opening)', () => {
      const date = new Date(2024, 5, 15); // June 15
      expect(isOpen(5, date)).toBe(false);
    });

    it('should return true for 22:00 in June (field open till 22:30)', () => {
      const date = new Date(2024, 5, 15); // June 15
      expect(isOpen(22, date)).toBe(true);
    });

    it('should return false for 23:00 in June (at closing)', () => {
      const date = new Date(2024, 5, 15); // June 15
      expect(isOpen(23, date)).toBe(false);
    });

    it('should return false for 7:00 in January (before opening at 8)', () => {
      const date = new Date(2024, 0, 15); // January 15
      expect(isOpen(7, date)).toBe(false);
    });

    it('should return true for 8:00 in January', () => {
      const date = new Date(2024, 0, 15); // January 15
      expect(isOpen(8, date)).toBe(true);
    });

    it('should return false for 17:00 in December (at closing)', () => {
      const date = new Date(2024, 11, 15); // December 15
      expect(isOpen(17, date)).toBe(false);
    });

    it('should return true for 16:00 in December (last open hour)', () => {
      const date = new Date(2024, 11, 15); // December 15
      expect(isOpen(16, date)).toBe(true);
    });
  });
});

describe('Cycling Score', () => {
  const createMockHourData = (overrides = {}) => ({
    dt: berlinToUnix(2024, 5, 15, 14), // June 15, 2:00 PM
    temp: 20,
    wind_speed: 2,
    pop: 0.1,
    uvi: 3,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { european_aqi: 10 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('should return high score for good cycling conditions', () => {
    const hourData = createMockHourData();
    const score = calculateCyclingScore(hourData);
    expect(score).toBeGreaterThan(70);
  });

  it('should return 0 for thunderstorm', () => {
    const hourData = createMockHourData({ hasThunderstorm: true });
    const score = calculateCyclingScore(hourData);
    expect(score).toBe(0);
  });

  it('should return 0 for closed hours', () => {
    const hourData = createMockHourData({
      dt: berlinToUnix(2024, 5, 15, 5), // 5:00 AM (closed)
    });
    const score = calculateCyclingScore(hourData);
    expect(score).toBe(0);
  });

  it('should penalize cold temperatures (< 12°C)', () => {
    const normal = calculateCyclingScore(createMockHourData({ temp: 20 }));
    const cold = calculateCyclingScore(createMockHourData({ temp: 5 }));
    expect(cold).toBeLessThan(normal);
  });

  it('should penalize very cold temperatures (0°C) heavily', () => {
    const score = calculateCyclingScore(createMockHourData({ temp: 0 }));
    expect(score).toBeLessThan(65);
  });

  it('should penalize hot temperatures (> 24°C)', () => {
    const normal = calculateCyclingScore(createMockHourData({ temp: 20 }));
    const hot = calculateCyclingScore(createMockHourData({ temp: 30 }));
    expect(hot).toBeLessThan(normal);
  });

  it('should penalize high wind speeds', () => {
    const normal = calculateCyclingScore(createMockHourData({ wind_speed: 2 }));
    const windy = calculateCyclingScore(createMockHourData({ wind_speed: 10 }));
    expect(windy).toBeLessThan(normal);
  });

  it('should penalize very high wind speeds (15 m/s) heavily', () => {
    const score = calculateCyclingScore(createMockHourData({ wind_speed: 15 }));
    expect(score).toBeLessThan(65);
  });

  it('should penalize continuously with increasing rain probability', () => {
    const low = calculateCyclingScore(createMockHourData({ pop: 0.1 }));
    const medium = calculateCyclingScore(createMockHourData({ pop: 0.5 }));
    const high = calculateCyclingScore(createMockHourData({ pop: 0.8 }));
    expect(medium).toBeLessThan(low);
    expect(high).toBeLessThan(medium);
  });

  it('should penalize even small rain probabilities (10%)', () => {
    const noPop = calculateCyclingScore(createMockHourData({ pop: 0.0 }));
    const lowPop = calculateCyclingScore(createMockHourData({ pop: 0.1 }));
    expect(lowPop).toBeLessThan(noPop);
  });

  it('should apply extra penalty for actual precipitation intensity', () => {
    const probOnly = calculateCyclingScore(createMockHourData({
      pop: 0.8,
    }));
    const withRain = calculateCyclingScore(createMockHourData({
      pop: 0.8,
      rain: { '1h': 3.0 },
    }));
    expect(withRain).toBeLessThan(probOnly);
  });

  it('should penalize poor air quality', () => {
    const normal = calculateCyclingScore(createMockHourData({ air_quality: { european_aqi: 10 } }));
    const poorAir = calculateCyclingScore(createMockHourData({ air_quality: { european_aqi: 90 } }));
    expect(poorAir).toBeLessThan(normal);
  });

  it('should penalize high UV index', () => {
    const normal = calculateCyclingScore(createMockHourData({ uvi: 2 }));
    const highUV = calculateCyclingScore(createMockHourData({ uvi: 9 }));
    expect(highUV).toBeLessThan(normal);
  });

  it('should never return score < 0', () => {
    const worstCase = createMockHourData({
      temp: -10,
      wind_speed: 20,
      pop: 1.0,
      uvi: 11,
      air_quality: { european_aqi: 90 },
      rain: { '1h': 10 },
      weather: [{ main: 'Rain', description: 'heavy rain' }],
    });
    const score = calculateCyclingScore(worstCase);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should never return score > 100', () => {
    const score = calculateCyclingScore(createMockHourData());
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('Jogging Score', () => {
  const createMockHourData = (overrides = {}) => ({
    dt: berlinToUnix(2024, 5, 15, 14),
    temp: 15,
    wind_speed: 2,
    pop: 0.1,
    uvi: 3,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { european_aqi: 10 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('should return high score for perfect jogging conditions', () => {
    const hourData = createMockHourData();
    const score = calculateJoggingScore(hourData);
    expect(score).toBeGreaterThan(85);
  });

  it('should return 0 for thunderstorm', () => {
    const hourData = createMockHourData({ hasThunderstorm: true });
    const score = calculateJoggingScore(hourData);
    expect(score).toBe(0);
  });

  it('should be more tolerant of cold than cycling (threshold: 10°C vs 12°C)', () => {
    const coldData = createMockHourData({ temp: 11 });
    const cyclingScore = calculateCyclingScore(coldData);
    const joggingScore = calculateJoggingScore(coldData);
    expect(joggingScore).toBeGreaterThan(cyclingScore);
  });

  it('should be less tolerant of heat than cycling (threshold: 22°C vs 24°C)', () => {
    // Use weekday off-peak to isolate heat penalty from crowd effects
    const hotData = createMockHourData({
      temp: 30,
      dt: berlinToUnix(2024, 5, 12, 8), // Wednesday 8AM
    });
    const cyclingScore = calculateCyclingScore(hotData);
    const joggingScore = calculateJoggingScore(hotData);
    expect(joggingScore).toBeLessThan(cyclingScore);
  });

  it('should penalize heat heavily (> 22°C)', () => {
    const normal = calculateJoggingScore(createMockHourData({ temp: 15 }));
    const hot = calculateJoggingScore(createMockHourData({ temp: 30 }));
    expect(hot).toBeLessThan(normal - 20);
  });

  it('should be more tolerant of wind than cycling', () => {
    const windyData = createMockHourData({ wind_speed: 6 });
    const cyclingScore = calculateCyclingScore(windyData);
    const joggingScore = calculateJoggingScore(windyData);
    expect(joggingScore).toBeGreaterThanOrEqual(cyclingScore);
  });

  it('should have lower rain penalty than cycling at same probability', () => {
    const rainyData = createMockHourData({ pop: 0.8 });
    const cyclingScore = calculateCyclingScore(rainyData);
    const joggingScore = calculateJoggingScore(rainyData);
    expect(joggingScore).toBeGreaterThan(cyclingScore);
  });

  it('should penalize rain continuously', () => {
    const low = calculateJoggingScore(createMockHourData({ pop: 0.2 }));
    const high = calculateJoggingScore(createMockHourData({ pop: 0.8 }));
    expect(high).toBeLessThan(low);
  });

  it('should penalize high UV index significantly', () => {
    const normal = calculateJoggingScore(createMockHourData({ uvi: 2 }));
    const highUV = calculateJoggingScore(createMockHourData({ uvi: 10 }));
    expect(highUV).toBeLessThan(normal - 15);
  });
});

describe('Kiting Score', () => {
  const createMockHourData = (overrides = {}) => ({
    dt: berlinToUnix(2024, 5, 15, 14),
    temp: 18,
    wind_speed: 8, // Ideal for kiting
    pop: 0.1,
    uvi: 4,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { european_aqi: 10 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('should return high score for ideal kiting conditions (7-9 m/s wind)', () => {
    // Use weekday off-peak to reduce crowd penalty (kiting has highest crowd multiplier)
    const hourData = createMockHourData({
      wind_speed: 8,
      dt: berlinToUnix(2024, 5, 12, 8), // Wednesday 8AM
    });
    const score = calculateKitingScore(hourData);
    expect(score).toBeGreaterThan(70);
  });

  it('should return 0 for thunderstorm (extremely dangerous)', () => {
    const hourData = createMockHourData({ hasThunderstorm: true });
    const score = calculateKitingScore(hourData);
    expect(score).toBe(0);
  });

  it('should heavily penalize too little wind (< 5 m/s)', () => {
    const noWind = calculateKitingScore(createMockHourData({ wind_speed: 2 }));
    const goodWind = calculateKitingScore(createMockHourData({ wind_speed: 8 }));
    expect(noWind).toBeLessThan(goodWind - 40); // -50 penalty
  });

  it('should NOT penalize workable wind range (5-11 m/s)', () => {
    const wind5 = calculateKitingScore(createMockHourData({ wind_speed: 5 }));
    const wind8 = calculateKitingScore(createMockHourData({ wind_speed: 8 }));
    const wind11 = calculateKitingScore(createMockHourData({ wind_speed: 11 }));

    expect(wind5).toBeGreaterThan(60);
    expect(wind8).toBeGreaterThan(60);
    expect(wind11).toBeGreaterThan(60);
  });

  it('should penalize dangerous wind (11-13 m/s)', () => {
    const good = calculateKitingScore(createMockHourData({ wind_speed: 9 }));
    const dangerous = calculateKitingScore(createMockHourData({ wind_speed: 12 }));
    expect(dangerous).toBeLessThan(good);
  });

  it('should heavily penalize very dangerous wind (> 13 m/s)', () => {
    const good = calculateKitingScore(createMockHourData({ wind_speed: 9 }));
    const veryDangerous = calculateKitingScore(createMockHourData({ wind_speed: 15 }));
    expect(veryDangerous).toBeLessThan(good - 40); // -50 penalty
  });

  it('should be sensitive to cold (threshold: 10°C)', () => {
    const normal = calculateKitingScore(createMockHourData({ temp: 15 }));
    const cold = calculateKitingScore(createMockHourData({ temp: 0 }));
    expect(cold).toBeLessThan(normal);
  });

  it('should penalize extreme heat continuously (no step at 30°C)', () => {
    const at29 = calculateKitingScore(createMockHourData({ temp: 29.9 }));
    const at31 = calculateKitingScore(createMockHourData({ temp: 30.1 }));
    const at36 = calculateKitingScore(createMockHourData({ temp: 36 }));
    expect(at29 - at31).toBeLessThanOrEqual(1);
    expect(at36).toBeLessThan(at29);
  });

  it('should have highest crowd penalty multiplier', () => {
    expect(SCORING_CONFIG.kiting.crowd.multiplier).toBeGreaterThan(SCORING_CONFIG.cycling.crowd.multiplier);
    expect(SCORING_CONFIG.kiting.crowd.multiplier).toBeGreaterThan(SCORING_CONFIG.jogging.crowd.multiplier);
  });

  it('should penalize rain continuously', () => {
    const low = calculateKitingScore(createMockHourData({ pop: 0.1 }));
    const high = calculateKitingScore(createMockHourData({ pop: 0.8 }));
    expect(high).toBeLessThan(low);
  });
});

describe('Socializing Score', () => {
  const createMockHourData = (overrides = {}) => ({
    dt: berlinToUnix(2024, 5, 15, 14),
    temp: 22,
    wind_speed: 2,
    pop: 0.05,
    uvi: 3,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { european_aqi: 10 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('should return high score for good picnic conditions', () => {
    const hourData = createMockHourData();
    const score = calculateSocializingScore(hourData);
    expect(score).toBeGreaterThan(70);
  });

  it('should return 0 for thunderstorm', () => {
    const hourData = createMockHourData({ hasThunderstorm: true });
    const score = calculateSocializingScore(hourData);
    expect(score).toBe(0);
  });

  it('should have highest rain penalty of all activities', () => {
    const rainyData = createMockHourData({ pop: 0.8 });
    const cyclingScore = calculateCyclingScore(rainyData);
    const socializingScore = calculateSocializingScore(rainyData);
    expect(socializingScore).toBeLessThan(cyclingScore);
  });

  it('should penalize rain continuously with every % of probability', () => {
    const noPop = calculateSocializingScore(createMockHourData({ pop: 0.0 }));
    const lowPop = calculateSocializingScore(createMockHourData({ pop: 0.1 }));
    const medPop = calculateSocializingScore(createMockHourData({ pop: 0.5 }));
    const highPop = calculateSocializingScore(createMockHourData({ pop: 0.9 }));
    expect(lowPop).toBeLessThan(noPop);
    expect(medPop).toBeLessThan(lowPop);
    expect(highPop).toBeLessThan(medPop);
  });

  it('should be most sensitive to cold (threshold: 15°C)', () => {
    const coldData = createMockHourData({ temp: 12 });
    const cyclingScore = calculateCyclingScore(coldData);
    const joggingScore = calculateJoggingScore(coldData);
    const socializingScore = calculateSocializingScore(coldData);
    expect(socializingScore).toBeLessThan(cyclingScore);
    expect(socializingScore).toBeLessThan(joggingScore);
  });

  it('should heavily penalize very cold temperatures (< 5°C)', () => {
    const normal = calculateSocializingScore(createMockHourData({ temp: 20 }));
    const freezing = calculateSocializingScore(createMockHourData({ temp: 0 }));
    expect(freezing).toBeLessThan(normal);
    expect(freezing).toBeLessThan(65);
  });

  it('should penalize wind (affects picnic setup)', () => {
    const calm = calculateSocializingScore(createMockHourData({ wind_speed: 1 }));
    const windy = calculateSocializingScore(createMockHourData({ wind_speed: 10 }));
    expect(windy).toBeLessThan(calm);
  });

  it('should penalize high UV significantly (sun exposure while sitting)', () => {
    const normal = calculateSocializingScore(createMockHourData({ uvi: 2 }));
    const highUV = calculateSocializingScore(createMockHourData({ uvi: 10 }));
    expect(highUV).toBeLessThan(normal - 20);
  });

  it('should be tolerant of moderate heat (threshold: 28°C)', () => {
    const data25C = createMockHourData({ temp: 25 });
    const score = calculateSocializingScore(data25C);
    expect(score).toBeGreaterThan(70);
  });

  it('should penalize extreme heat (> 28°C)', () => {
    const normal = calculateSocializingScore(createMockHourData({ temp: 22 }));
    const hot = calculateSocializingScore(createMockHourData({ temp: 35 }));
    expect(hot).toBeLessThan(normal);
  });
});

describe('Edge Cases and Bounds', () => {
  const createMockHourData = (overrides = {}) => ({
    dt: berlinToUnix(2024, 5, 15, 14),
    temp: 20,
    wind_speed: 5,
    pop: 0.1,
    uvi: 3,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { european_aqi: 10 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('all scoring functions should handle missing air quality data', () => {
    const noAQI = createMockHourData({ air_quality: undefined });

    expect(() => calculateCyclingScore(noAQI)).not.toThrow();
    expect(() => calculateJoggingScore(noAQI)).not.toThrow();
    expect(() => calculateKitingScore(noAQI)).not.toThrow();
    expect(() => calculateSocializingScore(noAQI)).not.toThrow();
  });

  it('all scoring functions should handle missing UV data', () => {
    const noUV = createMockHourData({ uvi: undefined });

    expect(() => calculateCyclingScore(noUV)).not.toThrow();
    expect(() => calculateJoggingScore(noUV)).not.toThrow();
    expect(() => calculateKitingScore(noUV)).not.toThrow();
    expect(() => calculateSocializingScore(noUV)).not.toThrow();
  });

  it('all scoring functions should handle missing clouds data', () => {
    const noClouds = createMockHourData({ clouds: undefined });

    expect(() => calculateCyclingScore(noClouds)).not.toThrow();
    expect(() => calculateJoggingScore(noClouds)).not.toThrow();
    expect(() => calculateKitingScore(noClouds)).not.toThrow();
    expect(() => calculateSocializingScore(noClouds)).not.toThrow();
  });

  it('all scoring functions should return integer scores', () => {
    const data = createMockHourData();

    expect(Number.isInteger(calculateCyclingScore(data))).toBe(true);
    expect(Number.isInteger(calculateJoggingScore(data))).toBe(true);
    expect(Number.isInteger(calculateKitingScore(data))).toBe(true);
    expect(Number.isInteger(calculateSocializingScore(data))).toBe(true);
  });

  it('all scoring functions should bound scores between 0 and 100', () => {
    const extremeData = createMockHourData({
      temp: -20,
      wind_speed: 25,
      pop: 1.0,
      uvi: 15,
      air_quality: { european_aqi: 90 },
      rain: { '1h': 10 },
      weather: [{ main: 'Rain', description: 'heavy rain' }],
    });

    const scores = [
      calculateCyclingScore(extremeData),
      calculateJoggingScore(extremeData),
      calculateKitingScore(extremeData),
      calculateSocializingScore(extremeData),
    ];

    scores.forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('all scoring functions should handle extreme positive values', () => {
    const extremeGood = createMockHourData({
      temp: 20,
      wind_speed: 0,
      pop: 0,
      uvi: 0,
      air_quality: { european_aqi: 10 },
    });

    const scores = [
      calculateCyclingScore(extremeGood),
      calculateJoggingScore(extremeGood),
      calculateSocializingScore(extremeGood),
    ];

    scores.forEach(score => {
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('rain penalty should scale from 0 at pop=0 to max at pop=1', () => {
    const zeroPop = createMockHourData({ pop: 0.0 });
    const fullPop = createMockHourData({ pop: 1.0 });
    const zeroScore = calculateCyclingScore(zeroPop);
    const fullScore = calculateCyclingScore(fullPop);
    // Full probability should have much lower score
    expect(fullScore).toBeLessThan(zeroScore - 30);
  });

  it('precipitation intensity should add penalty beyond probability alone', () => {
    const probOnly = createMockHourData({ pop: 0.6 });
    const withIntensity = createMockHourData({ pop: 0.6, rain: { '1h': 5.0 } });
    expect(calculateCyclingScore(withIntensity)).toBeLessThan(calculateCyclingScore(probOnly));
  });
});

// ============================================================================
// Behaviour added with the scoring engine refactor
// ============================================================================

const ACTIVITIES: Activity[] = ['cycling', 'jogging', 'kiting', 'socializing'];

const hour = (overrides: Partial<HourData> = {}): HourData => ({
  dt: berlinToUnix(2026, 5, 16, 10), // Tuesday June 16, 10:00 Berlin (quiet field)
  temp: 20,
  wind_speed: 2,
  wind_gust: 4,
  pop: 0,
  uvi: 2,
  clouds: 20,
  weather: [{ main: 'Clear', description: 'clear sky' }],
  air_quality: { european_aqi: 10 },
  hasThunderstorm: false,
  ...overrides,
});

describe('Score breakdown', () => {
  it('score equals 100 minus the listed penalties (within rounding)', () => {
    for (const activity of ACTIVITIES) {
      const b = scoreHour(activity, hour({ pop: 0.4, wind_speed: 7, temp: 9, uvi: 6, clouds: 90 }));
      const total = b.penalties.reduce((s, p) => s + p.points, 0);
      expect(Math.abs(b.score - (100 - total))).toBeLessThanOrEqual(0.5);
    }
  });

  it('lists penalties largest first and only non-zero ones', () => {
    const b = scoreHour('cycling', hour({ pop: 0.8, wind_speed: 6 }));
    expect(b.penalties.length).toBeGreaterThan(0);
    for (let i = 1; i < b.penalties.length; i++) {
      expect(b.penalties[i - 1]!.points).toBeGreaterThanOrEqual(b.penalties[i]!.points);
    }
    expect(b.penalties.every(p => p.points > 0)).toBe(true);
    expect(b.penalties[0]!.factor).toBe('rain');
  });

  it('reports closed and thunderstorm status with no penalties', () => {
    expect(scoreHour('cycling', hour({ dt: berlinToUnix(2026, 5, 16, 3) })).status).toBe('closed');
    const storm = scoreHour('cycling', hour({ hasThunderstorm: true }));
    expect(storm.status).toBe('thunderstorm');
    expect(storm.score).toBe(0);
    expect(storm.penalties).toEqual([]);
  });

  it('a perfect quiet hour scores (close to) 100 for every activity', () => {
    for (const activity of ACTIVITIES) {
      const ideal = hour({ wind_speed: activity === 'kiting' ? 8 : 1, wind_gust: activity === 'kiting' ? 11 : 2 });
      expect(scoreHour(activity, ideal).score).toBeGreaterThanOrEqual(95);
    }
  });
});

describe('Timezone independence', () => {
  it('uses Berlin opening hours regardless of the machine timezone', () => {
    // 05:00 Berlin in June is closed, 06:00 is open - in UTC those are 03:00/04:00.
    expect(isOpenAt(berlinToUnix(2026, 5, 16, 5))).toBe(false);
    expect(isOpenAt(berlinToUnix(2026, 5, 16, 6))).toBe(true);
    expect(isOpenAt(berlinToUnix(2026, 5, 16, 22))).toBe(true);
    expect(isOpenAt(berlinToUnix(2026, 5, 16, 23))).toBe(false);
  });
});

describe('Kiting wind (continuous)', () => {
  const w = SCORING_CONFIG.kiting.wind;

  it('has no cliff at the edges of the workable range', () => {
    expect(kitingWindPenalty(4.9, w) - kitingWindPenalty(5, w)).toBeLessThan(2);
    expect(kitingWindPenalty(11.1, w) - kitingWindPenalty(11, w)).toBeLessThan(2);
  });

  it('is unkiteable without wind and in a gale (score 0)', () => {
    expect(calculateKitingScore(hour({ wind_speed: 0, wind_gust: 0 }))).toBe(0);
    expect(calculateKitingScore(hour({ wind_speed: 20, wind_gust: 28 }))).toBe(0);
  });

  it('gets monotonically worse moving away from the workable range', () => {
    const light = [5, 4, 3, 2, 1].map(s => kitingWindPenalty(s, w));
    const strong = [11, 12, 13, 14, 15].map(s => kitingWindPenalty(s, w));
    for (let i = 1; i < 5; i++) {
      expect(light[i]).toBeGreaterThan(light[i - 1]!);
      expect(strong[i]).toBeGreaterThan(strong[i - 1]!);
    }
  });

  it('penalizes gusty wind even when the mean is ideal', () => {
    const steady = calculateKitingScore(hour({ wind_speed: 8, wind_gust: 11 }));
    const gusty = calculateKitingScore(hour({ wind_speed: 8, wind_gust: 20 }));
    expect(gusty).toBeLessThan(steady - 20);
  });
});

describe('Picnic sunshine', () => {
  it('a sunny afternoon beats an overcast one with otherwise equal weather', () => {
    const saturday = berlinToUnix(2026, 5, 13, 15);
    const sunny = calculateSocializingScore(hour({ dt: saturday, temp: 24, clouds: 0, uvi: 6 }));
    const grey = calculateSocializingScore(hour({ dt: saturday, temp: 24, clouds: 100, uvi: 2 }));
    expect(sunny).toBeGreaterThan(grey);
  });

  it('does not apply the overcast penalty after sunset', () => {
    // Oct 16 2026: sunset ~18:12; 18:00 slot midpoint is after sunset
    const evening = scoreHour('socializing', hour({ dt: berlinToUnix(2026, 9, 16, 18), clouds: 100 }));
    expect(evening.penalties.some(p => p.factor === 'overcast')).toBe(false);
  });

  it('only applies the overcast penalty to the picnic activity', () => {
    for (const activity of ['cycling', 'jogging', 'kiting'] as const) {
      expect(scoreHour(activity, hour({ clouds: 100 })).penalties.some(p => p.factor === 'overcast')).toBe(false);
    }
  });
});

describe('Air quality (European AQI)', () => {
  it('maps EAQI bands onto the 1-5 config scale', () => {
    expect(aqiLevel(0)).toBe(1);
    expect(aqiLevel(20)).toBe(1);
    expect(aqiLevel(40)).toBe(2);
    expect(aqiLevel(60)).toBe(3);
    expect(aqiLevel(80)).toBe(4);
  });

  it('applies no penalty in the "good" band and none when data is missing', () => {
    const good = scoreHour('cycling', hour({ air_quality: { european_aqi: 15 } }));
    const missing = scoreHour('cycling', hour({ air_quality: undefined }));
    expect(good.penalties.some(p => p.factor === 'airQuality')).toBe(false);
    expect(missing.penalties.some(p => p.factor === 'airQuality')).toBe(false);
  });

  it('caps the penalty at maxPenalty even for extreme pollution', () => {
    const b = scoreHour('cycling', hour({ air_quality: { european_aqi: 300 } }));
    const aq = b.penalties.find(p => p.factor === 'airQuality')!;
    expect(aq.points).toBeLessThanOrEqual(SCORING_CONFIG.cycling.airQuality.maxPenalty);
  });
});

describe('explainActivity', () => {
  it('generates an explanation for every activity from the live config', () => {
    for (const activity of ACTIVITIES) {
      const rows = explainActivity(activity);
      expect(rows.map(r => r.title)).toEqual(expect.arrayContaining(['Thunderstorm', 'Rain', 'Wind', 'Crowds', 'Cold']));
      expect(rows.every(r => r.rule.length > 0 && r.examples.length > 0)).toBe(true);
    }
  });

  it('quotes the same rain numbers the engine applies', () => {
    const rain = explainActivity('cycling').find(r => r.title === 'Rain')!;
    const expected = Math.round(Math.pow(0.5, SCORING_CONFIG.cycling.rain.exponent) * SCORING_CONFIG.cycling.rain.maxPenalty);
    expect(rain.examples).toContain(`50% = -${expected}`);
  });
});
