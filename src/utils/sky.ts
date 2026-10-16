/**
 * Hero "sky" that follows the real time of day and weather at the field.
 * Class strings are complete literals so Tailwind can see them.
 */

export type SkyPhase = 'night' | 'dawn' | 'day' | 'overcast' | 'rain' | 'dusk';

/** `hour` is decimal Berlin time (e.g. 18.5); sunrise/sunset from getSunTimes. */
export const skyPhase = (hour: number, sunrise: number, sunset: number, clouds?: number, pop?: number): SkyPhase => {
  if (hour < sunrise - 0.75 || hour > sunset + 0.75) return 'night';
  if (hour < sunrise + 0.75) return 'dawn';
  if (hour > sunset - 1) return 'dusk';
  if ((pop ?? 0) >= 0.5) return 'rain';
  if ((clouds ?? 0) >= 75) return 'overcast';
  return 'day';
};

export const SKY_GRADIENTS: Record<SkyPhase, string> = {
  night: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900',
  dawn: 'bg-gradient-to-br from-indigo-900 via-rose-700 to-amber-500',
  day: 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-800',
  overcast: 'bg-gradient-to-br from-slate-500 via-slate-600 to-slate-800',
  rain: 'bg-gradient-to-br from-slate-700 via-slate-800 to-blue-950',
  dusk: 'bg-gradient-to-br from-indigo-950 via-fuchsia-800 to-orange-500',
};

export const SKY_LABELS: Record<SkyPhase, string> = {
  night: 'Night sky',
  dawn: 'Sunrise',
  day: 'Clear skies',
  overcast: 'Overcast',
  rain: 'Rain about',
  dusk: 'Sunset',
};
