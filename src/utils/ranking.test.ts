import { describe, it, expect } from 'vitest';
import { bestSlotOfDay, buildSlots, findBestSlots, type ScoredHour } from './ranking';
import { berlinToUnix } from './time';

// Minimal scored hours: only dt, score and status matter for ranking.
const day = (d: number, scores: Array<number | null>, startHour = 8): ScoredHour[] =>
  scores.map((score, i) => ({
    dt: berlinToUnix(2026, 5, d, startHour + i),
    temp: 20, wind_speed: 2, pop: 0, weather: [], hasThunderstorm: false,
    score: score ?? 0,
    breakdown: { score: score ?? 0, status: score === null ? 'closed' : 'open', penalties: [], crowd: {} as never },
  }));

describe('2-hour slot ranking', () => {
  it('averages consecutive hours into windows', () => {
    const slots = buildSlots(day(16, [80, 60, 90]));
    expect(slots.map(s => s.score)).toEqual([70, 75]);
  });

  it('never builds a window across closed hours or across midnight', () => {
    expect(buildSlots(day(16, [80, null, 90]))).toEqual([]);
    const lateAndEarly = [...day(16, [90], 22), ...day(17, [90], 0)];
    expect(buildSlots(lateAndEarly)).toEqual([]);
  });

  it('returns distinct, non-overlapping picks instead of neighbouring hours', () => {
    // A great afternoon: old logic returned 13:00, 14:00, 15:00
    const hours = day(16, [50, 50, 60, 70, 95, 96, 97, 95, 70, 60]);
    const picks = findBestSlots(hours, 3);
    const starts = picks.map(p => p.start.dt);
    for (let i = 0; i < starts.length; i++) {
      for (let j = i + 1; j < starts.length; j++) {
        expect(Math.abs(starts[i]! - starts[j]!)).toBeGreaterThanOrEqual(3 * 3600);
      }
    }
    expect(picks[0]!.score).toBe(97); // 13:00-15:00 (96, 97) or 14:00-16:00 (97, 95) -> best mean first
  });

  it('respects the time window (future only)', () => {
    const hours = day(16, [99, 99, 50, 50, 70, 70]);
    const fromDt = berlinToUnix(2026, 5, 16, 10);
    const picks = findBestSlots(hours, 3, { fromDt });
    expect(picks.every(p => p.start.dt >= fromDt)).toBe(true);
    expect(picks[0]!.score).toBe(70);
  });

  it('breaks ties in favour of the earlier (more certain) forecast', () => {
    const hours = [...day(16, [80, 80]), ...day(18, [80, 80])];
    expect(findBestSlots(hours, 1)[0]!.start.dt).toBe(hours[0]!.dt);
  });

  it('bestSlotOfDay returns null when nothing is viable', () => {
    expect(bestSlotOfDay(day(16, [null, null, null]))).toBeNull();
  });
});
