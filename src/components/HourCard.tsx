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

// Closed hours: hatched asphalt, like a closed runway section
const CLOSED_CLASSES =
  'text-slate-400 bg-[repeating-linear-gradient(135deg,#3a3d41_0px,#3a3d41_5px,#323538_5px,#323538_10px)]';

/** One painted slab of the day's runway strip. */
export default function HourCard({ hour, nowSeconds, onSelect }: HourCardProps): React.ReactElement {
  const status = hour.breakdown.status;
  const isClosed = status === 'closed';
  const isPast = hour.dt + 3600 <= nowSeconds;
  const isNow = hour.dt <= nowSeconds && nowSeconds < hour.dt + 3600;
  const colors = getScoreColor(hour.score);

  return (
    <button
      type="button"
      onClick={() => onSelect(hour)}
      className={`relative rounded-md p-1.5 transition-all hover:-translate-y-0.5 hover:brightness-105 cursor-pointer text-left ${
        isClosed ? CLOSED_CLASSES : ''
      } ${isPast ? 'opacity-50' : ''} ${isNow ? 'outline outline-[3px] outline-sock z-10' : ''}`}
      style={isClosed ? undefined : { backgroundColor: colors.backgroundColor, color: colors.color }}
      aria-label={`${formatHour(hour.dt)}: ${isClosed ? 'closed' : `score ${hour.score}`}`}
    >
      {isNow && (
        <span aria-hidden="true" className="absolute -top-[10px] left-1/2 -translate-x-1/2 border-x-[6px] border-x-transparent border-t-[7px] border-t-sock" />
      )}
      <div className="flex flex-col items-center mb-0.5">
        <div className={`text-[10px] font-semibold w-full text-center ${isClosed ? '' : 'opacity-80'} ${isNow ? 'uppercase tracking-wider' : ''}`}>
          {isNow ? 'Now' : formatHour(hour.dt)}
        </div>
        <div className="font-display text-lg font-extrabold leading-none my-0.5 tabular-nums">
          {isClosed ? '-' : status === 'thunderstorm' ? '⚡' : hour.score}
        </div>
      </div>

      <div className="space-y-0.5 text-xs tabular-nums">
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
