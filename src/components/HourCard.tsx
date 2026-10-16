import React from 'react';
import { Droplets, ThermometerSun, Users, Wind } from 'lucide-react';
import type { ScoredHour } from '../utils/ranking';
import { CLOSED_COLORS, CROWD_LEVEL_DOTS, CROWD_LEVEL_LABELS, getScoreColor } from '../utils/display';
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

export default function HourCard({ hour, nowSeconds, onSelect }: HourCardProps): React.ReactElement {
  const status = hour.breakdown.status;
  const isClosed = status === 'closed';
  const isPast = hour.dt + 3600 <= nowSeconds;
  const isNow = hour.dt <= nowSeconds && nowSeconds < hour.dt + 3600;
  const colors = isClosed ? CLOSED_COLORS : getScoreColor(hour.score);

  return (
    <button
      type="button"
      onClick={() => onSelect(hour)}
      className={`border-2 rounded-lg p-1.5 transition-all hover:scale-105 cursor-pointer text-left ${
        isPast || isClosed ? 'opacity-40' : ''
      } ${isNow ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
      style={colors}
      aria-label={`${formatHour(hour.dt)}: ${isClosed ? 'closed' : `score ${hour.score}`}`}
    >
      <div className="flex flex-col items-center mb-0.5">
        <div className={`text-[10px] font-semibold w-full text-center ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>
          {isNow ? 'Now' : formatHour(hour.dt)}
        </div>
        <div className={`text-lg font-bold leading-tight ${isPast ? 'text-gray-400' : ''}`}>
          {isClosed ? '-' : status === 'thunderstorm' ? '⚡' : hour.score}
        </div>
      </div>

      <div className={`space-y-0.5 text-xs ${isPast ? 'text-gray-500' : ''}`}>
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
