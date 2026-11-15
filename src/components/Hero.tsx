import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { Activity } from '../utils/types';
import type { ScoredHour } from '../utils/ranking';
import type { OpeningHours } from '../utils/scoring';
import { ACTIVITIES, ACTIVITY_LABELS, CROWD_LEVEL_LABELS, compassDirection, getScoreLabel } from '../utils/display';
import { SKY_GRADIENTS, type SkyPhase } from '../utils/sky';
import { berlinParts, formatClock, formatDecimalHours, formatHour, formatWeekday } from '../utils/time';
import ActivityIcon from './ActivityIcon';
import ScoreDial from './ScoreDial';
import Runway from './Runway';
import Windsock from './Windsock';

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

// Dividers of the 2x2 (mobile) / 1x4 (desktop) activity grid
const TAB_BORDERS = ['border-r-2 border-b-2 sm:border-b-0', 'border-b-2 sm:border-b-0 sm:border-r-2', 'border-r-2', ''];

/** Faint mowing stripes across the grass */
export const MOWN_STRIPES = 'bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_48px,transparent_48px,transparent_96px)]';

function NowPanel({ current, nextOpen, nowSeconds, activity }: {
  current: ScoredHour | null; nextOpen: ScoredHour | null; nowSeconds: number; activity: Activity;
}): React.ReactElement {
  const status = current?.breakdown.status ?? null;
  const drawback = current?.breakdown.penalties[0];
  const sameDay = nextOpen ? berlinParts(nextOpen.dt).dateKey === berlinParts(nowSeconds).dateKey : false;
  const activityLabel = ACTIVITY_LABELS[activity];

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
    headline = `${getScoreLabel(current.score, 'open')} for ${activityLabel.toLowerCase()}`;
    detail = drawback && drawback.points >= 3
      ? `Main drawback: ${drawback.label.toLowerCase()} (-${Math.round(drawback.points)})`
      : 'Nothing significant holding it back';
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-4" aria-live="polite">
      <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1 basis-72">
        <ScoreDial score={current?.score ?? 0} status={status} />
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/70">
            Right now · {current ? `${formatHour(current.dt)}–${formatHour(current.dt + 3600)}` : formatClock(nowSeconds)}
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold leading-tight">{headline}</div>
          <div className="text-sm text-white/85">{detail}</div>
          {current && (
            <div className="mt-1 text-sm text-white/85 tabular-nums" aria-label={`Conditions for ${activityLabel}`}>
              {Math.round(current.temp)}°C · {Math.round(current.pop * 100)}% rain · {CROWD_LEVEL_LABELS[current.breakdown.crowd.level].toLowerCase()}
            </div>
          )}
        </div>
      </div>
      {current && (
        <div className="flex sm:flex-col items-center gap-3 sm:gap-1 text-xs text-white/85 tabular-nums">
          <Windsock speed={current.wind_speed} className="w-24 sm:w-28 h-auto" />
          <span>
            {Math.round(current.wind_speed)} m/s{current.wind_deg !== undefined ? ` from ${compassDirection(current.wind_deg)}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Hero(props: HeroProps): React.ReactElement {
  const { activity, onActivityChange, todayHours, sunset, sky, fetchedAt, showUpdated, loading, onRefresh } = props;

  return (
    <header className={`relative overflow-hidden rounded-2xl text-white shadow-lg ${SKY_GRADIENTS[sky]}`}>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${MOWN_STRIPES}`} />

      <div className="relative px-5 pt-5 pb-6 sm:px-8 sm:pt-7">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/75 leading-relaxed tabular-nums min-w-0">
            <span className="font-bold text-white">THF</span> · Berlin · 52.47°N 13.41°E
            <span className="hidden sm:inline"> · </span><br className="sm:hidden" />
            Open {pad(todayHours.open)}–{pad(todayHours.close)} · sunset {formatDecimalHours(sunset)}
            {showUpdated && fetchedAt !== null && <> · updated {formatClock(fetchedAt)}</>}
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-md border border-white/50 hover:bg-white/15 disabled:opacity-60 px-2.5 py-1.5 text-sm font-medium transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Refresh</span>
          </button>
        </div>

        <h1 className="mt-4 font-display font-extrabold [font-stretch:112%] leading-[0.95] tracking-tight text-[clamp(2.1rem,10.5vw,3rem)] sm:text-6xl">
          Tempelhofer Feld
        </h1>
        <p className="mt-2 text-white/85 max-w-xl">
          {ACTIVITY_LABELS[activity]} forecast for Berlin&apos;s old airfield: hourly scores, crowds and the best
          windows for the next days.
        </p>
      </div>

      <Runway className="relative" />

      <div className="relative px-5 py-6 sm:px-8 space-y-6">
        <NowPanel current={props.current} nextOpen={props.nextOpen} nowSeconds={props.nowSeconds} activity={activity} />

        {/* Activity selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-lg border-2 border-white/80 overflow-hidden max-w-2xl" role="group" aria-label="Activity">
          {ACTIVITIES.map((a, i) => {
            const active = activity === a;
            return (
              <button
                key={a}
                onClick={() => onActivityChange(a)}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 font-display text-[15px] font-bold transition-colors border-white/80 ${TAB_BORDERS[i] ?? ''} ${
                  active ? 'bg-sock text-white' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <ActivityIcon activity={a} className="w-5 h-5" />
                {ACTIVITY_LABELS[a]}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
