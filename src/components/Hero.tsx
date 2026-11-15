import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { Activity } from '../utils/types';
import type { ScoredHour } from '../utils/ranking';
import type { OpeningHours } from '../utils/scoring';
import { ACTIVITIES, ACTIVITY_LABELS, CROWD_LEVEL_LABELS, HEADING, LABEL, compassDirection, getScoreLabel } from '../utils/display';
import { berlinParts, formatClock, formatDecimalHours, formatHour, formatShortDate, formatWeekday, formatWeekdayShort } from '../utils/time';
import ActivityIcon from './ActivityIcon';
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
  fetchedAt: number | null;
  showUpdated: boolean;
  loading: boolean;
  onRefresh: () => void;
}

const pad = (h: number): string => `${String(h).padStart(2, '0')}:00`;

// Dividers of the 2x2 (mobile) / 1x4 (desktop) activity grid
const TAB_BORDERS = ['border-r-[3px] border-b-[3px] sm:border-b-0', 'border-b-[3px] sm:border-b-0 sm:border-r-[3px]', 'border-r-[3px]', ''];

function NowRow({ current, nextOpen, nowSeconds, activity }: {
  current: ScoredHour | null; nextOpen: ScoredHour | null; nowSeconds: number; activity: Activity;
}): React.ReactElement {
  const status = current?.breakdown.status ?? null;
  const drawback = current?.breakdown.penalties[0];
  const sameDay = nextOpen ? berlinParts(nextOpen.dt).dateKey === berlinParts(nowSeconds).dateKey : false;
  const activityLabel = ACTIVITY_LABELS[activity];
  const isOpen = current !== null && status === 'open';

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
    <div className="grid grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] gap-x-5 gap-y-4 items-center" aria-live="polite">
      <div
        className="grid place-items-center rounded-full border-[10px] border-white w-[clamp(7.25rem,28vw,10.5rem)] aspect-square font-display font-black tabular-nums leading-none text-[clamp(3rem,12vw,4.8rem)]"
        role="img"
        aria-label={isOpen ? `Score ${current.score} of 100` : status === 'thunderstorm' ? 'Thunderstorm' : 'Closed'}
      >
        {isOpen ? current.score : status === 'thunderstorm' ? '⚡' : '–'}
      </div>
      <div className="min-w-0">
        <div className={LABEL}>
          Right now · {current ? `${formatHour(current.dt)}–${formatHour(current.dt + 3600)}` : formatClock(nowSeconds)}
        </div>
        <div className={`${HEADING} text-[clamp(1.25rem,4vw,2rem)] mt-1.5`}>{headline}</div>
        <div className="text-sm mt-2 tabular-nums">
          {current && <>{Math.round(current.temp)}°C · {Math.round(current.pop * 100)}% rain · {CROWD_LEVEL_LABELS[current.breakdown.crowd.level].toLowerCase()}.<br /></>}
          {detail}
        </div>
      </div>
      {current && (
        <div className="col-span-2 lg:col-span-1 flex lg:flex-col items-center gap-3 lg:gap-1 text-xs tabular-nums" aria-label={`Conditions for ${activityLabel}`}>
          <Windsock speed={current.wind_speed} className="w-28 lg:w-32 h-auto" />
          <span>
            {Math.round(current.wind_speed)} m/s{current.wind_deg !== undefined ? ` from ${compassDirection(current.wind_deg)}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Hero(props: HeroProps): React.ReactElement {
  const { activity, onActivityChange, todayHours, sunset, fetchedAt, showUpdated, loading, onRefresh, nowSeconds } = props;

  return (
    <header className="text-white">
      <div className="flex items-start justify-between gap-3">
        <div className={`${LABEL} tabular-nums min-w-0 flex flex-wrap gap-x-6 gap-y-0.5 flex-1 justify-between`}>
          <span>THF · EDDI · 52.47°N 13.41°E</span>
          <span>
            {formatWeekdayShort(nowSeconds)} {formatShortDate(nowSeconds)} · open {pad(todayHours.open)}–{pad(todayHours.close)} · sunset {formatDecimalHours(sunset)}
            {showUpdated && fetchedAt !== null && <> · updated {formatClock(fetchedAt)}</>}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 border-2 border-white hover:bg-white hover:text-field disabled:opacity-60 px-2 py-1 text-xs uppercase tracking-wider transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Refresh</span>
        </button>
      </div>

      <h1 className="mt-3.5 font-display font-black uppercase [font-stretch:125%] leading-[0.84] tracking-[-0.02em] text-[clamp(2.2rem,9.4vw,6.2rem)]">
        Tempel&shy;hofer Feld
      </h1>

      <Runway className="mt-6" />

      <div className="mt-6 space-y-6">
        <NowRow current={props.current} nextOpen={props.nextOpen} nowSeconds={nowSeconds} activity={activity} />

        {/* Activity selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-[3px] border-white" role="group" aria-label="Activity">
          {ACTIVITIES.map((a, i) => {
            const active = activity === a;
            return (
              <button
                key={a}
                onClick={() => onActivityChange(a)}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 px-2 py-3 font-display text-[15px] font-extrabold uppercase tracking-wide transition-colors border-white ${TAB_BORDERS[i] ?? ''} ${
                  active ? 'bg-sock text-ink' : 'text-white hover:bg-white/15'
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
