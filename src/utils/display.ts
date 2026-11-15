/**
 * Presentation helpers shared by the UI components.
 */

import type { Activity } from './types';
import type { CrowdLevel, HourStatus } from './scoring';

export interface ScoreColor {
  backgroundColor: string;
  borderColor: string;
  color: string;
}

export const ACTIVITIES: Activity[] = ['cycling', 'jogging', 'kiting', 'socializing'];

export const ACTIVITY_LABELS: Record<Activity, string> = {
  cycling: 'Cycling',
  jogging: 'Jogging',
  kiting: 'Kiting',
  socializing: 'Picnic',
};

export const CLOSED_COLORS: ScoreColor = {
  backgroundColor: '#3a3d41',
  borderColor: '#2a2c2f',
  color: '#ffffff',
};

/** Hue of the continuous score scale: green (100) → yellow (70) → orange (35) → red (0). */
export const scoreHue = (score: number): number => {
  if (score >= 70) return 60 + ((score - 70) / 30) * 60;
  if (score >= 35) return 30 + ((score - 35) / 35) * 30;
  return (Math.max(0, score) / 35) * 30;
};

/** Flat paint colour for a score: saturated fill, near-black text (>= 4.5:1 across the scale). */
export const getScoreColor = (score: number): ScoreColor => {
  const hue = scoreHue(score);
  return {
    backgroundColor: `hsl(${hue}, 82%, 58%)`,
    borderColor: `hsl(${hue}, 82%, 40%)`,
    color: '#15171a',
  };
};

export const getScoreLabel = (score: number, status: HourStatus): string => {
  if (status === 'closed') return 'Closed';
  if (status === 'thunderstorm') return 'Thunderstorm';
  if (score >= 70) return 'Good';
  if (score >= 35) return 'Fair';
  return 'Poor';
};

export const CROWD_LEVEL_LABELS: Record<CrowdLevel, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
  'very busy': 'Very busy',
};

/** 1-4 filled dots for the compact crowd indicator */
export const CROWD_LEVEL_DOTS: Record<CrowdLevel, number> = {
  quiet: 1,
  moderate: 2,
  busy: 3,
  'very busy': 4,
};

export const DAY_TYPE_LABELS: Record<string, string> = {
  weekday: 'weekday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  holiday: 'public holiday',
};

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Wind "from" direction, e.g. 250° -> "W" */
export const compassDirection = (degrees: number): string =>
  COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8] ?? 'N';

/** Poster headings: Archivo black, expanded, uppercase */
export const HEADING = 'font-display font-black uppercase [font-stretch:110%] leading-none';
/** Small spaced label */
export const LABEL = 'text-[11px] sm:text-xs uppercase tracking-[0.12em]';
