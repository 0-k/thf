import { describe, it, expect } from 'vitest';
import {
  SCORING_CONFIG,
  OPENING_HOURS_CONFIG,
  getOpeningHours,
  isOpen,
  calculateCrowdFactor,
  calculateCyclingScore,
  calculateJoggingScore,
  calculateKitingScore,
  calculateSocializingScore,
} from './scoring';

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
      const date = new Date(2024, 9, 1); // October 1
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

describe('Crowd Factor Calculation', () => {
  // New signature: (hour, dayOfWeek, month, temp, pop, cloudCover)
  it('should return higher crowd score on weekends', () => {
    const weekday = calculateCrowdFactor(14, 3, 5, 20, 0.1, 30); // Wednesday, June
    const weekend = calculateCrowdFactor(14, 6, 5, 20, 0.1, 30); // Saturday, June
    expect(weekend).toBeGreaterThan(weekday);
  });

  it('should return higher crowd score during peak hours (11-18)', () => {
    const morning = calculateCrowdFactor(9, 3, 5, 20, 0.1, 30);
    const peak = calculateCrowdFactor(14, 3, 5, 20, 0.1, 30);
    expect(peak).toBeGreaterThan(morning);
  });

  it('should return higher crowd score in summer months', () => {
    const winter = calculateCrowdFactor(14, 6, 0, 20, 0.1, 30); // January
    const summer = calculateCrowdFactor(14, 6, 6, 20, 0.1, 30); // July
    expect(summer).toBeGreaterThan(winter);
  });

  it('should return higher crowd score at ideal temperature (~22°C)', () => {
    const cold = calculateCrowdFactor(14, 6, 5, 5, 0.1, 30);
    const ideal = calculateCrowdFactor(14, 6, 5, 22, 0.1, 30);
    expect(ideal).toBeGreaterThan(cold);
  });

  it('should return lower crowd score with high rain probability', () => {
    const dry = calculateCrowdFactor(14, 6, 5, 20, 0.1, 30);
    const rainy = calculateCrowdFactor(14, 6, 5, 20, 0.9, 30);
    expect(rainy).toBeLessThan(dry);
  });

  it('should return higher crowd score on sunny days (low cloud cover)', () => {
    const sunny = calculateCrowdFactor(14, 6, 5, 20, 0.1, 10);
    const cloudy = calculateCrowdFactor(14, 6, 5, 20, 0.1, 90);
    expect(sunny).toBeGreaterThan(cloudy);
  });

  it('should never return negative crowd score', () => {
    const score = calculateCrowdFactor(3, 2, 0, 1, 1.0, 100); // Bad conditions
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should never exceed 100', () => {
    const score = calculateCrowdFactor(14, 6, 6, 22, 0.0, 0); // Perfect conditions
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('Cycling Score', () => {
  const createMockHourData = (overrides = {}) => ({
    dt: new Date(2024, 5, 15, 14, 0).getTime() / 1000, // June 15, 2:00 PM
    temp: 20,
    wind_speed: 2,
    pop: 0.1,
    uvi: 3,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { aqi: 1 },
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
      dt: new Date(2024, 5, 15, 5, 0).getTime() / 1000, // 5:00 AM (closed)
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
    const normal = calculateCyclingScore(createMockHourData({ air_quality: { aqi: 1 } }));
    const poorAir = calculateCyclingScore(createMockHourData({ air_quality: { aqi: 5 } }));
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
      air_quality: { aqi: 5 },
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
    dt: new Date(2024, 5, 15, 14, 0).getTime() / 1000,
    temp: 15,
    wind_speed: 2,
    pop: 0.1,
    uvi: 3,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { aqi: 1 },
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
      dt: new Date(2024, 5, 12, 8, 0).getTime() / 1000, // Wednesday 8AM
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
    dt: new Date(2024, 5, 15, 14, 0).getTime() / 1000,
    temp: 18,
    wind_speed: 8, // Ideal for kiting
    pop: 0.1,
    uvi: 4,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { aqi: 1 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('should return high score for ideal kiting conditions (7-9 m/s wind)', () => {
    // Use weekday off-peak to reduce crowd penalty (kiting has highest crowd multiplier)
    const hourData = createMockHourData({
      wind_speed: 8,
      dt: new Date(2024, 5, 12, 8, 0).getTime() / 1000, // Wednesday 8AM
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

  it('should apply flat penalty for extreme heat (> 30°C)', () => {
    expect(SCORING_CONFIG.kiting.heat.flatPenalty).toBe(-10);
    expect(SCORING_CONFIG.kiting.heat.threshold).toBe(30);
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
    dt: new Date(2024, 5, 15, 14, 0).getTime() / 1000,
    temp: 22,
    wind_speed: 2,
    pop: 0.05,
    uvi: 3,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { aqi: 1 },
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
    dt: new Date(2024, 5, 15, 14, 0).getTime() / 1000,
    temp: 20,
    wind_speed: 5,
    pop: 0.1,
    uvi: 3,
    clouds: 30,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { aqi: 1 },
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
      air_quality: { aqi: 5 },
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
      air_quality: { aqi: 1 },
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
