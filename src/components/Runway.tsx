import React from 'react';

/** Threshold "piano keys" painted across a runway end. */
export const ThresholdKeys = ({ count = 6, className = 'h-7' }: { count?: number; className?: string }): React.ReactElement => (
  <span aria-hidden="true" className="flex gap-[3px] shrink-0">
    {Array.from({ length: count }).map((_, i) => <span key={i} className={`block w-[3px] rounded-[1px] bg-white/80 ${className}`} />)}
  </span>
);

/** Decorative runway strip seen from above (THF's runways were 09L/27R and 09R/27L). */
export default function Runway({ className = '', left = '09L', right = '27R' }: {
  className?: string; left?: string; right?: string;
}): React.ReactElement {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 overflow-hidden h-11 px-4 bg-tarmac text-white/85 ${className}`}>
      <ThresholdKeys />
      <span className="font-display font-bold tracking-wide text-lg [font-stretch:80%] shrink-0">{left}</span>
      <div className="flex-1 flex items-center gap-5 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => <span key={i} className="block h-[3px] w-8 shrink-0 bg-white/70 rounded-full" />)}
      </div>
      <span className="font-display font-bold tracking-wide text-lg [font-stretch:80%] shrink-0">{right}</span>
      <ThresholdKeys />
    </div>
  );
}
