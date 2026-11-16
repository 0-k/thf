import React from 'react';
import { Cloud, CloudRain, Leaf, Moon, Snowflake, Sun, Thermometer, Users, Wind, Zap } from 'lucide-react';
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
  Darkness: <Moon className="w-4 h-4" />,
};

export default function ScoreExplainer({ activity, today }: ScoreExplainerProps): React.ReactElement {
  // Generated from SCORING_CONFIG, so the numbers shown are the ones applied.
  const rows = explainActivity(activity);

  return (
    <section className="bg-white text-ink p-5 sm:p-6">
      <h2 className="font-display text-2xl font-black uppercase [font-stretch:110%] leading-none">
        How the {ACTIVITY_LABELS[activity]} score works
      </h2>
      <p className="text-sm text-ink/80 mt-2 max-w-2xl">
        Every hour starts at <strong>100 points</strong> and loses points for each condition working against you,
        on continuous scales. Tap any hour to see exactly which ones.
      </p>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map(row => (
            <li key={row.title} className="border-2 border-ink/15 p-3">
              <div className="flex items-center gap-2">
                <span className="bg-ink text-white p-1.5">{FACTOR_ICONS[row.title] ?? null}</span>
                <span className="font-display text-base font-extrabold uppercase">{row.title}</span>
              </div>
              <p className="text-sm mt-1.5">{row.rule}</p>
              <p className="text-xs text-ink/70 mt-1">{row.examples}</p>
            </li>
          ))}
        </ul>

        <div className="bg-tarmac text-white p-4">
          <h3 className="font-display text-xl font-black uppercase [font-stretch:110%] leading-none">How crowds are estimated</h3>
          <p className="text-sm text-white/90 mt-2">
            There is no live visitor count, so crowds are modelled: <strong>day type</strong> × <strong>time of day</strong>{' '}
            (peaks follow sunset) × <strong>weather</strong> (warmth, rain, sunshine, wind).
          </p>
          <div className="mt-3 bg-white text-ink p-3">
            <CrowdCurveChart year={today.year} month={today.month} day={today.day} />
          </div>
          <p className="text-xs text-white/80 mt-3">
            Calibrated to Grün Berlin&apos;s visitor counts (2014: ~12,600 visits on weekdays, ~25,600 on Saturdays,
            ~31,000 on Sundays; peaks around 16:30 on weekdays and 14:00–14:30 at weekends). 100 = a sunny summer
            Sunday afternoon. Treat it as a rough guide.
          </p>
        </div>
      </div>
    </section>
  );
}
