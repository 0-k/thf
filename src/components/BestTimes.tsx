import React from 'react';
import { Droplets, PlaneTakeoff, ThermometerSun, Users, Wind } from 'lucide-react';
import type { ScoredHour, Slot } from '../utils/ranking';
import type { Activity } from '../utils/types';
import { ACTIVITY_LABELS, CROWD_LEVEL_LABELS, getScoreColor } from '../utils/display';
import { berlinParts, formatClock, formatHour, formatShortDate, formatWeekdayShort } from '../utils/time';

interface BestTimesProps {
  slots: Slot[];
  activity: Activity;
  nowSeconds: number;
  onSelect: (hour: ScoredHour) => void;
}

const relativeDay = (dt: number, nowSeconds: number): string => {
  const key = berlinParts(dt).dateKey;
  if (key === berlinParts(nowSeconds).dateKey) return 'Today';
  if (key === berlinParts(nowSeconds + 86400).dateKey) return 'Tomorrow';
  return `${formatWeekdayShort(dt)} ${formatShortDate(dt)}`;
};

const remark = (score: number, rank: number): { text: string; className: string } => {
  if (rank === 0 && score >= 70) return { text: 'Best bet', className: 'bg-amber-400 text-slate-900' };
  if (score >= 70) return { text: 'Good', className: 'bg-emerald-400/20 text-emerald-300' };
  if (score >= 35) return { text: 'Fair', className: 'bg-yellow-400/20 text-yellow-200' };
  return { text: 'Poor', className: 'bg-red-400/20 text-red-300' };
};

/** "Departures" board: the best non-overlapping 2-hour windows. */
export default function BestTimes({ slots, activity, nowSeconds, onSelect }: BestTimesProps): React.ReactElement {
  return (
    <section className="rounded-3xl bg-slate-900 text-white shadow-xl overflow-hidden ring-1 ring-black/10">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <PlaneTakeoff className="w-7 h-7 text-amber-400 shrink-0" />
          <div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide leading-none">Departures</h2>
            <p className="text-xs text-white/60 mt-1">
              Best 2-hour windows for {ACTIVITY_LABELS[activity].toLowerCase()}, next 4 days · a visit lasts ~2 h
            </p>
          </div>
        </div>
        <span className="hidden sm:block font-display text-amber-400 tracking-[0.2em] text-lg tabular-nums">
          THF {formatClock(nowSeconds)}
        </span>
      </div>

      {slots.length === 0 ? (
        <p className="px-5 py-6 text-sm text-white/70">No open hours with a usable forecast in this period.</p>
      ) : (
        <>
          <div className="hidden sm:grid grid-cols-[9rem_8rem_1fr_12rem_4rem] gap-4 px-5 pt-3 pb-1 text-[11px] uppercase tracking-[0.2em] text-white/40">
            <span>Time</span><span>Day</span><span>Conditions</span><span>Remarks</span><span className="text-right">Score</span>
          </div>
          <ol>
            {slots.map((slot, idx) => {
              const first = slot.start;
              const end = slot.hours[slot.hours.length - 1]!.dt + 3600;
              const worst = slot.hours.flatMap(h => h.breakdown.penalties).sort((a, b) => b.points - a.points)[0];
              const avg = (pick: (h: ScoredHour) => number): number =>
                slot.hours.reduce((s, h) => s + pick(h), 0) / slot.hours.length;
              const busiest = slot.hours.reduce((b, h) => (h.breakdown.crowd.index > b.breakdown.crowd.index ? h : b), first);
              const tag = remark(slot.score, idx);
              const colors = getScoreColor(slot.score);

              return (
                <li key={first.dt}>
                  <button
                    type="button"
                    onClick={() => onSelect(first)}
                    className="w-full text-left grid grid-cols-[1fr_auto] sm:grid-cols-[9rem_8rem_1fr_12rem_4rem] gap-x-4 gap-y-1 items-center px-5 py-3 border-t border-white/5 hover:bg-white/5 focus-visible:bg-white/5 transition-colors"
                  >
                    <span className="font-display text-2xl font-semibold text-amber-300 tabular-nums">
                      {formatHour(first.dt)}<span className="text-amber-300/50">–</span>{formatHour(end)}
                    </span>
                    <span
                      className="sm:order-last row-span-2 sm:row-span-1 justify-self-end font-display text-3xl font-bold rounded-xl px-2.5 py-0.5 tabular-nums"
                      style={{ backgroundColor: colors.backgroundColor, color: colors.color }}
                    >
                      {slot.score}
                    </span>
                    <span className="font-display text-lg uppercase tracking-wide text-white/90">{relativeDay(first.dt, nowSeconds)}</span>
                    <span className="col-span-2 sm:col-span-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-white/75">
                      <span className="flex items-center gap-1"><ThermometerSun className="w-3.5 h-3.5" />{Math.round(avg(h => h.temp))}°C</span>
                      <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5" />{Math.round(avg(h => h.wind_speed))} m/s</span>
                      <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5" />{Math.round(Math.max(...slot.hours.map(h => h.pop)) * 100)}%</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{CROWD_LEVEL_LABELS[busiest.breakdown.crowd.level]}</span>
                    </span>
                    <span className="col-span-2 sm:col-span-1 flex items-center gap-2 text-xs">
                      <span className={`font-display text-sm uppercase tracking-wider rounded px-1.5 py-0.5 whitespace-nowrap ${tag.className}`}>{tag.text}</span>
                      <span className="text-white/60 truncate">
                        {worst && worst.points >= 3 ? `${worst.label} -${Math.round(worst.points)}` : 'Clear'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
