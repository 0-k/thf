import React from 'react';
import { ArrowDown, ArrowUp, Droplets, Wind } from 'lucide-react';
import type { ScoredHour, Slot } from '../utils/ranking';
import { getScoreColor } from '../utils/display';
import { formatHour, formatShortDate, formatWeekday } from '../utils/time';
import HourCard from './HourCard';

export interface DayGroup {
  key: string;
  label: string;
  holiday: string | null;
  hours: ScoredHour[];
}

export interface DayStats {
  high: number;
  low: number;
  maxPop: number;
  maxWind: number;
}

/** Stats over the open hours (all hours if the field never opens that day). */
export const dayStats = (hours: ScoredHour[]): DayStats => {
  const open = hours.filter(h => h.breakdown.status !== 'closed');
  const pool = open.length > 0 ? open : hours;
  return {
    high: Math.max(...pool.map(h => h.temp)),
    low: Math.min(...pool.map(h => h.temp)),
    maxPop: Math.max(...pool.map(h => h.pop)),
    maxWind: Math.max(...pool.map(h => h.wind_speed)),
  };
};

interface DaySectionProps {
  day: DayGroup;
  /** "Today" / "Tomorrow" / null */
  relativeLabel: string | null;
  best: Slot | null;
  lessReliable: boolean;
  nowSeconds: number;
  onSelect: (hour: ScoredHour) => void;
}

export default function DaySection({ day, relativeLabel, best, lessReliable, nowSeconds, onSelect }: DaySectionProps): React.ReactElement {
  // Split hours into two rows
  const midpoint = Math.ceil(day.hours.length / 2);
  const morningHours = day.hours.slice(0, midpoint);
  const afternoonHours = day.hours.slice(midpoint);
  const firstDt = day.hours[0]!.dt;
  const stats = dayStats(day.hours);
  const bestColors = best ? getScoreColor(best.score) : null;

  return (
    <section id={`day-${day.key}`} className="scroll-mt-4 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-display text-3xl sm:text-4xl font-bold uppercase leading-none text-slate-900">
              {relativeLabel ?? formatWeekday(firstDt)}
            </h3>
            <span className="font-display text-xl uppercase tracking-wide text-slate-400">
              {relativeLabel ? `${formatWeekday(firstDt)} · ` : ''}{formatShortDate(firstDt)}
            </span>
            {day.holiday && (
              <span className="self-center text-xs font-medium text-violet-700 bg-violet-50 ring-1 ring-violet-200 px-2 py-0.5 rounded-full">
                {day.holiday}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-0.5"><ArrowUp className="w-3.5 h-3.5" />{Math.round(stats.high)}°C</span>
            <span className="flex items-center gap-0.5"><ArrowDown className="w-3.5 h-3.5" />{Math.round(stats.low)}°C</span>
            <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5" />up to {Math.round(stats.maxPop * 100)}%</span>
            <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5" />up to {Math.round(stats.maxWind)} m/s</span>
          </div>
        </div>
        {best && bestColors && (
          <button
            type="button"
            onClick={() => onSelect(best.start)}
            className="flex items-center gap-3 rounded-2xl border px-3 py-1.5 transition hover:shadow-md"
            style={bestColors}
          >
            <span className="text-left leading-tight">
              <span className="block text-[10px] uppercase tracking-[0.2em] opacity-75">Best window</span>
              <span className="font-display text-xl font-semibold">
                {formatHour(best.start.dt)}–{formatHour(best.start.dt + best.hours.length * 3600)}
              </span>
            </span>
            <span className="font-display text-3xl font-bold">{best.score}</span>
          </button>
        )}
      </div>
      {lessReliable && (
        <p className="text-xs text-slate-500 -mt-2 mb-3">Forecasts this far ahead are less reliable.</p>
      )}

      <div className="space-y-2">
        {/* First row */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 sm:gap-2">
          {morningHours.map(hour => <HourCard key={hour.dt} hour={hour} nowSeconds={nowSeconds} onSelect={onSelect} />)}
        </div>

        {/* Second row */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 sm:gap-2">
          {afternoonHours.map(hour => <HourCard key={hour.dt} hour={hour} nowSeconds={nowSeconds} onSelect={onSelect} />)}
        </div>
      </div>
    </section>
  );
}
