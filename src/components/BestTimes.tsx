import React from 'react';
import type { ScoredHour, Slot } from '../utils/ranking';
import type { Activity } from '../utils/types';
import { ACTIVITY_LABELS, CROWD_LEVEL_LABELS, HEADING, LABEL, getScoreColor } from '../utils/display';
import { berlinParts, formatHour, formatShortDate, formatWeekdayShort } from '../utils/time';

interface BestTimesProps {
  slots: Slot[];
  activity: Activity;
  /** "Today" / "Tomorrow" / null for a Berlin date key */
  relativeLabel: (dateKey: string) => string | null;
  onSelect: (hour: ScoredHour) => void;
}

/** The best non-overlapping 2-hour windows, ranked. */
export default function BestTimes({ slots, activity, relativeLabel, onSelect }: BestTimesProps): React.ReactElement {
  return (
    <section className="text-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 mb-3">
        <h2 className={`${HEADING} text-2xl`}>Cleared for take-off</h2>
        <span className={LABEL}>Best 2-hour windows for {ACTIVITY_LABELS[activity].toLowerCase()} · next 4 days</span>
      </div>

      {slots.length === 0 ? (
        <p className="text-sm">No open hours with a usable forecast in this period.</p>
      ) : (
        <ol className="grid gap-3 lg:grid-cols-3">
          {slots.map((slot, idx) => {
            const first = slot.start;
            const end = slot.hours[slot.hours.length - 1]!.dt + 3600;
            const worst = slot.hours.flatMap(h => h.breakdown.penalties).sort((a, b) => b.points - a.points)[0];
            const avg = (pick: (h: ScoredHour) => number): number =>
              slot.hours.reduce((s, h) => s + pick(h), 0) / slot.hours.length;
            const busiest = slot.hours.reduce((b, h) => (h.breakdown.crowd.index > b.breakdown.crowd.index ? h : b), first);
            const colors = getScoreColor(slot.score);
            const day = relativeLabel(berlinParts(first.dt).dateKey) ?? `${formatWeekdayShort(first.dt)} ${formatShortDate(first.dt)}`;

            return (
              <li key={first.dt}>
                <button
                  type="button"
                  onClick={() => onSelect(first)}
                  className="w-full h-full text-left grid grid-cols-[3.4rem_1fr_auto] bg-white text-ink transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <span className="grid place-items-center bg-sock font-display text-[2rem] font-black" aria-label={`Rank ${idx + 1}`}>
                    {idx + 1}
                  </span>
                  <span className="px-3 py-2.5 min-w-0">
                    <span className="block font-display text-2xl font-black [font-stretch:85%] tabular-nums leading-tight whitespace-nowrap">
                      {formatHour(first.dt)}–{formatHour(end)}
                    </span>
                    <span className="block text-xs tabular-nums mt-1">
                      {day} · {Math.round(avg(h => h.temp))}°C · {Math.round(avg(h => h.wind_speed))} m/s ·{' '}
                      {Math.round(Math.max(...slot.hours.map(h => h.pop)) * 100)}% · {CROWD_LEVEL_LABELS[busiest.breakdown.crowd.level].toLowerCase()}
                    </span>
                    <span className="block text-xs text-ink/70 mt-0.5 truncate">
                      {worst && worst.points >= 3 ? `${worst.label} -${Math.round(worst.points)}` : 'Nothing holding it back'}
                    </span>
                  </span>
                  <span
                    className="grid place-items-center px-3.5 font-display text-[1.9rem] font-black tabular-nums"
                    style={{ backgroundColor: colors.backgroundColor, color: colors.color }}
                  >
                    {slot.score}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
