import React from 'react';
import type { HourStatus } from '../utils/scoring';
import { getScoreColor } from '../utils/display';

interface ScoreDialProps {
  score: number;
  status: HourStatus | null;
  /** 'dark' = drawn on the hero sky, 'light' = on white */
  tone?: 'dark' | 'light';
  size?: 'md' | 'lg';
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreDial({ score, status, tone = 'dark', size = 'lg' }: ScoreDialProps): React.ReactElement {
  const open = status === 'open';
  const colors = getScoreColor(score);
  const stroke = tone === 'dark' ? colors.backgroundColor : colors.borderColor;
  const text = status === 'closed' || status === null ? '–' : status === 'thunderstorm' ? '⚡' : String(score);

  return (
    <div
      className={`relative shrink-0 ${size === 'lg' ? 'w-28 h-28' : 'w-20 h-20'}`}
      role="img"
      aria-label={open ? `Score ${score} of 100` : status === 'thunderstorm' ? 'Thunderstorm' : 'Closed'}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="8"
          className={tone === 'dark' ? 'stroke-white/15' : 'stroke-slate-200'}
        />
        {open && score > 0 && (
          <circle
            cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="8" strokeLinecap="round"
            stroke={stroke}
            strokeDasharray={`${(score / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display font-bold leading-none ${size === 'lg' ? 'text-5xl' : 'text-3xl'}`}>{text}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] opacity-70 mt-0.5">score</span>
      </div>
    </div>
  );
}
