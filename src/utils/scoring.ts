/**
 * Scoring utilities for Tempelhofer Feld Activity Forecast
 * Extracted from App.jsx for testability
 * TypeScript version with full type safety
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface MonthlyOpeningHours {
  /** Monthly opening hours, index 0 = January, 11 = December */
  months: OpeningHours[];
}

export interface RainConfig {
  maxPenalty: number;     // Total max penalty at 100% probability (e.g., 55)
  exponent: number;       // How aggressively penalty scales with probability (>1 = steeper at high end)
  intensityMax: number;   // Additional max penalty from actual precipitation intensity
  intensityScale: number; // Precipitation mm/h at which intensity penalty is maxed out
}

export interface StandardWindConfig {
  threshold: number;
  maxPenalty: number;
  range: number;
  exponent: number;
}

export interface KitingWindConfig {
  tooLightPenalty: number;
  tooLightThreshold: number;
  optimalMin: number;
  optimalMax: number;
  workableMin: number;
  workableMax: number;
  dangerousMin: number;
  dangerousMax: number;
  dangerousPenalty: number;
  veryDangerousPenalty: number;
  veryDangerousThreshold: number;
}

export interface CrowdConfig {
  multiplier: number;
}

export interface TempConfig {
  threshold: number;
  maxPenalty: number;
  range: number;
  exponent: number;
}

export interface FlatTempConfig {
  threshold: number;
  flatPenalty: number;
}

export interface AirQualityConfig {
  threshold: number;
  maxPenalty: number;
  range: number;
  exponent: number;
}

export interface UVConfig {
  threshold: number;
  maxPenalty: number;
  range: number;
  exponent: number;
}

export interface StandardActivityConfig {
  rain: RainConfig;
  wind: StandardWindConfig;
  crowd: CrowdConfig;
  cold: TempConfig;
  heat: TempConfig;
  airQuality: AirQualityConfig;
  uv: UVConfig;
}

export interface KitingActivityConfig {
  rain: RainConfig;
  wind: KitingWindConfig;
  crowd: CrowdConfig;
  cold: TempConfig;
  heat: FlatTempConfig;
  airQuality: AirQualityConfig;
  uv: UVConfig;
}

export interface ScoringConfig {
  cycling: StandardActivityConfig;
  jogging: StandardActivityConfig;
  kiting: KitingActivityConfig;
  socializing: StandardActivityConfig;
}

export interface WeatherCondition {
  main: string;
  description: string;
}

export interface AirQuality {
  aqi: number;
}

export interface HourData {
  dt: number;
  temp: number;
  feels_like?: number;
  pressure?: number;
  humidity?: number;
  dew_point?: number;
  uvi?: number;
  clouds?: number;
  visibility?: number;
  wind_speed: number;
  wind_deg?: number;
  wind_gust?: number;
  weather: WeatherCondition[];
  pop: number;
  rain?: { '1h': number };
  air_quality?: AirQuality;
  hasThunderstorm: boolean;
}

export interface OpeningHours {
  open: number;
  close: number;
}

// ============================================================================
// Configuration
// ============================================================================

// Real monthly opening hours for Tempelhofer Feld (source: tempelhoferfeld.de)
// Hours follow sunrise/sunset and change monthly
// Open values rounded up and close values rounded up to nearest full hour
// (since we score hourly, an hour is "open" if the field is open for most of it)
export const OPENING_HOURS_CONFIG: MonthlyOpeningHours = {
  months: [
    { open: 8,  close: 17 },  // January:   7:30 - 17:00
    { open: 7,  close: 18 },  // February:  7:00 - 18:00
    { open: 6,  close: 19 },  // March:     6:00 - 19:00
    { open: 6,  close: 21 },  // April:     6:00 - 20:30
    { open: 6,  close: 22 },  // May:       6:00 - 21:30
    { open: 6,  close: 23 },  // June:      6:00 - 22:30
    { open: 6,  close: 23 },  // July:      6:00 - 22:30
    { open: 6,  close: 22 },  // August:    6:00 - 21:30
    { open: 6,  close: 21 },  // September: 6:00 - 20:30
    { open: 7,  close: 19 },  // October:   7:00 - 19:00
    { open: 7,  close: 18 },  // November:  7:00 - 18:00
    { open: 8,  close: 17 },  // December:  7:30 - 17:00
  ]
};

// Scoring configuration for each activity
// Rain: fully continuous based on probability (every % counts), plus intensity bonus
// Old system had binary "is raining" check; new system uses pop as sole driver
export const SCORING_CONFIG: ScoringConfig = {
  cycling: {
    rain: { maxPenalty: 55, exponent: 1.3, intensityMax: 10, intensityScale: 5 },
    wind: { threshold: 3, maxPenalty: 40, range: 7, exponent: 1.3 },
    crowd: { multiplier: 0.25 },
    cold: { threshold: 12, maxPenalty: 40, range: 12, exponent: 1.2 },
    heat: { threshold: 24, maxPenalty: 30, range: 11, exponent: 1.3 },
    airQuality: { threshold: 1, maxPenalty: 35, range: 4, exponent: 1.4 },
    uv: { threshold: 3, maxPenalty: 20, range: 6, exponent: 1.2 }
  },
  jogging: {
    rain: { maxPenalty: 32, exponent: 1.3, intensityMax: 8, intensityScale: 5 },
    wind: { threshold: 5, maxPenalty: 15, range: 8, exponent: 1.2 },
    crowd: { multiplier: 0.1 },
    cold: { threshold: 10, maxPenalty: 20, range: 10, exponent: 1.1 },
    heat: { threshold: 22, maxPenalty: 35, range: 10, exponent: 1.4 },
    airQuality: { threshold: 1, maxPenalty: 35, range: 4, exponent: 1.4 },
    uv: { threshold: 3, maxPenalty: 25, range: 7, exponent: 1.3 }
  },
  kiting: {
    rain: { maxPenalty: 40, exponent: 1.3, intensityMax: 8, intensityScale: 5 },
    wind: {
      tooLightPenalty: -50, tooLightThreshold: 5,      // < 5 m/s: Too light
      optimalMin: 7, optimalMax: 9,                     // 7-9 m/s: Sweet spot (no penalty)
      workableMin: 5, workableMax: 11,                  // 5-11 m/s: Workable range (no penalty)
      dangerousMin: 11, dangerousMax: 13, dangerousPenalty: -25,  // 11-13 m/s: Getting dangerous
      veryDangerousPenalty: -50, veryDangerousThreshold: 13      // > 13 m/s: Very dangerous
    },
    crowd: { multiplier: 0.35 },
    cold: { threshold: 10, maxPenalty: 40, range: 10, exponent: 1.4 },
    heat: { threshold: 30, flatPenalty: -10 },
    airQuality: { threshold: 2, maxPenalty: 15, range: 3, exponent: 1.3 },
    uv: { threshold: 4, maxPenalty: 20, range: 6, exponent: 1.2 }
  },
  socializing: {
    rain: { maxPenalty: 70, exponent: 1.4, intensityMax: 12, intensityScale: 4 },
    wind: { threshold: 3, maxPenalty: 40, range: 7, exponent: 1.3 },
    crowd: { multiplier: 0.25 },
    cold: { threshold: 15, maxPenalty: 35, range: 15, exponent: 1.3 },
    heat: { threshold: 28, maxPenalty: 20, range: 10, exponent: 1.2 },
    airQuality: { threshold: 2, maxPenalty: 20, range: 3, exponent: 1.3 },
    uv: { threshold: 3, maxPenalty: 30, range: 7, exponent: 1.3 }
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

export const getOpeningHours = (date: Date): OpeningHours => {
  const month = date.getMonth(); // 0 = January, 11 = December
  return OPENING_HOURS_CONFIG.months[month] ?? { open: 7, close: 18 };
};

export const isOpen = (hour: number, date: Date): boolean => {
  const hours = getOpeningHours(date);
  return hour >= hours.open && hour < hours.close;
};

export const calculateCrowdFactor = (
  hour: number,
  dayOfWeek: number,
  month: number,
  temp: number,
  pop: number,
  cloudCover: number
): number => {
  let crowdScore = 0;

  // Day of week: weekends much busier
  if (dayOfWeek === 0 || dayOfWeek === 6) crowdScore += 30;

  // Time of day: peak midday-afternoon, shoulders morning/evening
  if (hour >= 11 && hour <= 18) crowdScore += 25;
  else if (hour >= 9 && hour < 11) crowdScore += 15;
  else if (hour > 18 && hour <= 20) crowdScore += 15;

  // Season: summer months draw far more visitors
  // Bell curve peaking Jun-Aug (months 5-7)
  const seasonalFactors = [5, 5, 10, 15, 20, 25, 25, 25, 20, 15, 5, 5];
  crowdScore += seasonalFactors[month] ?? 5;

  // Temperature: continuous bell curve centered around 22°C
  // Peak crowd-drawing temp is ~22°C, drops off in both directions
  if (temp >= 10 && temp <= 35) {
    const tempIdeal = 22;
    const tempSpread = 12;
    const tempAttraction = Math.max(0, 1 - Math.pow((temp - tempIdeal) / tempSpread, 2));
    crowdScore += Math.round(tempAttraction * 15);
  }

  // Rain probability: continuous deterrent (higher pop = fewer people)
  // 100% rain chance scares away most people
  crowdScore -= Math.round(pop * 25);

  // Cloud cover: sunny days attract more people (0% clouds = +10, 100% = 0)
  const sunnyBonus = Math.round((1 - cloudCover / 100) * 10);
  crowdScore += sunnyBonus;

  return Math.max(0, Math.min(100, crowdScore));
};

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculate continuous rain penalty based on probability and intensity.
 * Every percentage of rain probability contributes to the penalty.
 * Actual precipitation amount adds an intensity bonus on top.
 */
const calculateRainPenalty = (pop: number, precipitationMm: number, config: RainConfig): number => {
  if (pop <= 0) return 0;

  // Probability-based penalty: continuous from 0% to 100%
  const probPenalty = Math.pow(Math.min(1, pop), config.exponent) * config.maxPenalty;

  // Intensity bonus: actual precipitation amount increases severity
  let intensityPenalty = 0;
  if (precipitationMm > 0) {
    intensityPenalty = Math.min(config.intensityMax,
      (precipitationMm / config.intensityScale) * config.intensityMax);
  }

  return probPenalty + intensityPenalty;
};

export const calculateCyclingScore = (hourData: HourData): number => {
  let score = 100;
  const date = new Date(hourData.dt * 1000);
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  const config = SCORING_CONFIG.cycling;

  if (!isOpen(hour, date)) return 0;

  // Thunderstorm penalty - CRITICAL (exposed area)
  if (hourData.hasThunderstorm || hourData.weather[0]?.main === 'Thunderstorm') {
    return 0; // Absolutely not safe
  }

  // Rain penalty - fully continuous based on probability + intensity
  const precipMm = hourData.rain?.['1h'] ?? 0;
  score -= calculateRainPenalty(hourData.pop, precipMm, config.rain);

  // Wind penalty
  const windSpeed = hourData.wind_speed;
  if (windSpeed > config.wind.threshold) {
    const windPenalty = Math.pow((windSpeed - config.wind.threshold) / config.wind.range, config.wind.exponent) * config.wind.maxPenalty;
    score -= Math.min(config.wind.maxPenalty, windPenalty);
  }

  // Crowd penalty
  const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, month, hourData.temp, hourData.pop, hourData.clouds ?? 50);
  score -= (crowdFactor * config.crowd.multiplier);

  // Temperature penalties
  const temp = hourData.temp;

  // Cold penalty
  if (temp < config.cold.threshold) {
    const coldPenalty = Math.pow((config.cold.threshold - temp) / config.cold.range, config.cold.exponent) * config.cold.maxPenalty;
    score -= Math.min(config.cold.maxPenalty, coldPenalty);
  }

  // Heat penalty
  if (temp > config.heat.threshold) {
    const hotPenalty = Math.pow((temp - config.heat.threshold) / config.heat.range, config.heat.exponent) * config.heat.maxPenalty;
    score -= Math.min(config.heat.maxPenalty, hotPenalty);
  }

  // Air Quality penalty
  if (hourData.air_quality && hourData.air_quality.aqi) {
    const aqi = hourData.air_quality.aqi;
    if (aqi > config.airQuality.threshold) {
      const aqiPenalty = Math.pow((aqi - config.airQuality.threshold) / config.airQuality.range, config.airQuality.exponent) * config.airQuality.maxPenalty;
      score -= aqiPenalty;
    }
  }

  // UV Index penalty
  if (hourData.uvi !== undefined) {
    const uvi = hourData.uvi;
    if (uvi > config.uv.threshold) {
      const uvPenalty = Math.pow((uvi - config.uv.threshold) / config.uv.range, config.uv.exponent) * config.uv.maxPenalty;
      score -= Math.min(config.uv.maxPenalty, uvPenalty);
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const calculateJoggingScore = (hourData: HourData): number => {
  let score = 100;
  const date = new Date(hourData.dt * 1000);
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  const config = SCORING_CONFIG.jogging;

  if (!isOpen(hour, date)) return 0;

  // Thunderstorm penalty - CRITICAL (exposed area)
  if (hourData.hasThunderstorm || hourData.weather[0]?.main === 'Thunderstorm') {
    return 0; // Absolutely not safe
  }

  // Rain penalty - fully continuous based on probability + intensity
  const precipMm = hourData.rain?.['1h'] ?? 0;
  score -= calculateRainPenalty(hourData.pop, precipMm, config.rain);

  // Wind penalty
  const windSpeed = hourData.wind_speed;
  if (windSpeed > config.wind.threshold) {
    const windPenalty = Math.pow((windSpeed - config.wind.threshold) / config.wind.range, config.wind.exponent) * config.wind.maxPenalty;
    score -= Math.min(config.wind.maxPenalty, windPenalty);
  }

  // Crowd penalty
  const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, month, hourData.temp, hourData.pop, hourData.clouds ?? 50);
  score -= (crowdFactor * config.crowd.multiplier);

  // Temperature penalties
  const temp = hourData.temp;

  // Cold penalty
  if (temp < config.cold.threshold) {
    const coldPenalty = Math.pow((config.cold.threshold - temp) / config.cold.range, config.cold.exponent) * config.cold.maxPenalty;
    score -= Math.min(config.cold.maxPenalty, coldPenalty);
  }

  // Heat penalty
  if (temp > config.heat.threshold) {
    const hotPenalty = Math.pow((temp - config.heat.threshold) / config.heat.range, config.heat.exponent) * config.heat.maxPenalty;
    score -= Math.min(config.heat.maxPenalty, hotPenalty);
  }

  // Air Quality penalty
  if (hourData.air_quality && hourData.air_quality.aqi) {
    const aqi = hourData.air_quality.aqi;
    if (aqi > config.airQuality.threshold) {
      const aqiPenalty = Math.pow((aqi - config.airQuality.threshold) / config.airQuality.range, config.airQuality.exponent) * config.airQuality.maxPenalty;
      score -= aqiPenalty;
    }
  }

  // UV Index penalty
  if (hourData.uvi !== undefined) {
    const uvi = hourData.uvi;
    if (uvi > config.uv.threshold) {
      const uvPenalty = Math.pow((uvi - config.uv.threshold) / config.uv.range, config.uv.exponent) * config.uv.maxPenalty;
      score -= Math.min(config.uv.maxPenalty, uvPenalty);
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const calculateKitingScore = (hourData: HourData): number => {
  let score = 100;
  const date = new Date(hourData.dt * 1000);
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  const config = SCORING_CONFIG.kiting;

  if (!isOpen(hour, date)) return 0;

  // Thunderstorm penalty - EXTREMELY CRITICAL for kiting (metal frame + lightning)
  if (hourData.hasThunderstorm || hourData.weather[0]?.main === 'Thunderstorm') {
    return 0; // Deadly combination
  }

  // Wind - CRITICAL for kiting! Need wind but not too much
  const windSpeed = hourData.wind_speed;
  const w = config.wind;
  if (windSpeed < w.tooLightThreshold) {
    // < 5 m/s: Too light, insufficient power
    score += w.tooLightPenalty;
  } else if (windSpeed >= w.workableMin && windSpeed <= w.workableMax) {
    // 5-11 m/s: Workable range (no penalty, this is good!)
    // No adjustment needed - this is the ideal range
  } else if (windSpeed > w.dangerousMin && windSpeed <= w.dangerousMax) {
    // 11-13 m/s: Getting dangerous
    score += w.dangerousPenalty;
  } else if (windSpeed > w.veryDangerousThreshold) {
    // > 13 m/s: Very dangerous
    score += w.veryDangerousPenalty;
  }

  // Rain penalty - fully continuous based on probability + intensity
  const precipMm = hourData.rain?.['1h'] ?? 0;
  score -= calculateRainPenalty(hourData.pop, precipMm, config.rain);

  // Crowd penalty
  const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, month, hourData.temp, hourData.pop, hourData.clouds ?? 50);
  score -= (crowdFactor * config.crowd.multiplier);

  // Temperature penalties
  const temp = hourData.temp;

  // Cold penalty
  if (temp < config.cold.threshold) {
    const coldPenalty = Math.pow((config.cold.threshold - temp) / config.cold.range, config.cold.exponent) * config.cold.maxPenalty;
    score -= Math.min(config.cold.maxPenalty, coldPenalty);
  } else if (temp > config.heat.threshold) {
    score += config.heat.flatPenalty;
  }

  // Air Quality penalty
  if (hourData.air_quality && hourData.air_quality.aqi) {
    const aqi = hourData.air_quality.aqi;
    if (aqi > config.airQuality.threshold) {
      const aqiPenalty = Math.pow((aqi - config.airQuality.threshold) / config.airQuality.range, config.airQuality.exponent) * config.airQuality.maxPenalty;
      score -= aqiPenalty;
    }
  }

  // UV Index penalty
  if (hourData.uvi !== undefined) {
    const uvi = hourData.uvi;
    if (uvi > config.uv.threshold) {
      const uvPenalty = Math.pow((uvi - config.uv.threshold) / config.uv.range, config.uv.exponent) * config.uv.maxPenalty;
      score -= Math.min(config.uv.maxPenalty, uvPenalty);
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

export const calculateSocializingScore = (hourData: HourData): number => {
  let score = 100;
  const date = new Date(hourData.dt * 1000);
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  const config = SCORING_CONFIG.socializing;

  if (!isOpen(hour, date)) return 0;

  // Thunderstorm penalty - ruins everything
  if (hourData.hasThunderstorm || hourData.weather[0]?.main === 'Thunderstorm') {
    return 0; // Pack up and go home
  }

  // Rain penalty - fully continuous based on probability + intensity
  const precipMm = hourData.rain?.['1h'] ?? 0;
  score -= calculateRainPenalty(hourData.pop, precipMm, config.rain);

  // Wind penalty
  const windSpeed = hourData.wind_speed;
  if (windSpeed > config.wind.threshold) {
    const windPenalty = Math.pow((windSpeed - config.wind.threshold) / config.wind.range, config.wind.exponent) * config.wind.maxPenalty;
    score -= Math.min(config.wind.maxPenalty, windPenalty);
  }

  // Crowd penalty (mild for socializing - crowds less of an issue)
  const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, month, hourData.temp, hourData.pop, hourData.clouds ?? 50);
  score -= (crowdFactor * config.crowd.multiplier);

  // Temperature penalties
  const temp = hourData.temp;

  // Cold penalty
  if (temp < config.cold.threshold) {
    const coldPenalty = Math.pow((config.cold.threshold - temp) / config.cold.range, config.cold.exponent) * config.cold.maxPenalty;
    score -= Math.min(config.cold.maxPenalty, coldPenalty);
  }

  // Heat penalty
  if (temp > config.heat.threshold) {
    const hotPenalty = Math.pow((temp - config.heat.threshold) / config.heat.range, config.heat.exponent) * config.heat.maxPenalty;
    score -= Math.min(config.heat.maxPenalty, hotPenalty);
  }

  // Air Quality penalty
  if (hourData.air_quality && hourData.air_quality.aqi) {
    const aqi = hourData.air_quality.aqi;
    if (aqi > config.airQuality.threshold) {
      const aqiPenalty = Math.pow((aqi - config.airQuality.threshold) / config.airQuality.range, config.airQuality.exponent) * config.airQuality.maxPenalty;
      score -= aqiPenalty;
    }
  }

  // UV Index penalty
  if (hourData.uvi !== undefined) {
    const uvi = hourData.uvi;
    if (uvi > config.uv.threshold) {
      const uvPenalty = Math.pow((uvi - config.uv.threshold) / config.uv.range, config.uv.exponent) * config.uv.maxPenalty;
      score -= Math.min(config.uv.maxPenalty, uvPenalty);
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};
