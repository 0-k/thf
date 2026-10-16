import React from 'react';
import { Droplets, ThermometerSun, Users, Wind } from 'lucide-react';
import type { ScoredHour } from '../utils/ranking';
import { CROWD_LEVEL_DOTS, CROWD_LEVEL_LABELS, getScoreColor } from '../utils/display';
import { formatHour } from '../utils/time';

export const CrowdDots = ({ level }: { level: keyof typeof CROWD_LEVEL_DOTS }): React.ReactElement => (
  <span className="inline-flex items-center gap-px" aria-label={`Crowds: ${CROWD_LEVEL_LABELS[level]}`}>
    {[1, 2, 3, 4].map(i => (
      <span
        key={i}
        className={`w-1 h-1 rounded-full bg-current ${i <= CROWD_LEVEL_DOTS[level] ? '' : 'opacity-25'}`}
      />
    ))}
  </span>
);

interface HourCardProps {
  hour: ScoredHour;
  nowSeconds: number;
  onSelect: (hour: ScoredHour) => void;
}

// Closed hours: light hatching, like a closed runway section
const CLOSED_CLASSES =
  'border-slate-200 text-slate-400 bg-[repeating-linear-gradient(135deg,#f1f5f9_0px,#f1f5f9_4px,#ffffff_4px,#ffffff_8px)]';

export default function HourCard({ hour, nowSeconds, onSelect }: HourCardProps): React.ReactElement {
  const status = hour.breakdown.status;
  const isClosed = status === 'closed';
  const isPast = hour.dt + 3600 <= nowSeconds;
  const isNow = hour.dt <= nowSeconds && nowSeconds < hour.dt + 3600;

  return (
    <button
      type="button"
      onClick={() => onSelect(hour)}
      className={`relative border rounded-xl p-1.5 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer text-left ${
        isClosed ? CLOSED_CLASSES : ''
      } ${isPast ? 'opacity-40' : ''} ${isNow ? 'ring-2 ring-amber-400 ring-offset-2 shadow-md' : ''}`}
      style={isClosed ? undefined : getScoreColor(hour.score)}
      aria-label={`${formatHour(hour.dt)}: ${isClosed ? 'closed' : `score ${hour.score}`}`}
    >
      <div className="flex flex-col items-center mb-0.5">
        <div className={`text-[10px] font-semibold w-full text-center ${isClosed ? '' : 'text-slate-700'} ${isNow ? 'uppercase tracking-wider' : ''}`}>
          {isNow ? 'Now' : formatHour(hour.dt)}
        </div>
        <div className="font-display text-xl font-bold leading-none my-0.5">
          {isClosed ? '-' : status === 'thunderstorm' ? '⚡' : hour.score}
        </div>
      </div>

      <div className="space-y-0.5 text-xs">
        <div className="flex items-center justify-center gap-1">
          <ThermometerSun className="w-3 h-3" />
          <span>{Math.round(hour.temp)}°C</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <Wind className="w-3 h-3" />
          <span>{Math.round(hour.wind_speed)}</span>
        </div>
        <div className="flex items-center justify-center gap-1">
          <Droplets className="w-3 h-3" />
          <span>{Math.round(hour.pop * 100)}%</span>
        </div>
        {!isClosed && (
          <div className="flex items-center justify-center gap-1 h-4">
            <Users className="w-3 h-3" />
            <CrowdDots level={hour.breakdown.crowd.level} />
          </div>
        )}
      </div>
    </button>
  );
}
