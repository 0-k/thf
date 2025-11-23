/**
 * Scoring utilities for Tempelhofer Feld Activity Forecast
 * Extracted from App.jsx for testability
 * TypeScript version with full type safety
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface OpeningHoursPeriod {
  name: string;
  startMonth: number;
  endMonth: number;
  open: number;
  close: number;
}

export interface OpeningHoursConfig {
  periods: OpeningHoursPeriod[];
}

export interface RainConfig {
  base: number;
  probMultiplier: number;
  threshold: number;
  exponent: number;
  maxPenalty: number;
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

// Opening hours configuration for Tempelhofer Feld
// Supports different periods throughout the year
export const OPENING_HOURS_CONFIG: OpeningHoursConfig = {
  periods: [
    {
      name: 'Summer',
      startMonth: 3,  // April (0-indexed)
      endMonth: 8,    // September (0-indexed)
      open: 6,        // 6:00 AM
      close: 22       // 10:00 PM
    },
    {
      name: 'Winter',
      startMonth: 9,  // October (0-indexed)
      endMonth: 2,    // March (0-indexed) - wraps around year
      open: 7,        // 7:00 AM
      close: 21       // 9:00 PM
    }
  ]
};

// Scoring configuration for each activity
export const SCORING_CONFIG: ScoringConfig = {
  cycling: {
    rain: { base: -40, probMultiplier: -20, threshold: 0.2, exponent: 1.5, maxPenalty: 25 },
    wind: { threshold: 3, maxPenalty: 40, range: 7, exponent: 1.3 },
    crowd: { multiplier: 0.25 },
    cold: { threshold: 12, maxPenalty: 40, range: 12, exponent: 1.2 },
    heat: { threshold: 24, maxPenalty: 30, range: 11, exponent: 1.3 },
    airQuality: { threshold: 1, maxPenalty: 35, range: 4, exponent: 1.4 },
    uv: { threshold: 3, maxPenalty: 20, range: 6, exponent: 1.2 }
  },
  jogging: {
    rain: { base: -25, probMultiplier: -12, threshold: 0.3, exponent: 1.5, maxPenalty: 18 },
    wind: { threshold: 5, maxPenalty: 15, range: 8, exponent: 1.2 },
    crowd: { multiplier: 0.1 },
    cold: { threshold: 10, maxPenalty: 20, range: 10, exponent: 1.1 },
    heat: { threshold: 22, maxPenalty: 35, range: 10, exponent: 1.4 },
    airQuality: { threshold: 1, maxPenalty: 35, range: 4, exponent: 1.4 },
    uv: { threshold: 3, maxPenalty: 25, range: 7, exponent: 1.3 }
  },
  kiting: {
    rain: { base: -30, probMultiplier: -15, threshold: 0.3, exponent: 1.5, maxPenalty: 20 },
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
    rain: { base: -60, probMultiplier: -20, threshold: 0.2, exponent: 1.6, maxPenalty: 35 },
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
  const month = date.getMonth();

  // Find the matching period for this month
  for (const period of OPENING_HOURS_CONFIG.periods) {
    // Handle periods that wrap around the year (e.g., Oct-Mar)
    if (period.startMonth <= period.endMonth) {
      // Normal period (doesn't wrap around year)
      if (month >= period.startMonth && month <= period.endMonth) {
        return { open: period.open, close: period.close };
      }
    } else {
      // Period wraps around year (e.g., startMonth=9, endMonth=2 means Oct-Mar)
      if (month >= period.startMonth || month <= period.endMonth) {
        return { open: period.open, close: period.close };
      }
    }
  }

  // Fallback (should not happen if config is complete)
  return { open: 7, close: 21 };
};

export const isOpen = (hour: number, date: Date): boolean => {
  const hours = getOpeningHours(date);
  return hour >= hours.open && hour < hours.close;
};

export const calculateCrowdFactor = (
  hour: number,
  dayOfWeek: number,
  temp: number,
  weatherCondition: string
): number => {
  let crowdScore = 0;
  if (dayOfWeek === 0 || dayOfWeek === 6) crowdScore += 30;
  if (hour >= 11 && hour <= 18) crowdScore += 25;
  else if (hour >= 9 && hour < 11) crowdScore += 15;
  else if (hour > 18 && hour <= 20) crowdScore += 15;
  if (temp > 15 && temp < 25 && !weatherCondition.includes('rain')) crowdScore += 20;
  if (weatherCondition.includes('rain') || temp < 5 || temp > 30) crowdScore -= 20;
  return Math.max(0, Math.min(100, crowdScore));
};

// ============================================================================
// Scoring Functions
// ============================================================================

export const calculateCyclingScore = (hourData: HourData): number => {
  let score = 100;
  const date = new Date(hourData.dt * 1000);
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const config = SCORING_CONFIG.cycling;

  if (!isOpen(hour, date)) return 0;

  // Thunderstorm penalty - CRITICAL (exposed area)
  if (hourData.hasThunderstorm || hourData.weather[0]?.main === 'Thunderstorm') {
    return 0; // Absolutely not safe
  }

  // Rain penalty - prioritize probability with malus for actual rain
  const pop = hourData.pop;
  if (pop > config.rain.threshold) {
    // Apply probability-based penalty
    score -= Math.pow((pop - config.rain.threshold) / (1 - config.rain.threshold), config.rain.exponent) * config.rain.maxPenalty;
  }
  // Additional penalty if actually raining
  if (hourData.weather[0]?.main.toLowerCase().includes('rain')) {
    score += config.rain.probMultiplier;
  }

  // Wind penalty
  const windSpeed = hourData.wind_speed;
  if (windSpeed > config.wind.threshold) {
    const windPenalty = Math.pow((windSpeed - config.wind.threshold) / config.wind.range, config.wind.exponent) * config.wind.maxPenalty;
    score -= Math.min(config.wind.maxPenalty, windPenalty);
  }

  // Crowd penalty
  const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0]?.main || '');
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
  const config = SCORING_CONFIG.jogging;

  if (!isOpen(hour, date)) return 0;

  // Thunderstorm penalty - CRITICAL (exposed area)
  if (hourData.hasThunderstorm || hourData.weather[0]?.main === 'Thunderstorm') {
    return 0; // Absolutely not safe
  }

  // Rain penalty - prioritize probability with malus for actual rain
  const pop = hourData.pop;
  if (pop > config.rain.threshold) {
    // Apply probability-based penalty
    score -= Math.pow((pop - config.rain.threshold) / (1 - config.rain.threshold), config.rain.exponent) * config.rain.maxPenalty;
  }
  // Additional penalty if actually raining
  if (hourData.weather[0]?.main.toLowerCase().includes('rain')) {
    score += config.rain.probMultiplier;
  }

  // Wind penalty
  const windSpeed = hourData.wind_speed;
  if (windSpeed > config.wind.threshold) {
    const windPenalty = Math.pow((windSpeed - config.wind.threshold) / config.wind.range, config.wind.exponent) * config.wind.maxPenalty;
    score -= Math.min(config.wind.maxPenalty, windPenalty);
  }

  // Crowd penalty
  const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0]?.main || '');
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

  // Rain penalty - prioritize probability with malus for actual rain
  const pop = hourData.pop;
  if (pop > config.rain.threshold) {
    // Apply probability-based penalty
    score -= Math.pow((pop - config.rain.threshold) / (1 - config.rain.threshold), config.rain.exponent) * config.rain.maxPenalty;
  }
  // Additional penalty if actually raining
  if (hourData.weather[0]?.main.toLowerCase().includes('rain')) {
    score += config.rain.probMultiplier;
  }

  // Crowd penalty
  const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0]?.main || '');
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
  const config = SCORING_CONFIG.socializing;

  if (!isOpen(hour, date)) return 0;

  // Thunderstorm penalty - ruins everything
  if (hourData.hasThunderstorm || hourData.weather[0]?.main === 'Thunderstorm') {
    return 0; // Pack up and go home
  }

  // Rain penalty - prioritize probability with malus for actual rain
  const pop = hourData.pop;
  if (pop > config.rain.threshold) {
    // Apply probability-based penalty
    score -= Math.pow((pop - config.rain.threshold) / (1 - config.rain.threshold), config.rain.exponent) * config.rain.maxPenalty;
  }
  // Additional penalty if actually raining
  if (hourData.weather[0]?.main.toLowerCase().includes('rain')) {
    score += config.rain.probMultiplier;
  }

  // Wind penalty
  const windSpeed = hourData.wind_speed;
  if (windSpeed > config.wind.threshold) {
    const windPenalty = Math.pow((windSpeed - config.wind.threshold) / config.wind.range, config.wind.exponent) * config.wind.maxPenalty;
    score -= Math.min(config.wind.maxPenalty, windPenalty);
  }

  // Crowd penalty (mild for socializing - crowds less of an issue)
  const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0]?.main || '');
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
