import React from 'react';
import { Bike, Footprints, Sandwich } from 'lucide-react';
import type { Activity } from '../utils/types';

/** Lucide has no kite: same 24px grid, 2px stroke, round joins. */
export const KiteIcon = ({ className = '' }: { className?: string }): React.ReactElement => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2 19 8.5 12 15.5 5 8.5Z" />
    <path d="M12 2v13.5M5 8.5h14" />
    <path d="M12 15.5c0 2 2 2 2 3.5s-2 1.5-2 3" />
  </svg>
);

export default function ActivityIcon({ activity, className = '' }: { activity: Activity; className?: string }): React.ReactElement {
  if (activity === 'cycling') return <Bike className={className} aria-hidden="true" />;
  if (activity === 'jogging') return <Footprints className={className} aria-hidden="true" />;
  if (activity === 'kiting') return <KiteIcon className={className} />;
  return <Sandwich className={className} aria-hidden="true" />;
}
