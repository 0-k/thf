/**
 * Berlin wall-clock helpers.
 *
 * Everything about the field (opening hours, crowds, "today") happens in
 * Europe/Berlin time, regardless of where the viewer's browser or the
 * Netlify Function runs (Lambda runs in UTC). Never use Date#getHours() and
 * friends on forecast timestamps - use these helpers instead.
 */

export const BERLIN_TZ = 'Europe/Berlin';

export interface BerlinParts {
  year: number;
  /** 0 = January, 11 = December (same convention as Date#getMonth) */
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday, 6 = Saturday (same convention as Date#getDay) */
  weekday: number;
  /** YYYY-MM-DD, handy as a grouping key */
  dateKey: string;
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BERLIN_TZ,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  weekday: 'short',
  hourCycle: 'h23',
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Scoring calls this for every hour x activity on every render; memoise.
const partsCache = new Map<number, BerlinParts>();

/** Berlin wall-clock parts for a unix timestamp in seconds. */
export const berlinParts = (unixSeconds: number): BerlinParts => {
  const cached = partsCache.get(unixSeconds);
  if (cached) return cached;

  const raw: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(new Date(unixSeconds * 1000))) {
    raw[p.type] = p.value;
  }
  const year = Number(raw['year']);
  const month = Number(raw['month']) - 1;
  const day = Number(raw['day']);
  const parts: BerlinParts = {
    year,
    month,
    day,
    hour: Number(raw['hour']) % 24,
    minute: Number(raw['minute']),
    weekday: WEEKDAYS[raw['weekday'] ?? ''] ?? 0,
    dateKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };

  if (partsCache.size > 5000) partsCache.clear();
  partsCache.set(unixSeconds, parts);
  return parts;
};

/** Berlin UTC offset in minutes (60 in winter, 120 in summer) at a given instant. */
export const berlinOffsetMinutes = (unixSeconds: number): number => {
  const p = berlinParts(unixSeconds);
  const asUtc = Date.UTC(p.year, p.month, p.day, p.hour, p.minute) / 1000;
  return Math.round((asUtc - Math.floor(unixSeconds / 60) * 60) / 60);
};

/**
 * Unix seconds for a Berlin wall-clock time. Month is 0-based like Date.
 * Handles DST: the offset is resolved at the target instant, not at "now".
 */
export const berlinToUnix = (year: number, month: number, day: number, hour = 0, minute = 0): number => {
  const naive = Date.UTC(year, month, day, hour, minute) / 1000;
  let guess = naive - berlinOffsetMinutes(naive) * 60;
  // Second pass fixes guesses that landed on the other side of a DST switch.
  guess = naive - berlinOffsetMinutes(guess) * 60;
  return guess;
};

/** Unix seconds of Berlin midnight on the Berlin day containing `unixSeconds`. */
export const startOfBerlinDay = (unixSeconds: number): number => {
  const p = berlinParts(unixSeconds);
  return berlinToUnix(p.year, p.month, p.day);
};

/** Day of year (1-366) for a Berlin calendar date. */
export const dayOfYear = (year: number, month: number, day: number): number =>
  Math.round((Date.UTC(year, month, day) - Date.UTC(year, 0, 0)) / 86_400_000);

const dayLabelFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BERLIN_TZ,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const longDayLabelFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BERLIN_TZ,
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

/** "Sat, Jun 13" in Berlin time. */
export const formatDay = (unixSeconds: number): string => dayLabelFormatter.format(new Date(unixSeconds * 1000));

/** "Saturday, Jun 13" in Berlin time. */
export const formatLongDay = (unixSeconds: number): string =>
  longDayLabelFormatter.format(new Date(unixSeconds * 1000));

/** "14:00" in Berlin time. */
export const formatHour = (unixSeconds: number): string =>
  `${String(berlinParts(unixSeconds).hour).padStart(2, '0')}:00`;

/** "14:35" in Berlin time. */
export const formatClock = (unixSeconds: number): string => {
  const p = berlinParts(unixSeconds);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
};

/** Decimal hours (e.g. 18.75) -> "18:45". */
export const formatDecimalHours = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
