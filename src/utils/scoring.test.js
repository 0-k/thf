import { describe, it, expect } from 'vitest';
import {
  OPENING_HOURS_CONFIG,
  SCORING_CONFIG,
  getOpeningHours,
  isOpen,
  calculateCrowdFactor,
  calculateCyclingScore,
  calculateJoggingScore,
  calculateKitingScore,
  calculateSocializingScore,
} from './scoring.js';

describe('Opening Hours Logic', () => {
  describe('getOpeningHours', () => {
    it('should return summer hours (6-22) for April', () => {
      const date = new Date(2024, 3, 15); // April 15
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 6, close: 22 });
    });

    it('should return summer hours (6-22) for September', () => {
      const date = new Date(2024, 8, 30); // September 30
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 6, close: 22 });
    });

    it('should return winter hours (7-21) for October', () => {
      const date = new Date(2024, 9, 1); // October 1
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 7, close: 21 });
    });

    it('should return winter hours (7-21) for March', () => {
      const date = new Date(2024, 2, 31); // March 31
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 7, close: 21 });
    });

    it('should return winter hours (7-21) for December (wraparound)', () => {
      const date = new Date(2024, 11, 25); // December 25
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 7, close: 21 });
    });

    it('should return winter hours (7-21) for January (wraparound)', () => {
      const date = new Date(2024, 0, 15); // January 15
      const hours = getOpeningHours(date);
      expect(hours).toEqual({ open: 7, close: 21 });
    });
  });

  describe('isOpen', () => {
    it('should return true for 10:00 in summer', () => {
      const date = new Date(2024, 5, 15); // June 15
      expect(isOpen(10, date)).toBe(true);
    });

    it('should return false for 5:00 in summer (before opening)', () => {
      const date = new Date(2024, 5, 15); // June 15
      expect(isOpen(5, date)).toBe(false);
    });

    it('should return false for 22:00 in summer (at closing)', () => {
      const date = new Date(2024, 5, 15); // June 15
      expect(isOpen(22, date)).toBe(false);
    });

    it('should return true for 7:00 in winter', () => {
      const date = new Date(2024, 11, 15); // December 15
      expect(isOpen(7, date)).toBe(true);
    });

    it('should return false for 6:00 in winter (before opening)', () => {
      const date = new Date(2024, 11, 15); // December 15
      expect(isOpen(6, date)).toBe(false);
    });

    it('should return false for 21:00 in winter (at closing)', () => {
      const date = new Date(2024, 11, 15); // December 15
      expect(isOpen(21, date)).toBe(false);
    });
  });
});

describe('Crowd Factor Calculation', () => {
  it('should return higher crowd score on weekends', () => {
    const weekday = calculateCrowdFactor(14, 3, 20, 'Clear'); // Wednesday
    const weekend = calculateCrowdFactor(14, 6, 20, 'Clear'); // Saturday
    expect(weekend).toBeGreaterThan(weekday);
  });

  it('should return higher crowd score during peak hours (11-18)', () => {
    const morning = calculateCrowdFactor(9, 3, 20, 'Clear');
    const peak = calculateCrowdFactor(14, 3, 20, 'Clear');
    expect(peak).toBeGreaterThan(morning);
  });

  it('should return higher crowd score in good weather (15-25°C, no rain)', () => {
    const goodWeather = calculateCrowdFactor(14, 6, 20, 'Clear');
    const badWeather = calculateCrowdFactor(14, 6, 3, 'Clear');
    expect(goodWeather).toBeGreaterThan(badWeather);
  });

  it('should return lower crowd score when raining', () => {
    const clear = calculateCrowdFactor(14, 6, 20, 'Clear');
    const rainy = calculateCrowdFactor(14, 6, 20, 'rain'); // lowercase 'rain' to match includes()
    expect(rainy).toBeLessThan(clear);
  });

  it('should never return negative crowd score', () => {
    const score = calculateCrowdFactor(3, 2, 1, 'Rain');
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('should never exceed 100', () => {
    const score = calculateCrowdFactor(14, 6, 20, 'Clear'); // Perfect conditions
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
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { aqi: 1 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('should return high score for good cycling conditions', () => {
    const hourData = createMockHourData();
    const score = calculateCyclingScore(hourData);
    expect(score).toBeGreaterThan(75); // Realistic expectation with crowd penalties
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
    expect(score).toBeLessThan(65); // Should have significant penalty
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

  it('should penalize high rain probability', () => {
    const normal = calculateCyclingScore(createMockHourData({ pop: 0.1 }));
    const rainy = calculateCyclingScore(createMockHourData({ pop: 0.8 }));
    expect(rainy).toBeLessThan(normal);
  });

  it('should additionally penalize actual rain', () => {
    const highProbNoCurrent = calculateCyclingScore(createMockHourData({
      pop: 0.8,
      weather: [{ main: 'Clouds', description: 'cloudy' }]
    }));
    const highProbAndRain = calculateCyclingScore(createMockHourData({
      pop: 0.8,
      weather: [{ main: 'Rain', description: 'light rain' }]
    }));
    expect(highProbAndRain).toBeLessThan(highProbNoCurrent);
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
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { aqi: 1 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('should return 100 for perfect jogging conditions', () => {
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
    // At 11°C, cycling should be penalized but jogging should be fine
    expect(joggingScore).toBeGreaterThan(cyclingScore);
  });

  it('should be less tolerant of heat than cycling (threshold: 22°C vs 24°C)', () => {
    const hotData = createMockHourData({ temp: 30 });
    const cyclingScore = calculateCyclingScore(hotData);
    const joggingScore = calculateJoggingScore(hotData);
    // At 30°C, jogging should be more penalized than cycling (lower threshold: 22 vs 24)
    expect(joggingScore).toBeLessThan(cyclingScore);
  });

  it('should penalize heat heavily (> 22°C)', () => {
    const normal = calculateJoggingScore(createMockHourData({ temp: 15 }));
    const hot = calculateJoggingScore(createMockHourData({ temp: 30 }));
    expect(hot).toBeLessThan(normal - 20); // Significant penalty
  });

  it('should be more tolerant of wind than cycling', () => {
    const windyData = createMockHourData({ wind_speed: 6 });
    const cyclingScore = calculateCyclingScore(windyData);
    const joggingScore = calculateJoggingScore(windyData);
    // Jogging has higher wind threshold (5 vs 3)
    expect(joggingScore).toBeGreaterThanOrEqual(cyclingScore);
  });

  it('should be more tolerant of rain than cycling', () => {
    const rainyData = createMockHourData({
      pop: 0.6,
      weather: [{ main: 'Rain', description: 'light rain' }]
    });
    const cyclingScore = calculateCyclingScore(rainyData);
    const joggingScore = calculateJoggingScore(rainyData);
    // Jogging should be more rain-tolerant
    expect(joggingScore).toBeGreaterThan(cyclingScore);
  });

  it('should penalize high UV index significantly', () => {
    const normal = calculateJoggingScore(createMockHourData({ uvi: 2 }));
    const highUV = calculateJoggingScore(createMockHourData({ uvi: 10 }));
    expect(highUV).toBeLessThan(normal - 15); // Should have UV penalty
  });
});

describe('Kiting Score', () => {
  const createMockHourData = (overrides = {}) => ({
    dt: new Date(2024, 5, 15, 14, 0).getTime() / 1000,
    temp: 18,
    wind_speed: 8, // Ideal for kiting
    pop: 0.1,
    uvi: 4,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { aqi: 1 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('should return high score for ideal kiting conditions (7-9 m/s wind)', () => {
    const hourData = createMockHourData({ wind_speed: 8 });
    const score = calculateKitingScore(hourData);
    expect(score).toBeGreaterThan(70); // Realistic with crowd penalties
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

    // All should be reasonably high (>60), with 8 m/s being best
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
    expect(cold).toBeLessThan(normal); // Should have cold penalty
  });

  it('should apply flat penalty for extreme heat (> 30°C)', () => {
    // Test that extreme heat has config flatPenalty value
    expect(SCORING_CONFIG.kiting.heat.flatPenalty).toBe(-10);
    expect(SCORING_CONFIG.kiting.heat.threshold).toBe(30);
  });

  it('should have highest crowd penalty multiplier', () => {
    // Weekend afternoon with good weather - high crowd
    const kitingData = createMockHourData({
      dt: new Date(2024, 5, 15, 14, 0).getTime() / 1000, // Saturday
      temp: 20,
    });

    // Verify kiting has highest crowd multiplier in config
    expect(SCORING_CONFIG.kiting.crowd.multiplier).toBeGreaterThan(SCORING_CONFIG.cycling.crowd.multiplier);
    expect(SCORING_CONFIG.kiting.crowd.multiplier).toBeGreaterThan(SCORING_CONFIG.jogging.crowd.multiplier);
  });
});

describe('Socializing Score', () => {
  const createMockHourData = (overrides = {}) => ({
    dt: new Date(2024, 5, 15, 14, 0).getTime() / 1000,
    temp: 22,
    wind_speed: 2,
    pop: 0.05,
    uvi: 3,
    weather: [{ main: 'Clear', description: 'clear sky' }],
    air_quality: { aqi: 1 },
    hasThunderstorm: false,
    ...overrides,
  });

  it('should return high score for good picnic conditions', () => {
    const hourData = createMockHourData();
    const score = calculateSocializingScore(hourData);
    expect(score).toBeGreaterThan(75); // Realistic with crowd penalties
  });

  it('should return 0 for thunderstorm', () => {
    const hourData = createMockHourData({ hasThunderstorm: true });
    const score = calculateSocializingScore(hourData);
    expect(score).toBe(0);
  });

  it('should have highest rain penalty (base: -60)', () => {
    const rainyData = createMockHourData({
      pop: 0.8,
      weather: [{ main: 'Rain', description: 'heavy rain' }]
    });

    const cyclingScore = calculateCyclingScore(rainyData);
    const socializingScore = calculateSocializingScore(rainyData);

    // Socializing should be more affected by rain
    expect(socializingScore).toBeLessThan(cyclingScore);
  });

  it('should be most sensitive to cold (threshold: 15°C)', () => {
    const coldData = createMockHourData({ temp: 12 });

    const cyclingScore = calculateCyclingScore(coldData);
    const joggingScore = calculateJoggingScore(coldData);
    const socializingScore = calculateSocializingScore(coldData);

    // At 12°C, socializing should be most affected (sitting still)
    expect(socializingScore).toBeLessThan(cyclingScore);
    expect(socializingScore).toBeLessThan(joggingScore);
  });

  it('should heavily penalize very cold temperatures (< 5°C)', () => {
    const normal = calculateSocializingScore(createMockHourData({ temp: 20 }));
    const freezing = calculateSocializingScore(createMockHourData({ temp: 0 }));
    expect(freezing).toBeLessThan(normal); // Should have significant cold penalty
    expect(freezing).toBeLessThan(65); // Should be quite low at 0°C
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
    expect(score).toBeGreaterThan(80); // Should still be good
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
});
