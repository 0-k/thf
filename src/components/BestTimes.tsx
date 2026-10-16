import React from 'react';
import { Droplets, ThermometerSun, TrendingUp, Users, Wind } from 'lucide-react';
import type { ScoredHour, Slot } from '../utils/ranking';
import { CROWD_LEVEL_LABELS, getScoreColor } from '../utils/display';
import { berlinParts, formatDay, formatHour } from '../utils/time';

interface BestTimesProps {
  slots: Slot[];
  nowSeconds: number;
  onSelect: (hour: ScoredHour) => void;
}

const relativeDay = (dt: number, nowSeconds: number): string => {
  const today = berlinParts(nowSeconds).dateKey;
  const tomorrow = berlinParts(nowSeconds + 86400).dateKey;
  const key = berlinParts(dt).dateKey;
  if (key === today) return 'Today';
  if (key === tomorrow) return 'Tomorrow';
  return formatDay(dt);
};

export default function BestTimes({ slots, nowSeconds, onSelect }: BestTimesProps): React.ReactElement {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-bold text-gray-800">Best Times to Go (Next 4 Days)</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">Average score over a typical 2-hour visit; picks don&apos;t overlap.</p>

      {slots.length === 0 ? (
        <p className="text-sm text-gray-600">No open hours with a usable forecast in this period.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {slots.map((slot, idx) => {
            const first = slot.start;
            const end = slot.hours[slot.hours.length - 1]!.dt + 3600;
            const worst = slot.hours
              .flatMap(h => h.breakdown.penalties)
              .sort((a, b) => b.points - a.points)[0];
            const avg = (pick: (h: ScoredHour) => number): number =>
              slot.hours.reduce((s, h) => s + pick(h), 0) / slot.hours.length;
            const crowdLevel = slot.hours.reduce(
              (busiest, h) => (h.breakdown.crowd.index > busiest.breakdown.crowd.index ? h : busiest),
              first
            ).breakdown.crowd.level;

            return (
              <button
                type="button"
                key={first.dt}
                onClick={() => onSelect(first)}
                className="border-2 rounded-lg p-3 transition-all hover:scale-[1.02] cursor-pointer text-left"
                style={getScoreColor(slot.score)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-600">#{idx + 1} · {relativeDay(first.dt, nowSeconds)}</div>
                    <div className="text-sm font-semibold text-gray-900">{formatHour(first.dt)}–{formatHour(end)}</div>
                  </div>
                  <div className="text-2xl font-bold leading-none">{slot.score}</div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mt-2">
                  <span className="flex items-center gap-1"><ThermometerSun className="w-3 h-3" />{Math.round(avg(h => h.temp))}°C</span>
                  <span className="flex items-center gap-1"><Wind className="w-3 h-3" />{Math.round(avg(h => h.wind_speed))} m/s</span>
                  <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{Math.round(Math.max(...slot.hours.map(h => h.pop)) * 100)}%</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{CROWD_LEVEL_LABELS[crowdLevel]}</span>
                </div>
                <div className="text-[11px] text-gray-700 mt-1.5">
                  {worst && worst.points >= 3 ? `Main drawback: ${worst.label.toLowerCase()} (-${Math.round(worst.points)})` : 'Nothing significant holding it back'}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
