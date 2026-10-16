import React from 'react';
import { Clock, Droplets, Navigation2, RefreshCw, Sunset, ThermometerSun, Users } from 'lucide-react';
import type { Activity } from '../utils/types';
import type { ScoredHour } from '../utils/ranking';
import type { OpeningHours } from '../utils/scoring';
import {
  ACTIVITIES,
  ACTIVITY_ACCENT_TEXT,
  ACTIVITY_LABELS,
  CROWD_LEVEL_LABELS,
  getScoreLabel,
} from '../utils/display';
import { SKY_GRADIENTS, type SkyPhase } from '../utils/sky';
import { berlinParts, formatClock, formatDecimalHours, formatHour, formatWeekday } from '../utils/time';
import ActivityIcon from './ActivityIcon';
import ScoreDial from './ScoreDial';
import Runway from './Runway';

interface HeroProps {
  activity: Activity;
  onActivityChange: (activity: Activity) => void;
  /** The hour slot containing "now" (null if outside the data) */
  current: ScoredHour | null;
  /** Next open hour when the field is closed right now */
  nextOpen: ScoredHour | null;
  nowSeconds: number;
  todayHours: OpeningHours;
  sunset: number;
  sky: SkyPhase;
  fetchedAt: number | null;
  showUpdated: boolean;
  loading: boolean;
  onRefresh: () => void;
}

const pad = (h: number): string => `${String(h).padStart(2, '0')}:00`;

function NowPanel({ current, nextOpen, nowSeconds, activityLabel }: {
  current: ScoredHour | null; nextOpen: ScoredHour | null; nowSeconds: number; activityLabel: string;
}): React.ReactElement {
  const status = current?.breakdown.status ?? null;
  const drawback = current?.breakdown.penalties[0];
  const sameDay = nextOpen ? berlinParts(nextOpen.dt).dateKey === berlinParts(nowSeconds).dateKey : false;

  let headline: string;
  let detail: string;
  if (!current || status === 'closed') {
    headline = 'Field closed';
    detail = nextOpen
      ? `Opens ${sameDay ? '' : `${formatWeekday(nextOpen.dt)} `}${formatHour(nextOpen.dt)} · first hour ${nextOpen.score}`
      : 'No forecast for the next opening yet';
  } else if (status === 'thunderstorm') {
    headline = 'Thunderstorm';
    detail = 'No shelter on the open field: stay off';
  } else {
    headline = getScoreLabel(current.score, 'open');
    detail = drawback && drawback.points >= 3
      ? `Main drawback: ${drawback.label.toLowerCase()} (-${Math.round(drawback.points)})`
      : 'Nothing significant holding it back';
  }

  return (
    <div className="rounded-3xl bg-black/25 ring-1 ring-white/15 backdrop-blur-sm p-4 sm:p-5 flex items-center gap-4 sm:gap-5">
      <ScoreDial score={current?.score ?? 0} status={status} />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">
          Right now · {current ? `${formatHour(current.dt)}–${formatHour(current.dt + 3600)}` : formatClock(nowSeconds)}
        </div>
        <div className="font-display text-3xl sm:text-4xl font-bold uppercase leading-tight">{headline}</div>
        <div className="text-sm text-white/80">{detail}</div>
        {current && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/90" aria-label={`Conditions for ${activityLabel}`}>
            <span className="flex items-center gap-1"><ThermometerSun className="w-4 h-4" />{Math.round(current.temp)}°C</span>
            <span className="flex items-center gap-1">
              {current.wind_deg !== undefined ? (
                // Arrow points where the wind blows to (meteorological degrees = where it comes from)
                <Navigation2 className="w-4 h-4" style={{ transform: `rotate(${current.wind_deg + 180}deg)` }} />
              ) : null}
              {Math.round(current.wind_speed)} m/s
            </span>
            <span className="flex items-center gap-1"><Droplets className="w-4 h-4" />{Math.round(current.pop * 100)}%</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{CROWD_LEVEL_LABELS[current.breakdown.crowd.level]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Hero(props: HeroProps): React.ReactElement {
  const { activity, onActivityChange, todayHours, sunset, sky, fetchedAt, showUpdated, loading, onRefresh } = props;

  return (
    <header className={`relative overflow-hidden rounded-3xl text-white shadow-xl ${SKY_GRADIENTS[sky]}`}>
      {/* soft sun/moon glow */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative p-5 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-bold tracking-[0.2em] bg-amber-400 text-slate-900 px-2 py-0.5 rounded text-sm shrink-0">THF</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/70 truncate">Berlin · former airport · 52.47°N 13.41°E</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-60 px-3 py-1.5 text-sm font-medium backdrop-blur transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="font-display font-bold uppercase leading-[0.85] tracking-tight text-6xl sm:text-7xl md:text-8xl">
              Tempelhofer<br />Feld
            </h1>
            <p className="mt-4 text-white/85 max-w-md">
              {ACTIVITY_LABELS[activity]} forecast for Berlin&apos;s old airfield: hourly scores, crowds and the best
              windows for the next days.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <Clock className="w-3.5 h-3.5" /> Open today {pad(todayHours.open)}–{pad(todayHours.close)}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <Sunset className="w-3.5 h-3.5" /> Sunset {formatDecimalHours(sunset)}
              </span>
              {showUpdated && fetchedAt !== null && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">Updated {formatClock(fetchedAt)}</span>
              )}
            </div>
          </div>
          <NowPanel current={props.current} nextOpen={props.nextOpen} nowSeconds={props.nowSeconds} activityLabel={ACTIVITY_LABELS[activity]} />
        </div>

        {/* Activity selector */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-black/25 ring-1 ring-white/10 max-w-2xl" role="group" aria-label="Activity">
          {ACTIVITIES.map(a => {
            const active = activity === a;
            return (
              <button
                key={a}
                onClick={() => onActivityChange(a)}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-display text-lg font-semibold uppercase tracking-wide transition-all ${
                  active ? 'bg-white text-slate-900 shadow-lg' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <ActivityIcon activity={a} className={`w-5 h-5 ${active ? ACTIVITY_ACCENT_TEXT[a] : ''}`} />
                {ACTIVITY_LABELS[a]}
              </button>
            );
          })}
        </div>
      </div>

      <Runway className="bg-black/25 border-t border-white/10" />
    </header>
  );
}
