import React from 'react';
import { ArrowDown, ArrowUp, Droplets, Wind } from 'lucide-react';
import type { ScoredHour, Slot } from '../utils/ranking';
import { HEADING, LABEL, getScoreColor } from '../utils/display';
import { formatHour, formatShortDate, formatWeekday } from '../utils/time';
import HourCard from './HourCard';
import { ThresholdKeys } from './Runway';

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

const RunwayEnd = ({ label, flip = false }: { label: string; flip?: boolean }): React.ReactElement => (
  <span aria-hidden="true" className={`hidden lg:flex items-center gap-1.5 text-white ${flip ? 'flex-row-reverse' : ''}`}>
    <ThresholdKeys count={4} className="h-14 !w-1" />
    <span className="font-display font-extrabold text-[17px] [font-stretch:75%]">{label}</span>
  </span>
);

export default function DaySection({ day, relativeLabel, best, lessReliable, nowSeconds, onSelect }: DaySectionProps): React.ReactElement {
  // Split hours into two rows
  const midpoint = Math.ceil(day.hours.length / 2);
  const morningHours = day.hours.slice(0, midpoint);
  const afternoonHours = day.hours.slice(midpoint);
  const firstDt = day.hours[0]!.dt;
  const stats = dayStats(day.hours);
  const bestColors = best ? getScoreColor(best.score) : null;

  return (
    <section id={`day-${day.key}`} className="scroll-mt-4 bg-tarmac text-white px-3 py-4 sm:px-4 sm:py-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-4 px-1">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <h3 className={`${HEADING} text-2xl sm:text-3xl`}>{relativeLabel ?? formatWeekday(firstDt)}</h3>
            <span className={LABEL}>
              {relativeLabel ? `${formatWeekday(firstDt)} · ` : ''}{formatShortDate(firstDt)}
            </span>
            {day.holiday && <span className={`${LABEL} bg-white text-ink px-1.5 py-0.5`}>{day.holiday}</span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
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
            className="flex items-stretch bg-white text-ink text-left transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="px-3 py-1.5 leading-tight">
              <span className="block text-[10px] uppercase tracking-[0.12em]">Best window</span>
              <span className="font-display text-lg font-black [font-stretch:85%] tabular-nums">
                {formatHour(best.start.dt)}–{formatHour(best.start.dt + best.hours.length * 3600)}
              </span>
            </span>
            <span className="grid place-items-center px-3 font-display text-2xl font-black tabular-nums" style={{ backgroundColor: bestColors.backgroundColor }}>
              {best.score}
            </span>
          </button>
        )}
      </div>
      {lessReliable && (
        <p className="text-xs text-white/80 -mt-2 mb-3 px-1">Forecasts this far ahead are less reliable.</p>
      )}

      {/* The two rows are the field's two parallel runways (2-row grid kept as is) */}
      <div className="space-y-3">
        {([[morningHours, '09L', '27R'], [afternoonHours, '09R', '27L']] as const).map(([rowHours, left, right]) => (
          <div key={left} className="flex items-stretch gap-2.5">
            <RunwayEnd label={left} />
            <div className="flex-1 min-w-0 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-[3px]">
              {rowHours.map(hour => <HourCard key={hour.dt} hour={hour} nowSeconds={nowSeconds} onSelect={onSelect} />)}
            </div>
            <RunwayEnd label={right} flip />
          </div>
        ))}
      </div>
    </section>
  );
}
