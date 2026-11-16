import React from 'react';
import type { Slot } from '../utils/ranking';
import { HEADING, LABEL, getScoreColor } from '../utils/display';
import { formatHour, formatShortDate, formatWeekdayShort } from '../utils/time';
import { dayStats, type DayGroup } from './DaySection';

interface WeekOutlookProps {
  days: Array<{ day: DayGroup; best: Slot | null; relativeLabel: string | null }>;
  /** Days from this index on are hidden until expanded */
  defaultVisible: number;
  onJump: (key: string, index: number) => void;
}

/** One painted tile per day: its best 2-hour window. Click jumps to the day. */
export default function WeekOutlook({ days, onJump }: WeekOutlookProps): React.ReactElement {
  return (
    <section className="text-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 mb-3">
        <h2 className={`${HEADING} text-2xl`}>Seven days</h2>
        <span className={LABEL}>Best 2-hour window per day</span>
      </div>
      <div className="flex gap-1 overflow-x-auto snap-x">
        {days.map(({ day, best, relativeLabel }, index) => {
          const firstDt = day.hours[0]!.dt;
          const stats = dayStats(day.hours);
          const colors = best ? getScoreColor(best.score) : null;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onJump(day.key, index)}
              className={`snap-start shrink-0 w-24 sm:w-auto sm:flex-1 min-w-0 px-2 py-2 text-left text-ink transition hover:brightness-110 ${
                colors ? '' : 'bg-tarmac-light text-white'
              }`}
              style={colors ? { backgroundColor: colors.backgroundColor } : undefined}
            >
              <div className="text-[11px] uppercase tracking-wider whitespace-nowrap">
                {relativeLabel ?? `${formatWeekdayShort(firstDt)} ${formatShortDate(firstDt).split(' ')[1] ?? ''}`}
              </div>
              <div className="font-display font-black [font-stretch:85%] text-[clamp(1.6rem,4vw,2.4rem)] leading-none tabular-nums my-0.5">
                {best ? best.score : '–'}
              </div>
              <div className="text-[11px] tabular-nums whitespace-nowrap">
                {best ? `${formatHour(best.start.dt).slice(0, 2)}–${formatHour(best.start.dt + best.hours.length * 3600).slice(0, 2)} h` : 'no window'}
              </div>
              <div className="text-[11px] tabular-nums whitespace-nowrap">
                {Math.round(stats.high)}°/{Math.round(stats.low)}° · {Math.round(stats.maxPop * 100)}%
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
