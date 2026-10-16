import React from 'react';
import { Droplets } from 'lucide-react';
import type { Slot } from '../utils/ranking';
import { getScoreColor } from '../utils/display';
import { formatHour, formatShortDate, formatWeekdayShort } from '../utils/time';
import { dayStats, type DayGroup } from './DaySection';

interface WeekOutlookProps {
  days: Array<{ day: DayGroup; best: Slot | null; relativeLabel: string | null }>;
  /** Days from this index on are hidden until expanded */
  defaultVisible: number;
  onJump: (key: string, index: number) => void;
}

/** One tile per day: its best 2-hour window. Click jumps to the day. */
export default function WeekOutlook({ days, defaultVisible, onJump }: WeekOutlookProps): React.ReactElement {
  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-slate-900">7-Day Outlook</h2>
        <span className="text-xs text-slate-500">Best 2-hour window per day</span>
      </div>
      <div className="mt-3 -mx-1 px-1 flex gap-2 overflow-x-auto snap-x pb-1">
        {days.map(({ day, best, relativeLabel }, index) => {
          const firstDt = day.hours[0]!.dt;
          const stats = dayStats(day.hours);
          const colors = best ? getScoreColor(best.score) : null;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onJump(day.key, index)}
              className={`snap-start shrink-0 w-[6.75rem] sm:w-auto sm:flex-1 rounded-2xl border border-slate-200 p-2.5 text-left transition hover:border-slate-300 hover:shadow-md ${
                index >= defaultVisible ? 'opacity-80' : ''
              }`}
            >
              <div className="font-display text-lg font-semibold uppercase leading-none text-slate-800">
                {relativeLabel ?? formatWeekdayShort(firstDt)}
              </div>
              <div className="text-[11px] text-slate-500 mb-2">{formatShortDate(firstDt)}</div>
              <div
                className={`rounded-xl h-12 flex items-center justify-center font-display text-3xl font-bold ${
                  colors ? 'border' : 'bg-slate-100 text-slate-400'
                }`}
                style={colors ?? undefined}
              >
                {best ? best.score : '–'}
              </div>
              <div className="mt-1.5 text-[11px] text-slate-600 tabular-nums">
                {best ? `${formatHour(best.start.dt)}–${formatHour(best.start.dt + best.hours.length * 3600)}` : 'no window'}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                <span>{Math.round(stats.high)}° / {Math.round(stats.low)}°</span>
                <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" />{Math.round(stats.maxPop * 100)}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
