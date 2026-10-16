/**
 * Scoring for Tempelhofer Feld Activity Forecast.
 *
 * Every activity starts at 100 and only loses points (penalty-only).
 * One engine scores all activities from SCORING_CONFIG and returns a
 * breakdown, so the UI can show *why* an hour scored what it did.
 */

import type { Activity, HourData, MonthlyOpeningHours, OpeningHours } from './types';
import { berlinParts } from './time';
import { getSunTimes } from './calendar';
import { estimateCrowd, type CrowdEstimate } from './crowd';

export type { Activity, HourData, OpeningHours, MonthlyOpeningHours, WeatherCondition, AirQuality } from './types';
export { calculateCrowdFactor, estimateCrowd, type CrowdEstimate, type CrowdLevel } from './crowd';

// ============================================================================
// Type Definitions
// ============================================================================

/** penalty = min(maxPenalty, ((value - threshold) / range) ^ exponent * maxPenalty) */
export interface PowerPenaltyConfig {
  threshold: number;
  maxPenalty: number;
  range: number;
  exponent: number;
}

export type StandardWindConfig = PowerPenaltyConfig;
export type TempConfig = PowerPenaltyConfig;
export type UVConfig = PowerPenaltyConfig;
/** Applied to the AQI level 1-5 derived from the European AQI (see aqiLevel) */
export type AirQualityConfig = PowerPenaltyConfig;
/** Applied to cloud cover in % */
export type OvercastConfig = PowerPenaltyConfig;

export interface RainConfig {
  maxPenalty: number;     // Total max penalty at 100% probability (e.g., 55)
  exponent: number;       // How aggressively penalty scales with probability (>1 = steeper at high end)
  intensityMax: number;   // Additional max penalty from actual precipitation intensity
  intensityScale: number; // Precipitation mm/h at which intensity penalty is maxed out
}

export interface RampConfig {
  range: number;
  exponent: number;
  maxPenalty: number;
}

export interface KitingWindConfig {
  /** No wind penalty inside [workableMin, workableMax] m/s */
  workableMin: number;
  workableMax: number;
  /** Penalty ramps up as wind drops below workableMin (maxPenalty reached at workableMin - range) */
  tooLight: RampConfig;
  /** Penalty ramps up as wind exceeds workableMax (maxPenalty reached at workableMax + range) */
  tooStrong: RampConfig;
  /** Penalty on gust spread (gust - mean wind, m/s): gusty wind yanks the kite */
  gustiness: PowerPenaltyConfig;
}

export interface CrowdConfig {
  multiplier: number;
}

export interface StandardActivityConfig {
  rain: RainConfig;
  wind: StandardWindConfig;
  crowd: CrowdConfig;
  cold: TempConfig;
  heat: TempConfig;
  airQuality: AirQualityConfig;
  uv: UVConfig;
  overcast?: OvercastConfig;
}

export interface KitingActivityConfig extends Omit<StandardActivityConfig, 'wind'> {
  wind: KitingWindConfig;
}

export interface ScoringConfig {
  cycling: StandardActivityConfig;
  jogging: StandardActivityConfig;
  kiting: KitingActivityConfig;
  socializing: StandardActivityConfig;
}

export type PenaltyFactor =
  | 'rain' | 'wind' | 'gusts' | 'crowd' | 'cold' | 'heat' | 'airQuality' | 'uv' | 'overcast';

export interface Penalty {
  factor: PenaltyFactor;
  label: string;
  /** Short human-readable cause, e.g. "40% chance, 0.6 mm" */
  detail: string;
  /** Points deducted (positive number, one decimal) */
  points: number;
}

export type HourStatus = 'open' | 'closed' | 'thunderstorm';

export interface ScoreBreakdown {
  score: number;
  status: HourStatus;
  /** Sorted by points, largest first; empty when closed or thunderstorm */
  penalties: Penalty[];
  crowd: CrowdEstimate;
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
// Rain: fully continuous based on probability (every % counts), plus intensity
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
      workableMin: 5, workableMax: 11,                        // 5-11 m/s: no penalty
      tooLight: { range: 3.5, exponent: 1.2, maxPenalty: 100 },  // 4 m/s = -22, 3 = -51, <=1.5 = -100 (can't fly)
      tooStrong: { range: 5, exponent: 1.3, maxPenalty: 100 },   // 12 m/s = -12, 13 = -30, 14 = -51, >=16 = -100
      gustiness: { threshold: 5, maxPenalty: 40, range: 8, exponent: 1.2 }, // gusts 5+ m/s above mean
    },
    crowd: { multiplier: 0.35 },
    cold: { threshold: 10, maxPenalty: 40, range: 10, exponent: 1.4 },
    heat: { threshold: 28, maxPenalty: 20, range: 10, exponent: 1.3 },
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
    uv: { threshold: 3, maxPenalty: 30, range: 7, exponent: 1.3 },
    // Sitting on the grass under a grey sky (daylight hours only)
    overcast: { threshold: 40, maxPenalty: 20, range: 60, exponent: 1.2 }
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/** Opening hours for the Berlin calendar month of `date`. */
export const getOpeningHours = (date: Date): OpeningHours => {
  const month = berlinParts(Math.floor(date.getTime() / 1000)).month;
  return OPENING_HOURS_CONFIG.months[month] ?? { open: 7, close: 18 };
};

/** Is the field open during Berlin hour `hour` of the Berlin month containing `date`? */
export const isOpen = (hour: number, date: Date): boolean => {
  const hours = getOpeningHours(date);
  return hour >= hours.open && hour < hours.close;
};

/** Is the field open during the hour slot starting at unix time `dt`? */
export const isOpenAt = (dt: number): boolean => {
  const p = berlinParts(dt);
  const hours = OPENING_HOURS_CONFIG.months[p.month] ?? { open: 7, close: 18 };
  return p.hour >= hours.open && p.hour < hours.close;
};

/** Generic continuous penalty used by most factors. */
export const powerPenalty = (value: number, config: PowerPenaltyConfig): number => {
  if (!(value > config.threshold)) return 0;
  const excess = (value - config.threshold) / config.range;
  return Math.min(config.maxPenalty, Math.pow(excess, config.exponent) * config.maxPenalty);
};

/** Same curve for values *below* the threshold (cold). */
export const penaltyBelow = (value: number, config: PowerPenaltyConfig): number => {
  if (!(value < config.threshold)) return 0;
  const deficit = (config.threshold - value) / config.range;
  return Math.min(config.maxPenalty, Math.pow(deficit, config.exponent) * config.maxPenalty);
};

const rampPenalty = (distance: number, config: RampConfig): number => {
  if (!(distance > 0)) return 0;
  return Math.min(config.maxPenalty, Math.pow(distance / config.range, config.exponent) * config.maxPenalty);
};

/**
 * Continuous rain penalty based on probability and intensity.
 * Every percentage of rain probability contributes to the penalty.
 * Actual precipitation amount adds an intensity penalty on top.
 */
export const calculateRainPenalty = (pop: number, precipitationMm: number, config: RainConfig): number => {
  if (pop <= 0) return 0;

  // Probability-based penalty: continuous from 0% to 100%
  const probPenalty = Math.pow(Math.min(1, pop), config.exponent) * config.maxPenalty;

  // Intensity penalty: actual precipitation amount increases severity
  let intensityPenalty = 0;
  if (precipitationMm > 0) {
    intensityPenalty = Math.min(config.intensityMax,
      (precipitationMm / config.intensityScale) * config.intensityMax);
  }

  return probPenalty + intensityPenalty;
};

/**
 * Map European AQI (0-100+) onto the 1-5 level scale the configs use:
 * 0-20 good -> 1, 40 fair -> 2, 60 moderate -> 3, 80 poor -> 4, 100 very poor -> 5.
 */
export const aqiLevel = (europeanAqi: number): number => 1 + Math.max(0, europeanAqi - 20) / 20;

export const aqiCategory = (europeanAqi: number): string => {
  if (europeanAqi < 20) return 'good';
  if (europeanAqi < 40) return 'fair';
  if (europeanAqi < 60) return 'moderate';
  if (europeanAqi < 80) return 'poor';
  if (europeanAqi < 100) return 'very poor';
  return 'extremely poor';
};

/** Kiting wind penalty (continuous): too light, workable, too strong. */
export const kitingWindPenalty = (windSpeed: number, config: KitingWindConfig): number => {
  if (windSpeed < config.workableMin) return rampPenalty(config.workableMin - windSpeed, config.tooLight);
  if (windSpeed > config.workableMax) return rampPenalty(windSpeed - config.workableMax, config.tooStrong);
  return 0;
};

const isKitingWind = (wind: StandardWindConfig | KitingWindConfig): wind is KitingWindConfig =>
  'workableMin' in wind;

const round1 = (x: number): number => Math.round(x * 10) / 10;

const isDaylight = (dt: number): boolean => {
  const p = berlinParts(dt);
  const { sunrise, sunset } = getSunTimes(p.year, p.month, p.day);
  const mid = p.hour + 0.5;
  return mid > sunrise && mid < sunset;
};

export const hasThunderstorm = (hourData: HourData): boolean =>
  hourData.hasThunderstorm || hourData.weather[0]?.main === 'Thunderstorm';

// ============================================================================
// Scoring Engine
// ============================================================================

export const scoreHour = (activity: Activity, hourData: HourData): ScoreBreakdown => {
  const crowd = estimateCrowd(hourData);

  if (!isOpenAt(hourData.dt)) return { score: 0, status: 'closed', penalties: [], crowd };

  // Thunderstorm - exposed open field, no shelter: never safe
  if (hasThunderstorm(hourData)) return { score: 0, status: 'thunderstorm', penalties: [], crowd };

  const config: StandardActivityConfig | KitingActivityConfig = SCORING_CONFIG[activity];
  const penalties: Penalty[] = [];
  const add = (factor: PenaltyFactor, label: string, detail: string, points: number): void => {
    if (points > 0.05) penalties.push({ factor, label, detail, points: round1(points) });
  };

  // Rain - fully continuous based on probability + intensity
  const precipMm = hourData.rain?.['1h'] ?? 0;
  add('rain', 'Rain', `${Math.round(hourData.pop * 100)}% chance${precipMm > 0 ? `, ${precipMm.toFixed(1)} mm` : ''}`,
    calculateRainPenalty(hourData.pop, precipMm, config.rain));

  // Wind
  const windSpeed = hourData.wind_speed;
  if (isKitingWind(config.wind)) {
    const w = config.wind;
    const label = windSpeed < w.workableMin ? 'Too little wind' : 'Too much wind';
    add('wind', label, `${windSpeed.toFixed(1)} m/s (needs ${w.workableMin}-${w.workableMax})`, kitingWindPenalty(windSpeed, w));
    const gust = hourData.wind_gust ?? windSpeed;
    add('gusts', 'Gusty', `gusts ${Math.round(gust)} m/s vs ${Math.round(windSpeed)} mean`,
      powerPenalty(gust - windSpeed, w.gustiness));
  } else {
    add('wind', 'Wind', `${windSpeed.toFixed(1)} m/s`, powerPenalty(windSpeed, config.wind));
  }

  // Crowds
  add('crowd', 'Crowds', `${crowd.level} (${crowd.index}/100)`, crowd.index * config.crowd.multiplier);

  // Temperature
  const temp = hourData.temp;
  add('cold', 'Cold', `${Math.round(temp)}°C`, penaltyBelow(temp, config.cold));
  add('heat', 'Heat', `${Math.round(temp)}°C`, powerPenalty(temp, config.heat));

  // Air quality (real European AQI when available)
  const eaqi = hourData.air_quality?.european_aqi;
  if (eaqi !== undefined && eaqi !== null) {
    add('airQuality', 'Air quality', `EAQI ${Math.round(eaqi)} (${aqiCategory(eaqi)})`,
      powerPenalty(aqiLevel(eaqi), config.airQuality));
  }

  // UV index
  if (hourData.uvi !== undefined) {
    add('uv', 'UV', `UV ${hourData.uvi.toFixed(1)}`, powerPenalty(hourData.uvi, config.uv));
  }

  // Overcast (daylight only)
  if (config.overcast && hourData.clouds !== undefined && isDaylight(hourData.dt)) {
    add('overcast', 'No sun', `${Math.round(hourData.clouds)}% cloud cover`, powerPenalty(hourData.clouds, config.overcast));
  }

  penalties.sort((a, b) => b.points - a.points);
  const total = penalties.reduce((sum, p) => sum + p.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - total)));
  return { score, status: 'open', penalties, crowd };
};

export const calculateScore = (activity: Activity, hourData: HourData): number => scoreHour(activity, hourData).score;

export const calculateCyclingScore = (hourData: HourData): number => calculateScore('cycling', hourData);
export const calculateJoggingScore = (hourData: HourData): number => calculateScore('jogging', hourData);
export const calculateKitingScore = (hourData: HourData): number => calculateScore('kiting', hourData);
export const calculateSocializingScore = (hourData: HourData): number => calculateScore('socializing', hourData);

// ============================================================================
// Explanations (generated from SCORING_CONFIG so they can't drift)
// ============================================================================

export interface FactorExplanation {
  title: string;
  rule: string;
  examples: string;
}

const fmt = (points: number): string => (points < 0.5 ? '0' : `-${Math.round(points)}`);

export const explainActivity = (activity: Activity): FactorExplanation[] => {
  const c: StandardActivityConfig | KitingActivityConfig = SCORING_CONFIG[activity];
  const rows: FactorExplanation[] = [
    { title: 'Thunderstorm', rule: 'Score = 0', examples: 'No shelter on the open field' },
    {
      title: 'Rain',
      rule: `By probability up to -${c.rain.maxPenalty}, plus up to -${c.rain.intensityMax} for intensity`,
      examples: [0.2, 0.5, 0.8].map(p => `${p * 100}% = ${fmt(calculateRainPenalty(p, 0, c.rain))}`).join(', '),
    },
  ];

  if (isKitingWind(c.wind)) {
    const w = c.wind;
    rows.push({
      title: 'Wind',
      rule: `Needs ${w.workableMin}-${w.workableMax} m/s; too little or too much costs up to -${w.tooLight.maxPenalty}`,
      examples: [2, 4, 8, 12, 14].map(s => `${s} m/s = ${fmt(kitingWindPenalty(s, w))}`).join(', '),
    });
    rows.push({
      title: 'Gusts',
      rule: `Gusts more than ${w.gustiness.threshold} m/s above the mean wind (max -${w.gustiness.maxPenalty})`,
      examples: [7, 9, 13].map(d => `+${d} m/s = ${fmt(powerPenalty(d, w.gustiness))}`).join(', '),
    });
  } else {
    const w = c.wind;
    rows.push({
      title: 'Wind',
      rule: `From ${w.threshold} m/s (max -${w.maxPenalty})`,
      examples: [5, 7, 10].map(s => `${s} m/s = ${fmt(powerPenalty(s, w))}`).join(', '),
    });
  }

  rows.push({
    title: 'Crowds',
    rule: `${c.crowd.multiplier} x crowd index (max -${Math.round(100 * c.crowd.multiplier)})`,
    examples: 'Index 100 = sunny summer Sunday afternoon',
  });
  rows.push({
    title: 'Cold',
    rule: `Below ${c.cold.threshold}°C (max -${c.cold.maxPenalty})`,
    examples: [c.cold.threshold - 4, c.cold.threshold - 8, 0]
      .map(t => `${t}°C = ${fmt(penaltyBelow(t, c.cold))}`).join(', '),
  });
  rows.push({
    title: 'Heat',
    rule: `Above ${c.heat.threshold}°C (max -${c.heat.maxPenalty})`,
    examples: [c.heat.threshold + 3, c.heat.threshold + 6, c.heat.threshold + 9]
      .map(t => `${t}°C = ${fmt(powerPenalty(t, c.heat))}`).join(', '),
  });
  rows.push({
    title: 'UV',
    rule: `Above UV ${c.uv.threshold} (max -${c.uv.maxPenalty})`,
    examples: [5, 7].map(u => `UV ${u} = ${fmt(powerPenalty(u, c.uv))}`).join(', '),
  });
  rows.push({
    title: 'Air quality',
    rule: `European AQI (max -${c.airQuality.maxPenalty})`,
    examples: [30, 50, 70].map(a => `${a} (${aqiCategory(a)}) = ${fmt(powerPenalty(aqiLevel(a), c.airQuality))}`).join(', '),
  });
  if (c.overcast) {
    const o = c.overcast;
    rows.push({
      title: 'No sun',
      rule: `Cloud cover above ${o.threshold}% in daylight (max -${o.maxPenalty})`,
      examples: [70, 100].map(cc => `${cc}% = ${fmt(powerPenalty(cc, o))}`).join(', '),
    });
  }
  return rows;
};
