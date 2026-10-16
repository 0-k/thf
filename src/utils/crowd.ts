/**
 * Crowd model for Tempelhofer Feld.
 *
 *   crowd index = 100 x dayLevel x diurnalProfile(hour, sunset) x weatherFactor
 *
 * The structure is multiplicative: a Saturday is "twice as busy" as a weekday
 * *for the same weather*, and pouring rain empties the field on any day.
 * (The previous additive model gave a rainy January Saturday 42/100 and a
 * pouring-rain June Saturday 67/100.)
 *
 * Calibration sources (Grün Berlin visitor monitoring):
 *  - Besuchermonitoring 2014 (10 counting days, late May / mid June, mixed
 *    weather): average visits per day were weekday 12,598, Saturday 25,614,
 *    Sunday/holiday 31,040. Day levels below are solved so the integrated
 *    daily profiles reproduce those ratios (see crowd.test.ts).
 *  - Autumn monitoring 2012: peaks at 16:30 on weekdays, 14:30 Saturdays,
 *    14:00 Sundays, shifting later in summer. Peaks are therefore anchored to
 *    sunset rather than fixed clock hours.
 *  - Press estimate: ~50,000 visitors on sunny summer weekends (vs. the
 *    31,040 average Sunday) -> weather can swing totals by ~1.6x.
 *
 * Index 100 = peak hour of a sunny ~25°C Sunday. Weather response curves and
 * the Friday-evening uplift are informed assumptions, not fitted data.
 */

import type { HourData } from './types';
import { berlinParts } from './time';
import { getHolidayName, getSunTimes } from './calendar';

export type DayType = 'weekday' | 'friday' | 'saturday' | 'sunday' | 'holiday';
export type CrowdLevel = 'quiet' | 'moderate' | 'busy' | 'very busy';

export interface DiurnalConfig {
  /** Relative daily visit level (Sunday = 1) */
  level: number;
  /** Peak hour = sunset - peakBeforeSunset, clamped to [peakMin, peakMax] */
  peakBeforeSunset: number;
  peakMin: number;
  peakMax: number;
  /** Gaussian spread (hours) before / after the peak */
  spreadBefore: number;
  spreadAfter: number;
  /** Share of peak present all day (dog walkers, joggers, commuting cyclists) */
  base: number;
}

export interface CrowdModelConfig {
  weekday: DiurnalConfig;
  saturday: DiurnalConfig;
  sunday: DiurnalConfig;
  /** Multiplier on weekday crowds on Friday from 15:00 (assumption) */
  fridayEveningBoost: number;
  /** Before sunrise / after sunset, occupancy drops by this share per hour of darkness (floored at twilightFloor) */
  twilightDropPerHour: number;
  twilightFloor: number;
  weather: {
    /** Temperature attraction: smoothstep from coldTemp (floor) to idealTemp (1.0) */
    coldTemp: number;
    idealTemp: number;
    coldFloor: number;
    /** No shade on the field: above hotTemp, attraction drops per °C (floored) */
    hotTemp: number;
    hotDropPerDegree: number;
    hotFloor: number;
    /** Share of visitors deterred at 100% rain probability, plus extra for heavy rain */
    rainDeterrence: number;
    heavyRainDeterrence: number;
    heavyRainMm: number;
    /** Attraction under full overcast (sunbathing is the #1 visit reason, 36%) */
    overcastFactor: number;
    /** Wind above windStart (m/s) reduces visits per m/s (floored) */
    windStart: number;
    windDropPerMs: number;
    windFloor: number;
  };
  /** Lower bounds of each level on the 0-100 index */
  levels: { moderate: number; busy: number; veryBusy: number };
}

export const CROWD_MODEL: CrowdModelConfig = {
  weekday: {
    level: 0.343, // calibrated: see crowd.test.ts
    peakBeforeSunset: 2.25, peakMin: 13.5, peakMax: 19.25,
    spreadBefore: 4, spreadAfter: 2.2, base: 0.12,
  },
  saturday: {
    level: 0.755, // calibrated: see crowd.test.ts
    peakBeforeSunset: 4.25, peakMin: 12.5, peakMax: 17,
    spreadBefore: 3.5, spreadAfter: 3, base: 0.06,
  },
  sunday: {
    level: 1,
    peakBeforeSunset: 4.75, peakMin: 12.5, peakMax: 16.5,
    spreadBefore: 3.5, spreadAfter: 3.2, base: 0.06,
  },
  fridayEveningBoost: 1.15,
  twilightDropPerHour: 0.45,
  twilightFloor: 0.2,
  weather: {
    coldTemp: 2, idealTemp: 24, coldFloor: 0.15,
    hotTemp: 28, hotDropPerDegree: 0.035, hotFloor: 0.65,
    rainDeterrence: 0.6, heavyRainDeterrence: 0.3, heavyRainMm: 2,
    overcastFactor: 0.75,
    windStart: 6, windDropPerMs: 0.025, windFloor: 0.7,
  },
  levels: { moderate: 15, busy: 35, veryBusy: 60 },
};

export interface CrowdEstimate {
  /** 0-100; 100 = peak hour of a sunny summer Sunday */
  index: number;
  level: CrowdLevel;
  dayType: DayType;
  holiday: string | null;
  /** Day level x diurnal profile (0-1): how busy this slot is in perfect weather */
  timeFactor: number;
  /** Weather attraction (0-1) */
  weatherFactor: number;
}

export const getDayType = (year: number, month: number, day: number, weekday: number): DayType => {
  if (getHolidayName(year, month, day)) return 'holiday';
  if (weekday === 0) return 'sunday';
  if (weekday === 6) return 'saturday';
  if (weekday === 5) return 'friday';
  return 'weekday';
};

const smoothstep = (x: number): number => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/**
 * Diurnal occupancy for the hour starting at `hour` (evaluated mid-hour),
 * relative to that day type's peak. Exported for calibration tests.
 */
export const diurnalProfile = (config: DiurnalConfig, hour: number, sunrise: number, sunset: number): number => {
  const t = hour + 0.5;
  const peak = Math.max(config.peakMin, Math.min(config.peakMax, sunset - config.peakBeforeSunset));
  const spread = t < peak ? config.spreadBefore : config.spreadAfter;
  const bump = Math.exp(-0.5 * ((t - peak) / spread) ** 2);
  let profile = config.base + (1 - config.base) * bump;

  // People leave as it gets dark and few come before sunrise (continuous ramp on both sides).
  const hoursOfDarkness = Math.max(0, t - sunset, sunrise - t);
  profile *= Math.max(CROWD_MODEL.twilightFloor, 1 - CROWD_MODEL.twilightDropPerHour * hoursOfDarkness);
  return profile;
};

/** Weather attraction 0-1 (1 = ideal: ~24-28°C, sunny, dry, light wind). */
export const weatherAttraction = (temp: number, pop: number, precipMm: number, cloudCover: number, wind: number): number => {
  const w = CROWD_MODEL.weather;

  let tempFactor = w.coldFloor + (1 - w.coldFloor) * smoothstep((temp - w.coldTemp) / (w.idealTemp - w.coldTemp));
  if (temp > w.hotTemp) {
    tempFactor *= Math.max(w.hotFloor, 1 - w.hotDropPerDegree * (temp - w.hotTemp));
  }

  const heavyShare = Math.min(1, Math.max(0, precipMm) / w.heavyRainMm);
  const rainFactor = 1 - Math.min(1, Math.max(0, pop)) * (w.rainDeterrence + w.heavyRainDeterrence * heavyShare);

  const cloudFactor = w.overcastFactor + (1 - w.overcastFactor) * (1 - Math.min(100, Math.max(0, cloudCover)) / 100);

  const windFactor = Math.max(w.windFloor, 1 - w.windDropPerMs * Math.max(0, wind - w.windStart));

  return tempFactor * rainFactor * cloudFactor * windFactor;
};

export const crowdLevel = (index: number): CrowdLevel => {
  const l = CROWD_MODEL.levels;
  if (index >= l.veryBusy) return 'very busy';
  if (index >= l.busy) return 'busy';
  if (index >= l.moderate) return 'moderate';
  return 'quiet';
};

/** Time-of-week factor (day level x diurnal profile) for a Berlin date/hour. Month is 0-based. */
export const timeOfWeekFactor = (
  year: number, month: number, day: number, weekday: number, hour: number
): { factor: number; dayType: DayType; holiday: string | null } => {
  const dayType = getDayType(year, month, day, weekday);
  const { sunrise, sunset } = getSunTimes(year, month, day);
  const config = dayType === 'saturday' ? CROWD_MODEL.saturday
    : dayType === 'sunday' || dayType === 'holiday' ? CROWD_MODEL.sunday
    : CROWD_MODEL.weekday;

  let factor = config.level * diurnalProfile(config, hour, sunrise, sunset);
  if (dayType === 'friday' && hour >= 15) factor *= CROWD_MODEL.fridayEveningBoost;

  return { factor, dayType, holiday: dayType === 'holiday' ? getHolidayName(year, month, day) : null };
};

export const estimateCrowd = (hourData: HourData): CrowdEstimate => {
  const p = berlinParts(hourData.dt);
  const { factor, dayType, holiday } = timeOfWeekFactor(p.year, p.month, p.day, p.weekday, p.hour);
  const weatherFactor = weatherAttraction(
    hourData.temp,
    hourData.pop,
    hourData.rain?.['1h'] ?? 0,
    hourData.clouds ?? 50,
    hourData.wind_speed
  );
  const index = Math.round(Math.max(0, Math.min(100, 100 * factor * weatherFactor)));
  return { index, level: crowdLevel(index), dayType, holiday, timeFactor: factor, weatherFactor };
};

/** Crowd index 0-100 for an hour (100 = peak of a sunny summer Sunday). */
export const calculateCrowdFactor = (hourData: HourData): number => estimateCrowd(hourData).index;
