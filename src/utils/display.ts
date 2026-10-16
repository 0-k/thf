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

/** Icon colour for the active activity tab */
export const ACTIVITY_ACCENT_TEXT: Record<Activity, string> = {
  cycling: 'text-blue-600',
  jogging: 'text-emerald-600',
  kiting: 'text-violet-600',
  socializing: 'text-orange-500',
};

export const CLOSED_COLORS: ScoreColor = {
  backgroundColor: 'rgb(229, 231, 235)',
  borderColor: 'rgb(156, 163, 175)',
  color: 'rgb(55, 65, 81)',
};

export const getScoreColor = (score: number): ScoreColor => {
  // Continuous gradient from green (100) → yellow (70) → red (0)
  // Using HSL for smooth color transitions
  let hue: number, saturation: number, lightness: number;

  if (score >= 70) {
    // Green to Yellow (100 → 70)
    const t = (score - 70) / 30;
    hue = 60 + t * 60;
    saturation = 65;
    lightness = 75;
  } else if (score >= 35) {
    // Yellow to Orange (70 → 35)
    const t = (score - 35) / 35;
    hue = 30 + t * 30;
    saturation = 70;
    lightness = 72;
  } else {
    // Orange to Red (35 → 0)
    const t = score / 35;
    hue = 0 + t * 30;
    saturation = 75;
    lightness = 70;
  }

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    borderColor: `hsl(${hue}, ${saturation + 10}%, ${lightness - 20}%)`,
    color: `hsl(${hue}, ${saturation}%, 25%)`
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
