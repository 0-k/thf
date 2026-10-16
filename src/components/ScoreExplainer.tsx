import React from 'react';
import { Cloud, CloudRain, Leaf, Snowflake, Sun, Thermometer, Users, Wind, Zap } from 'lucide-react';
import type { Activity } from '../utils/types';
import { explainActivity } from '../utils/scoring';
import { ACTIVITY_LABELS } from '../utils/display';
import CrowdCurveChart from './CrowdCurveChart';

interface ScoreExplainerProps {
  activity: Activity;
  today: { year: number; month: number; day: number };
}

const FACTOR_ICONS: Record<string, React.ReactNode> = {
  Thunderstorm: <Zap className="w-4 h-4" />,
  Rain: <CloudRain className="w-4 h-4" />,
  Wind: <Wind className="w-4 h-4" />,
  Gusts: <Wind className="w-4 h-4" />,
  Crowds: <Users className="w-4 h-4" />,
  Cold: <Snowflake className="w-4 h-4" />,
  Heat: <Thermometer className="w-4 h-4" />,
  UV: <Sun className="w-4 h-4" />,
  'Air quality': <Leaf className="w-4 h-4" />,
  'No sun': <Cloud className="w-4 h-4" />,
};

export default function ScoreExplainer({ activity, today }: ScoreExplainerProps): React.ReactElement {
  // Generated from SCORING_CONFIG, so the numbers shown are the ones applied.
  const rows = explainActivity(activity);

  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-5 sm:p-6">
      <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
        How the {ACTIVITY_LABELS[activity]} score works
      </h2>
      <p className="text-sm text-slate-600 mt-1 max-w-2xl">
        Every hour starts at <strong>100 points</strong> and loses points for each condition working against you,
        on continuous scales. Tap any hour to see exactly which ones.
      </p>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map(row => (
            <li key={row.title} className="rounded-2xl ring-1 ring-slate-200 p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-slate-100 text-slate-600 p-1.5">{FACTOR_ICONS[row.title] ?? null}</span>
                <span className="font-display text-base font-extrabold text-slate-900">{row.title}</span>
              </div>
              <p className="text-sm text-slate-700 mt-1.5">{row.rule}</p>
              <p className="text-xs text-slate-500 mt-1">{row.examples}</p>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
          <h3 className="font-display text-xl font-extrabold text-amber-950">How crowds are estimated</h3>
          <p className="text-sm text-amber-950/90 mt-1">
            There is no live visitor count, so crowds are modelled: <strong>day type</strong> × <strong>time of day</strong>{' '}
            (peaks follow sunset) × <strong>weather</strong> (warmth, rain, sunshine, wind).
          </p>
          <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-amber-100">
            <CrowdCurveChart year={today.year} month={today.month} day={today.day} />
          </div>
          <p className="text-xs text-amber-900/80 mt-3">
            Calibrated to Grün Berlin&apos;s visitor counts (2014: ~12,600 visits on weekdays, ~25,600 on Saturdays,
            ~31,000 on Sundays; peaks around 16:30 on weekdays and 14:00–14:30 at weekends). 100 = a sunny summer
            Sunday afternoon. Treat it as a rough guide.
          </p>
        </div>
      </div>
    </section>
  );
}
