import React from 'react';
import { PlaneTakeoff } from 'lucide-react';
import type { ScoredHour, Slot } from '../utils/ranking';
import type { Activity } from '../utils/types';
import { ACTIVITY_LABELS, CROWD_LEVEL_LABELS, getScoreColor } from '../utils/display';
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
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold text-slate-900">
          <PlaneTakeoff className="w-6 h-6 text-sock shrink-0" aria-hidden="true" />
          Cleared for take-off
        </h2>
        <span className="text-xs text-slate-500">
          Best 2-hour windows for {ACTIVITY_LABELS[activity].toLowerCase()}, next 4 days · a visit lasts ~2 h
        </span>
      </div>

      {slots.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No open hours with a usable forecast in this period.</p>
      ) : (
        <ol className="mt-3 grid gap-2.5 lg:grid-cols-3">
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
                  className="w-full h-full text-left grid grid-cols-[2.75rem_1fr_auto] rounded-lg overflow-hidden ring-1 ring-slate-200 bg-white transition hover:ring-slate-300 hover:shadow-md"
                >
                  <span className="grid place-items-center bg-sock text-white font-display text-2xl font-extrabold" aria-label={`Rank ${idx + 1}`}>
                    {idx + 1}
                  </span>
                  <span className="px-3 py-2.5 min-w-0">
                    <span className="block font-display text-xl font-extrabold text-slate-900 tabular-nums leading-tight whitespace-nowrap">
                      {formatHour(first.dt)}–{formatHour(end)}
                    </span>
                    <span className="block text-sm font-semibold text-slate-700">{day}</span>
                    <span className="block text-xs text-slate-500 tabular-nums mt-0.5">
                      {Math.round(avg(h => h.temp))}°C · {Math.round(avg(h => h.wind_speed))} m/s ·{' '}
                      {Math.round(Math.max(...slot.hours.map(h => h.pop)) * 100)}% rain · {CROWD_LEVEL_LABELS[busiest.breakdown.crowd.level].toLowerCase()}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5 truncate">
                      {worst && worst.points >= 3 ? `Main drawback: ${worst.label.toLowerCase()} -${Math.round(worst.points)}` : 'Nothing holding it back'}
                    </span>
                  </span>
                  <span
                    className="grid place-items-center px-3.5 font-display text-3xl font-extrabold tabular-nums"
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
