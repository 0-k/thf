/**
 * Hero light (grass tone) that follows the real time of day and weather at the field.
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

// The hero is the field seen from above, so the "sky" shows as the light on the grass.
export const SKY_GRADIENTS: Record<SkyPhase, string> = {
  night: 'bg-gradient-to-br from-[#14231a] via-[#182b20] to-[#101a16]',
  dawn: 'bg-gradient-to-br from-[#2b4a3a] via-[#3f6442] to-[#7d7440]',
  day: 'bg-gradient-to-br from-[#3a7142] via-[#35693d] to-[#2c5a35]',
  overcast: 'bg-gradient-to-br from-[#4d6650] via-[#465d49] to-[#3b5040]',
  rain: 'bg-gradient-to-br from-[#36493c] via-[#2f4136] to-[#27372f]',
  dusk: 'bg-gradient-to-br from-[#284334] via-[#3d5a3c] to-[#8a6238]',
};

export const SKY_LABELS: Record<SkyPhase, string> = {
  night: 'Night sky',
  dawn: 'Sunrise',
  day: 'Clear skies',
  overcast: 'Overcast',
  rain: 'Rain about',
  dusk: 'Sunset',
};
