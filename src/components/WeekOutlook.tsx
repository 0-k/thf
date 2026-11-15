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
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="font-display text-2xl font-extrabold text-slate-900 whitespace-nowrap">Seven days</h2>
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
              className={`snap-start shrink-0 w-[6.5rem] sm:w-auto sm:flex-1 rounded-lg p-2.5 text-left transition hover:brightness-105 hover:shadow-md ${
                colors ? '' : 'bg-slate-100 text-slate-500'
              } ${index >= defaultVisible ? 'opacity-80' : ''}`}
              style={colors ? { backgroundColor: colors.backgroundColor, color: colors.color } : undefined}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider">
                {relativeLabel ?? formatWeekdayShort(firstDt)} <span className="font-normal normal-case tracking-normal opacity-75">{formatShortDate(firstDt)}</span>
              </div>
              <div className="font-display text-4xl font-extrabold leading-none tabular-nums my-1">{best ? best.score : '–'}</div>
              <div className="text-[11px] tabular-nums">
                {best ? `${formatHour(best.start.dt)}–${formatHour(best.start.dt + best.hours.length * 3600)}` : 'no window'}
              </div>
              <div className="flex items-center justify-between text-[11px] opacity-80 tabular-nums">
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
