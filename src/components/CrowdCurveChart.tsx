import React, { useMemo, useState } from 'react';
import { CROWD_MODEL, diurnalProfile, type DiurnalConfig } from '../utils/crowd';
import { getSunTimes } from '../utils/calendar';
import { OPENING_HOURS_CONFIG } from '../utils/scoring';
import { formatDecimalHours } from '../utils/time';

interface CrowdCurveChartProps {
  year: number;
  /** 0-based */
  month: number;
  day: number;
}

// Categorical slots 1-3 of the validated reference palette (all-pairs CVD-safe on white).
// Aqua is < 3:1 on white, so every line also carries a visible direct label + table view.
const SERIES: Array<{ key: string; label: string; color: string; config: DiurnalConfig }> = [
  { key: 'weekday', label: 'Weekday', color: '#2a78d6', config: CROWD_MODEL.weekday },
  { key: 'saturday', label: 'Saturday', color: '#eb6834', config: CROWD_MODEL.saturday },
  { key: 'sunday', label: 'Sunday / holiday', color: '#1baf7a', config: CROWD_MODEL.sunday },
];

const W = 360;
const H = 190;
const M = { top: 12, right: 86, bottom: 24, left: 30 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const LABEL_GAP = 13;

const pad2 = (h: number): string => String(h).padStart(2, '0');

/** Typical crowd index through a sunny ~24°C day with today's daylight. */
export default function CrowdCurveChart({ year, month, day }: CrowdCurveChartProps): React.ReactElement {
  const [hover, setHover] = useState<number | null>(null);

  const { hours, values, sunset, open, close } = useMemo(() => {
    const opening = OPENING_HOURS_CONFIG.months[month] ?? { open: 7, close: 18 };
    const sun = getSunTimes(year, month, day);
    const hrs = Array.from({ length: opening.close - opening.open }, (_, i) => opening.open + i);
    const vals = SERIES.map(s =>
      hrs.map(h => Math.round(100 * s.config.level * diurnalProfile(s.config, h, sun.sunrise, sun.sunset)))
    );
    return { hours: hrs, values: vals, sunset: sun.sunset, open: opening.open, close: opening.close };
  }, [year, month, day]);

  const x = (hourMid: number): number => M.left + ((hourMid - open) / (close - open)) * PW;
  const y = (v: number): number => M.top + (1 - v / 100) * PH;

  // Direct labels at the line ends, nudged apart so they never collide.
  const labels = SERIES.map((s, i) => ({ ...s, value: values[i]![values[i]!.length - 1] ?? 0 }))
    .map(s => ({ ...s, ly: y(s.value) }))
    .sort((a, b) => a.ly - b.ly);
  for (let i = 1; i < labels.length; i++) {
    if (labels[i]!.ly - labels[i - 1]!.ly < LABEL_GAP) labels[i]!.ly = labels[i - 1]!.ly + LABEL_GAP;
  }
  const overflow = (labels[labels.length - 1]?.ly ?? 0) - (M.top + PH);
  if (overflow > 0) labels.forEach(l => { l.ly -= overflow; });

  const tickStep = close - open > 12 ? 3 : 2;
  const ticks = hours.filter(h => (h - open) % tickStep === 0);

  const onMove = (e: React.PointerEvent<SVGSVGElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const hourMid = open + ((vx - M.left) / PW) * (close - open);
    const idx = Math.round(hourMid - 0.5 - open);
    setHover(idx >= 0 && idx < hours.length ? idx : null);
  };

  const hoverHour = hover !== null ? hours[hover] : undefined;

  return (
    <figure className="m-0">
      <figcaption className="text-xs text-slate-500 mb-2">
        Typical crowd index on a sunny ~24°C day, today&apos;s daylight (sunset {formatDecimalHours(sunset)})
      </figcaption>
      {/* Legend: always present for >= 2 series */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1 text-xs text-slate-600">
        {SERIES.map(s => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative max-w-md">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-none select-none"
          role="img"
          aria-label="Crowd index by hour for weekdays, Saturdays and Sundays"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 50, 100].map(v => (
            <g key={v}>
              <line x1={M.left} x2={M.left + PW} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={M.left - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{v}</text>
            </g>
          ))}
          {ticks.map(h => (
            <text key={h} x={x(h + 0.5)} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{pad2(h)}</text>
          ))}
          {sunset > open && sunset < close && (
            <g>
              <line x1={x(sunset)} x2={x(sunset)} y1={M.top} y2={M.top + PH} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
              <text x={x(sunset) - 3} y={M.top + 8} textAnchor="end" fontSize={8.5} fill="#94a3b8">sunset</text>
            </g>
          )}
          {SERIES.map((s, i) => (
            <path
              key={s.key}
              d={values[i]!.map((v, k) => `${k === 0 ? 'M' : 'L'}${x(hours[k]! + 0.5).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {labels.map(l => (
            <g key={l.key}>
              <circle cx={x(close - 0.5)} cy={y(l.value)} r={2.5} fill={l.color} stroke="#ffffff" strokeWidth={1.5} />
              <text x={x(close - 0.5) + 8} y={l.ly + 3} fontSize={9.5} fill="#334155">{l.label}</text>
            </g>
          ))}
          {hoverHour !== undefined && (
            <g>
              <line x1={x(hoverHour + 0.5)} x2={x(hoverHour + 0.5)} y1={M.top} y2={M.top + PH} stroke="#64748b" strokeWidth={1} />
              {SERIES.map((s, i) => (
                <circle key={s.key} cx={x(hoverHour + 0.5)} cy={y(values[i]![hover!]!)} r={4} fill={s.color} stroke="#ffffff" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
        {hoverHour !== undefined && (
          <div
            className="pointer-events-none absolute top-1 rounded-lg bg-white shadow-lg ring-1 ring-slate-200 px-2.5 py-1.5 text-xs"
            style={{
              left: `${(x(hoverHour + 0.5) / W) * 100}%`,
              transform: x(hoverHour + 0.5) > W / 2 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
            }}
          >
            <div className="text-slate-500 mb-0.5">{pad2(hoverHour)}:00–{pad2(hoverHour + 1)}:00</div>
            {SERIES.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="font-semibold text-slate-900 tabular-nums">{values[i]![hover!]}</span>
                <span className="text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-slate-600">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Show as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="text-left tabular-nums">
            <thead>
              <tr className="text-slate-500">
                <th className="pr-3 font-medium">Hour</th>
                {SERIES.map(s => <th key={s.key} className="pr-3 font-medium">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {hours.map((h, k) => (
                <tr key={h}>
                  <td className="pr-3 text-slate-500">{pad2(h)}:00</td>
                  {SERIES.map((s, i) => <td key={s.key} className="pr-3">{values[i]![k]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
