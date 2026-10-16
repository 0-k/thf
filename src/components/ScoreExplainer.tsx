import React from 'react';
import type { Activity } from '../utils/types';
import { explainActivity } from '../utils/scoring';
import { ACTIVITY_LABELS } from '../utils/display';

interface ScoreExplainerProps {
  activity: Activity;
  usingMockData: boolean;
  airQualityAvailable: boolean;
}

export default function ScoreExplainer({ activity, usingMockData, airQualityAvailable }: ScoreExplainerProps): React.ReactElement {
  // Generated from SCORING_CONFIG, so the numbers shown are the ones applied.
  const rows = explainActivity(activity);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">How the Score Works for {ACTIVITY_LABELS[activity]}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div>
          <h4 className="font-semibold text-gray-700 mb-3">Penalties (continuous scales):</h4>
          <ul className="space-y-2 text-gray-600">
            {rows.map(row => (
              <li key={row.title}>
                <strong>{row.title}:</strong> {row.rule}
                <div className="text-xs mt-1 ml-4">{row.examples}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Scoring System</h4>
            <p className="text-sm text-blue-800">
              All activities start at <strong>100 points</strong>. The score reflects how many conditions are
              working against your activity. Tap any hour to see exactly which ones.
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <h4 className="font-semibold text-amber-900 mb-2">How crowds are estimated</h4>
            <p className="text-sm text-amber-900">
              There is no live visitor count, so crowds are modelled: <strong>day type</strong> (weekday, Friday,
              Saturday, Sunday/public holiday) × <strong>time of day</strong> (peaks shift with sunset) ×{' '}
              <strong>weather</strong> (warmth, rain, sunshine, wind).
            </p>
            <p className="text-xs text-amber-800 mt-2">
              Calibrated to Grün Berlin&apos;s visitor counts (2014: ~12,600 visits on weekdays, ~25,600 on
              Saturdays, ~31,000 on Sundays; peaks around 16:30 on weekdays and 14:00–14:30 at weekends).
              100 = a sunny summer Sunday afternoon. Treat it as a rough guide.
            </p>
          </div>
          {!usingMockData && (
            <p className="text-xs text-gray-500">
              Weather from <strong>Open-Meteo</strong> (DWD ICON model)
              {airQualityAvailable && <>; air quality from <strong>CAMS Europe</strong> via Open-Meteo</>}.
              Free services, no tracking.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
