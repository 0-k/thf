import React from 'react';

/**
 * Windsock that fills like a real one: each of the five stripes stands for
 * about 3 knots, so a fully extended sock means 15 kn (~8 m/s) or more.
 */
export const windsockStripes = (speedMs: number): number =>
  Math.max(0, Math.min(5, Math.round((speedMs * 1.944) / 3)));

export default function Windsock({ speed, className = '' }: { speed: number; className?: string }): React.ReactElement {
  const filled = windsockStripes(speed);
  return (
    <svg viewBox="0 0 126 48" className={className} aria-hidden="true">
      <rect x="4" y="2" width="4" height="44" rx="1" fill="white" />
      {[0, 1, 2, 3, 4].map(i => {
        const x = 8 + i * 22;
        const top = 5 + i * 2.2;
        const bottom = 35 - i * 2.2;
        return (
          <path
            key={i}
            d={`M${x} ${top} L${x + 22} ${top + 2.2} L${x + 22} ${bottom - 2.2} L${x} ${bottom} Z`}
            fill={i % 2 === 0 ? '#ff6a13' : '#ffffff'}
            opacity={i < filled ? 1 : 0.28}
          />
        );
      })}
    </svg>
  );
}
