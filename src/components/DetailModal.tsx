import React, { useEffect } from 'react';
import { CloudSun, Droplets, Eye, Leaf, Navigation2, Sun, ThermometerSun, Users, Wind, X, Zap } from 'lucide-react';
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
import ActivityIcon from './ActivityIcon';

interface DetailModalProps {
  hour: ScoredHour;
  activity: Activity;
  onClose: () => void;
}

const Tile = ({ icon, title, value, sub }: {
  icon: React.ReactNode; title: string; value: React.ReactNode; sub?: string | undefined;
}): React.ReactElement => (
  <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-100 p-3">
    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
      {icon}
      <span className="text-[11px] font-medium uppercase tracking-wider">{title}</span>
    </div>
    <div className="font-display text-2xl font-bold text-slate-900 leading-none">{value}</div>
    {sub && <div className="text-xs text-slate-500 mt-1 truncate">{sub}</div>}
  </div>
);

const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.ReactElement => (
  <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100 last:border-0">
    <span className="text-slate-500 flex items-center gap-1.5">{icon}{label}</span>
    <span className="font-medium text-slate-800">{value}</span>
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
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${formatLongDay(hour.dt)} ${formatHour(hour.dt)}`}
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Score header */}
        <div className="relative px-5 pt-5 pb-4 sm:rounded-t-3xl rounded-t-3xl" style={{ backgroundColor: colors.backgroundColor, color: colors.color }}>
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 sm:hidden" aria-hidden="true" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/50 hover:bg-white/80 p-1.5 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-end justify-between gap-4 pr-10">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                <ActivityIcon activity={activity} className="w-4 h-4" />{ACTIVITY_LABELS[activity]}
              </div>
              <h2 className="font-display text-3xl font-bold uppercase leading-none mt-1">{formatLongDay(hour.dt)}</h2>
              <p className="font-display text-xl tracking-wide opacity-80">
                {formatHour(hour.dt)}–{formatHour(hour.dt + 3600)}
                {crowd.holiday && <span> · {crowd.holiday}</span>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-6xl font-bold leading-none">
                {breakdown.status === 'closed' ? '–' : breakdown.status === 'thunderstorm' ? '⚡' : hour.score}
              </div>
              <div className="font-display text-lg uppercase tracking-wider">{getScoreLabel(hour.score, breakdown.status)}</div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Why */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">What&apos;s holding it back</h3>
            {breakdown.status === 'closed' && (
              <p className="text-sm text-slate-600">
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
              <p className="text-sm text-emerald-700">Nothing: ideal conditions.</p>
            )}
            {breakdown.status === 'open' && breakdown.penalties.length > 0 && (
              <ul className="space-y-2">
                {breakdown.penalties.map(p => (
                  <li key={p.factor} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-700">
                        <span className="font-semibold">{p.label}</span>
                        <span className="text-slate-500"> · {p.detail}</span>
                      </span>
                      <span className="font-display text-lg font-bold text-slate-900 tabular-nums leading-none">
                        -{p.points < 1 ? p.points.toFixed(1) : Math.round(p.points)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1">
                      <div className="h-1.5 bg-rose-400 rounded-full" style={{ width: `${(p.points / maxPoints) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weather Details */}
          <div className="grid grid-cols-2 gap-2">
            <Tile
              icon={<ThermometerSun className="w-4 h-4" />}
              title="Temperature"
              value={`${Math.round(hour.temp)}°C`}
              sub={hour.feels_like !== undefined ? `Feels ${Math.round(hour.feels_like)}°C` : undefined}
            />
            <Tile
              icon={<Wind className="w-4 h-4" />}
              title="Wind"
              value={
                <span className="flex items-center gap-1.5">
                  {Math.round(hour.wind_speed)} m/s
                  {hour.wind_deg !== undefined && (
                    <Navigation2
                      className="w-5 h-5 text-slate-500"
                      style={{ transform: `rotate(${hour.wind_deg + 180}deg)` }}
                      aria-label={`blowing towards ${compassDirection(hour.wind_deg + 180)}`}
                    />
                  )}
                </span>
              }
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
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1">Additional Details</h3>
            <Row
              icon={<Leaf className="w-4 h-4" />}
              label="Air quality (EAQI)"
              value={eaqi !== undefined ? `${Math.round(eaqi)} · ${aqiCategory(eaqi)}` : 'not available'}
            />
            {hour.uvi !== undefined && <Row icon={<Sun className="w-4 h-4" />} label="UV index" value={hour.uvi.toFixed(1)} />}
            {hour.clouds !== undefined && <Row icon={<CloudSun className="w-4 h-4" />} label="Cloud cover" value={`${Math.round(hour.clouds)}%`} />}
            {hour.visibility !== undefined && (
              <Row icon={<Eye className="w-4 h-4" />} label="Visibility" value={`${(hour.visibility / 1000).toFixed(1)} km`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
