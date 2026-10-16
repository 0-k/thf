import { describe, it, expect } from 'vitest';
import { berlinParts, berlinToUnix, formatDecimalHours, formatHour, startOfBerlinDay } from './time';
import { easterSunday, getHolidayName, getSunTimes } from './calendar';

describe('Berlin time helpers', () => {
  it('round-trips wall-clock times in winter and summer', () => {
    for (const [m, d, h] of [[0, 15, 14], [6, 15, 14], [9, 16, 0], [11, 31, 23]] as const) {
      const p = berlinParts(berlinToUnix(2026, m, d, h));
      expect([p.month, p.day, p.hour]).toEqual([m, d, h]);
    }
  });

  it('applies the correct UTC offset (CET +1, CEST +2)', () => {
    expect(new Date(berlinToUnix(2026, 0, 15, 14) * 1000).toISOString()).toBe('2026-01-15T13:00:00.000Z');
    expect(new Date(berlinToUnix(2026, 6, 15, 14) * 1000).toISOString()).toBe('2026-07-15T12:00:00.000Z');
  });

  it('handles both DST switch days', () => {
    // 2026-03-29: 02:00 -> 03:00; 2026-10-25: 03:00 -> 02:00
    expect(berlinToUnix(2026, 2, 29, 3) - berlinToUnix(2026, 2, 29, 1)).toBe(3600);
    expect(berlinToUnix(2026, 9, 25, 4) - berlinToUnix(2026, 9, 25, 1)).toBe(4 * 3600);
  });

  it('finds Berlin midnight even when UTC is still on the previous day', () => {
    const lateNight = berlinToUnix(2026, 6, 15, 1, 30); // 23:30 UTC on Jul 14
    expect(new Date(startOfBerlinDay(lateNight) * 1000).toISOString()).toBe('2026-07-14T22:00:00.000Z');
  });

  it('formats hours in Berlin time', () => {
    expect(formatHour(berlinToUnix(2026, 6, 15, 9))).toBe('09:00');
    expect(formatDecimalHours(18.75)).toBe('18:45');
  });

  it('reports weekday with Sunday = 0', () => {
    expect(berlinParts(berlinToUnix(2026, 5, 14, 12)).weekday).toBe(0);
    expect(berlinParts(berlinToUnix(2026, 5, 13, 12)).weekday).toBe(6);
  });
});

describe('Calendar', () => {
  it('computes sunrise/sunset within a few minutes of published Berlin times', () => {
    const near = (actual: number, h: number, m: number) => expect(Math.abs(actual - (h + m / 60))).toBeLessThan(5 / 60);
    const midsummer = getSunTimes(2026, 5, 21);
    near(midsummer.sunrise, 4, 43);
    near(midsummer.sunset, 21, 33);
    const midwinter = getSunTimes(2026, 11, 21);
    near(midwinter.sunrise, 8, 15);
    near(midwinter.sunset, 15, 54);
  });

  it('computes Easter Sunday', () => {
    expect(easterSunday(2024)).toEqual([2, 31]);
    expect(easterSunday(2025)).toEqual([3, 20]);
    expect(easterSunday(2026)).toEqual([3, 5]);
  });

  it('knows Berlin public holidays (incl. Women\'s Day and movable feasts)', () => {
    expect(getHolidayName(2026, 2, 8)).toBe("International Women's Day");
    expect(getHolidayName(2026, 3, 3)).toBe('Good Friday');
    expect(getHolidayName(2026, 4, 14)).toBe('Ascension Day');
    expect(getHolidayName(2026, 4, 25)).toBe('Whit Monday');
    expect(getHolidayName(2026, 9, 3)).toBe('German Unity Day');
    expect(getHolidayName(2026, 9, 16)).toBeNull();
  });
});
