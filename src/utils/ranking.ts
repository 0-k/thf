/**
 * "Best time to go" ranking.
 *
 * A visit to the field lasts about two hours (2023 visitor survey: just under
 * 2 h on weekdays, 2:15 h on Sundays), so we rank 2-hour windows rather than
 * single hours. Picks must not overlap, otherwise the top 3 are usually three
 * neighbouring hours of the same afternoon.
 */

import type { HourData } from './types';
import type { ScoreBreakdown } from './scoring';
import { berlinParts } from './time';

export interface ScoredHour extends HourData {
  score: number;
  breakdown: ScoreBreakdown;
}

export interface Slot {
  /** First hour of the window */
  start: ScoredHour;
  hours: ScoredHour[];
  /** Mean score across the window, rounded */
  score: number;
}

export interface SlotOptions {
  /** Window length in hours (default 2) */
  length?: number;
  /** Only windows starting at or after this unix time */
  fromDt?: number;
  /** Only windows ending at or before this unix time */
  untilDt?: number;
  /** Minimum gap (hours) between the starts of two picks on the same day (default 3) */
  minSeparation?: number;
}

/** All valid windows: consecutive, same Berlin day, every hour open and scored > 0. */
export const buildSlots = (hours: ScoredHour[], options: SlotOptions = {}): Slot[] => {
  const length = options.length ?? 2;
  const slots: Slot[] = [];

  for (let i = 0; i + length <= hours.length; i++) {
    const window = hours.slice(i, i + length);
    const first = window[0]!;
    const last = window[window.length - 1]!;
    if (options.fromDt !== undefined && first.dt < options.fromDt) continue;
    if (options.untilDt !== undefined && last.dt + 3600 > options.untilDt) continue;

    const day = berlinParts(first.dt).dateKey;
    const valid = window.every((h, k) =>
      h.breakdown.status === 'open' && h.score > 0 &&
      h.dt === first.dt + k * 3600 && berlinParts(h.dt).dateKey === day
    );
    if (!valid) continue;

    const mean = window.reduce((sum, h) => sum + h.score, 0) / length;
    slots.push({ start: first, hours: window, score: Math.round(mean) });
  }
  return slots;
};

/** Greedy pick of the best non-overlapping windows (ties go to the earlier, more certain forecast). */
export const findBestSlots = (hours: ScoredHour[], count: number, options: SlotOptions = {}): Slot[] => {
  const minSeparation = (options.minSeparation ?? 3) * 3600;
  const candidates = buildSlots(hours, options).sort((a, b) => b.score - a.score || a.start.dt - b.start.dt);

  const picks: Slot[] = [];
  for (const slot of candidates) {
    if (picks.length >= count) break;
    const day = berlinParts(slot.start.dt).dateKey;
    const clashes = picks.some(p =>
      berlinParts(p.start.dt).dateKey === day && Math.abs(p.start.dt - slot.start.dt) < minSeparation
    );
    if (!clashes) picks.push(slot);
  }
  return picks;
};

/** Best single window of a day (or null if nothing is open/viable). */
export const bestSlotOfDay = (dayHours: ScoredHour[], options: SlotOptions = {}): Slot | null =>
  findBestSlots(dayHours, 1, options)[0] ?? null;
