import { describe, it, expect } from 'vitest';
import { SKY_GRADIENTS, skyPhase } from './sky';

// October: sunrise ~7.5, sunset ~18.2
const SUNRISE = 7.5;
const SUNSET = 18.2;

describe('skyPhase', () => {
  it('follows the day: night, dawn, day, dusk, night', () => {
    expect(skyPhase(5, SUNRISE, SUNSET)).toBe('night');
    expect(skyPhase(7.5, SUNRISE, SUNSET)).toBe('dawn');
    expect(skyPhase(12, SUNRISE, SUNSET)).toBe('day');
    expect(skyPhase(17.8, SUNRISE, SUNSET)).toBe('dusk');
    expect(skyPhase(21, SUNRISE, SUNSET)).toBe('night');
  });

  it('greys out for overcast and rain during the day only', () => {
    expect(skyPhase(12, SUNRISE, SUNSET, 90, 0.1)).toBe('overcast');
    expect(skyPhase(12, SUNRISE, SUNSET, 90, 0.7)).toBe('rain');
    expect(skyPhase(21, SUNRISE, SUNSET, 90, 0.7)).toBe('night');
  });

  it('has a gradient for every phase', () => {
    for (const phase of ['night', 'dawn', 'day', 'overcast', 'rain', 'dusk'] as const) {
      expect(SKY_GRADIENTS[phase]).toMatch(/^bg-gradient-to-br /);
    }
  });
});
