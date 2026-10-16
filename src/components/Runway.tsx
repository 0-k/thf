import React from 'react';

/** Decorative runway strip (THF's runways were 09L/27R and 09R/27L). */
export default function Runway({ className = '' }: { className?: string }): React.ReactElement {
  const thresholdBars = Array.from({ length: 6 });
  return (
    <div aria-hidden="true" className={`relative flex items-center gap-3 overflow-hidden h-12 px-4 ${className}`}>
      <div className="flex flex-col gap-1 shrink-0">
        {thresholdBars.map((_, i) => <span key={i} className="block h-0.5 w-7 bg-white/50 rounded-full" />)}
      </div>
      <span className="font-display font-extrabold text-white/60 tracking-widest text-base shrink-0">09L</span>
      <div className="flex-1 flex items-center gap-4 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => <span key={i} className="block h-0.5 w-8 shrink-0 bg-white/40 rounded-full" />)}
      </div>
      <span className="font-display font-extrabold text-white/60 tracking-widest text-base shrink-0">27R</span>
      <div className="flex flex-col gap-1 shrink-0">
        {thresholdBars.map((_, i) => <span key={i} className="block h-0.5 w-7 bg-white/50 rounded-full" />)}
      </div>
    </div>
  );
}
