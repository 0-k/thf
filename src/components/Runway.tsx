import React from 'react';

/** Threshold "piano keys" painted across a runway end. */
export const ThresholdKeys = ({ count = 6, className = 'h-8' }: { count?: number; className?: string }): React.ReactElement => (
  <span aria-hidden="true" className="flex gap-1 shrink-0">
    {Array.from({ length: count }).map((_, i) => <span key={i} className={`block w-1.5 bg-white ${className}`} />)}
  </span>
);

/** Runway strip seen from above (THF's runways were 09L/27R and 09R/27L). Decorative. */
export default function Runway({ className = '', left = '09L', right = '27R' }: {
  className?: string; left?: string; right?: string;
}): React.ReactElement {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3.5 overflow-hidden h-[54px] px-4 bg-tarmac text-white ${className}`}>
      <ThresholdKeys />
      <span className="font-display font-extrabold text-2xl [font-stretch:75%] shrink-0">{left}</span>
      <div className="flex-1 h-1 min-w-0 bg-[repeating-linear-gradient(90deg,#ffffff_0px,#ffffff_34px,transparent_34px,transparent_64px)]" />
      <span className="font-display font-extrabold text-2xl [font-stretch:75%] shrink-0">{right}</span>
      <ThresholdKeys />
    </div>
  );
}
