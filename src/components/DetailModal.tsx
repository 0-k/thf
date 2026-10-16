import React, { useEffect } from 'react';
import { CloudSun, Droplets, Leaf, ThermometerSun, Users, Wind, X, Zap } from 'lucide-react';
import type { ScoredHour } from '../utils/ranking';
import type { Activity } from '../utils/types';
import { aqiCategory, getOpeningHours } from '../utils/scoring';
import {
  ACTIVITY_LABELS,
  CLOSED_COLORS,
  CROWD_LEVEL_LABELS,
  DAY_TYPE_LABELS,
  compassDirection,
  getScoreColor,
  getScoreLabel,
} from '../utils/display';
import { formatHour, formatLongDay } from '../utils/time';

interface DetailModalProps {
  hour: ScoredHour;
  activity: Activity;
  onClose: () => void;
}

const Tile = ({ icon, title, value, sub }: {
  icon: React.ReactNode; title: string; value: string; sub?: string | undefined;
}): React.ReactElement => (
  <div className="bg-gray-50 p-2 rounded-lg">
    <div className="flex items-center gap-1 text-gray-600 mb-0.5">
      {icon}
      <span className="text-xs font-medium">{title}</span>
    </div>
    <div className="text-xl font-bold text-gray-800">{value}</div>
    {sub && <div className="text-xs text-gray-600 truncate">{sub}</div>}
  </div>
);

export default function DetailModal({ hour, activity, onClose }: DetailModalProps): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { breakdown } = hour;
  const { crowd } = breakdown;
  const colors = breakdown.status === 'closed' ? CLOSED_COLORS : getScoreColor(hour.score);
  const opening = getOpeningHours(new Date(hour.dt * 1000));
  const precipMm = hour.rain?.['1h'];
  const eaqi = hour.air_quality?.european_aqi;
  const maxPoints = Math.max(20, ...breakdown.penalties.map(p => p.points));

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${formatLongDay(hour.dt)} ${formatHour(hour.dt)}`}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{formatLongDay(hour.dt)}</h2>
              <p className="text-sm text-gray-600">
                {formatHour(hour.dt)}–{formatHour(hour.dt + 3600)}
                {crowd.holiday && <span className="ml-2 text-purple-700">· {crowd.holiday}</span>}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 -mt-1" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            {/* Score */}
            <div className="inline-block self-start px-4 py-2 rounded-lg border-2 shrink-0" style={colors}>
              <div className="text-xs font-medium opacity-80">{ACTIVITY_LABELS[activity]} Score</div>
              <div className="text-3xl font-bold">
                {breakdown.status === 'closed' ? '-' : hour.score}
              </div>
              <div className="text-xs opacity-80">{getScoreLabel(hour.score, breakdown.status)}</div>
            </div>

            {/* Why */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs text-gray-700 mb-1.5">What&apos;s holding it back</h3>
              {breakdown.status === 'closed' && (
                <p className="text-sm text-gray-600">
                  The field is closed. Opening hours this month: {String(opening.open).padStart(2, '0')}:00–
                  {String(opening.close).padStart(2, '0')}:00 (approx., gates follow daylight).
                </p>
              )}
              {breakdown.status === 'thunderstorm' && (
                <p className="text-sm text-red-700 flex items-center gap-1">
                  <Zap className="w-4 h-4 shrink-0" /> Thunderstorm risk: no shelter on the open field.
                </p>
              )}
              {breakdown.status === 'open' && breakdown.penalties.length === 0 && (
                <p className="text-sm text-green-700">Nothing: ideal conditions.</p>
              )}
              {breakdown.status === 'open' && breakdown.penalties.length > 0 && (
                <ul className="space-y-1">
                  {breakdown.penalties.map(p => (
                    <li key={p.factor} className="text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-700">
                          <span className="font-medium">{p.label}</span>
                          <span className="text-gray-500"> · {p.detail}</span>
                        </span>
                        <span className="font-semibold text-gray-800 tabular-nums">
                          -{p.points < 1 ? p.points.toFixed(1) : Math.round(p.points)}
                        </span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded mt-0.5">
                        <div className="h-1 bg-red-400 rounded" style={{ width: `${(p.points / maxPoints) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Weather Details */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Tile
              icon={<ThermometerSun className="w-4 h-4" />}
              title="Temperature"
              value={`${Math.round(hour.temp)}°C`}
              sub={hour.feels_like !== undefined ? `Feels ${Math.round(hour.feels_like)}°C` : undefined}
            />
            <Tile
              icon={<Wind className="w-4 h-4" />}
              title="Wind"
              value={`${Math.round(hour.wind_speed)} m/s`}
              sub={[
                hour.wind_deg !== undefined ? `from ${compassDirection(hour.wind_deg)}` : null,
                hour.wind_gust !== undefined && hour.wind_gust > hour.wind_speed ? `gusts ${Math.round(hour.wind_gust)} m/s` : null,
              ].filter(Boolean).join(', ') || undefined}
            />
            <Tile
              icon={<Droplets className="w-4 h-4" />}
              title="Precipitation"
              value={`${Math.round(hour.pop * 100)}%`}
              sub={[precipMm ? `${precipMm.toFixed(1)} mm` : null, hour.weather[0]?.description].filter(Boolean).join(' · ')}
            />
            <Tile
              icon={<Users className="w-4 h-4" />}
              title="Crowds (estimate)"
              value={CROWD_LEVEL_LABELS[crowd.level]}
              sub={`${crowd.index}/100 · ${crowd.holiday ? 'holiday' : DAY_TYPE_LABELS[crowd.dayType]}`}
            />
          </div>

          {/* Additional Details */}
          <div className="border-t pt-2 space-y-1">
            <h3 className="font-semibold text-xs text-gray-700 mb-1.5">Additional Details</h3>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1"><Leaf className="w-3 h-3" /> Air quality (EAQI)</span>
              <span className="font-medium text-gray-800">
                {eaqi !== undefined ? `${Math.round(eaqi)} · ${aqiCategory(eaqi)}` : 'not available'}
              </span>
            </div>
            {hour.uvi !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">UV Index</span>
                <span className="font-medium text-gray-800">{hour.uvi.toFixed(1)}</span>
              </div>
            )}
            {hour.clouds !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1"><CloudSun className="w-3 h-3" /> Cloud Cover</span>
                <span className="font-medium text-gray-800">{Math.round(hour.clouds)}%</span>
              </div>
            )}
            {hour.visibility !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Visibility</span>
                <span className="font-medium text-gray-800">{(hour.visibility / 1000).toFixed(1)} km</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
