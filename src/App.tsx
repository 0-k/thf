import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Clock, RefreshCw, Sunset, TriangleAlert } from 'lucide-react';
import { getOpeningHours, scoreHour, type Activity, type HourData } from './utils/scoring';
import { bestSlotOfDay, findBestSlots, type ScoredHour } from './utils/ranking';
import { generateMockWeatherData } from './utils/mockData';
import { getHolidayName, getSunTimes } from './utils/calendar';
import { berlinParts, formatClock, formatDay, formatDecimalHours, formatHour, startOfBerlinDay } from './utils/time';
import { ACTIVITIES, ACTIVITY_ACTIVE_CLASSES, ACTIVITY_LABELS } from './utils/display';
import HourCard from './components/HourCard';
import DetailModal from './components/DetailModal';
import BestTimes from './components/BestTimes';
import ScoreExplainer from './components/ScoreExplainer';

// ============================================================================
// Type Definitions
// ============================================================================

export type { Activity };

export interface WeatherData {
  hourly: HourData[];
  sources?: { forecast: string; airQuality: string | null };
}

export interface APIResponse {
  success: boolean;
  data?: WeatherData;
  fetched_at?: string;
  stale?: boolean;
  error?: string;
}

interface DayGroup {
  key: string;
  label: string;
  holiday: string | null;
  hours: ScoredHour[];
}

interface ForecastMeta {
  fetchedAt: number | null;
  stale: boolean;
  airQuality: boolean;
}

const DEFAULT_DAYS = 4;
const MAX_DAYS = 7;
const ACTIVITY_STORAGE_KEY = 'thf.activity';

const readStoredActivity = (): Activity => {
  try {
    const stored = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (stored && (ACTIVITIES as string[]).includes(stored)) return stored as Activity;
  } catch {
    // storage blocked (private mode etc.) - fall through to default
  }
  return 'cycling';
};

const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

// ============================================================================
// Main Component
// ============================================================================

export default function TempelhoferBikeForecast(): React.ReactElement {
  const [forecastData, setForecastData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity>(readStoredActivity);
  const [usingMockData, setUsingMockData] = useState<boolean>(false);
  const [meta, setMeta] = useState<ForecastMeta>({ fetchedAt: null, stale: false, airQuality: false });
  const [selectedDt, setSelectedDt] = useState<number | null>(null);
  const [showAllDays, setShowAllDays] = useState<boolean>(false);
  const [nowSeconds, setNowSeconds] = useState<number>(nowInSeconds);

  // Keep "now" fresh so past hours grey out and the current hour moves.
  useEffect(() => {
    const id = window.setInterval(() => setNowSeconds(nowInSeconds()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVITY_STORAGE_KEY, activity);
    } catch {
      // ignore
    }
  }, [activity]);

  const loadForecast = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/weather');
      if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
      const result: APIResponse = await response.json();
      if (!result.success || !result.data) throw new Error(result.error ?? 'Unexpected response');

      setForecastData(result.data);
      setUsingMockData(false);
      setMeta({
        fetchedAt: result.fetched_at ? Math.floor(Date.parse(result.fetched_at) / 1000) : null,
        stale: result.stale === true,
        airQuality: result.data.hourly.some(h => h.air_quality !== undefined),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (import.meta.env.DEV) {
        // Local `npm run dev` has no Netlify Functions: use simulated data.
        console.log('Failed to fetch real weather data, using mock data:', message);
        setForecastData(generateMockWeatherData());
        setUsingMockData(true);
        setMeta({ fetchedAt: nowInSeconds(), stale: false, airQuality: true });
      } else {
        setError(message);
      }
    } finally {
      setNowSeconds(nowInSeconds());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForecast();
  }, [loadForecast]);

  const todayStart = startOfBerlinDay(nowSeconds);

  const scoredHours = useMemo<ScoredHour[]>(() => {
    if (!forecastData) return [];
    return forecastData.hourly
      .filter(h => h.dt >= todayStart) // cached data can outlive midnight
      .map(h => {
        const breakdown = scoreHour(activity, h);
        return { ...h, score: breakdown.score, breakdown };
      });
  }, [forecastData, activity, todayStart]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    for (const hour of scoredHours) {
      const p = berlinParts(hour.dt);
      let group = groups[groups.length - 1];
      if (!group || group.key !== p.dateKey) {
        group = { key: p.dateKey, label: formatDay(hour.dt), holiday: getHolidayName(p.year, p.month, p.day), hours: [] };
        groups.push(group);
      }
      group.hours.push(hour);
    }
    return groups;
  }, [scoredHours]);

  // Best 2-hour windows from now until the end of the default 4-day view.
  // The current hour still counts if less than half of it has passed.
  const currentHourStart = nowSeconds - (nowSeconds % 3600);
  const firstBookableHour = nowSeconds - currentHourStart < 1800 ? currentHourStart : currentHourStart + 3600;
  const horizonDay = dayGroups[Math.min(DEFAULT_DAYS, dayGroups.length) - 1];
  const horizonEnd = horizonDay ? horizonDay.hours[horizonDay.hours.length - 1]!.dt + 3600 : undefined;
  const bestSlots = useMemo(
    () => findBestSlots(scoredHours, 3, { fromDt: firstBookableHour, untilDt: horizonEnd }),
    [scoredHours, firstBookableHour, horizonEnd]
  );

  const selectedHour = selectedDt !== null ? scoredHours.find(h => h.dt === selectedDt) ?? null : null;
  const closeModal = useCallback(() => setSelectedDt(null), []);
  const selectHour = useCallback((hour: ScoredHour) => setSelectedDt(hour.dt), []);

  if (!forecastData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        {error ? (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
            <TriangleAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-gray-800 mb-1">Couldn&apos;t load the forecast</h1>
            <p className="text-sm text-gray-600 mb-4">The weather service is unavailable right now ({error}).</p>
            <button
              onClick={() => void loadForecast()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Try again
            </button>
          </div>
        ) : (
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-lg text-gray-700">Loading forecast...</p>
          </div>
        )}
      </div>
    );
  }

  const today = berlinParts(nowSeconds);
  const todayHours = getOpeningHours(new Date(nowSeconds * 1000));
  const todaySun = getSunTimes(today.year, today.month, today.day);
  const visibleDays = dayGroups.slice(0, showAllDays ? MAX_DAYS : DEFAULT_DAYS);
  const hiddenDays = Math.min(MAX_DAYS, dayGroups.length) - DEFAULT_DAYS;
  const tomorrowKey = berlinParts(todayStart + 26 * 3600).dateKey;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      {selectedHour && <DetailModal hour={selectedHour} activity={activity} onClose={closeModal} />}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Tempelhofer Feld</h1>
              <p className="text-gray-600">{ACTIVITY_LABELS[activity]} Forecast - Next 4 Days</p>
            </div>
            <button
              onClick={() => void loadForecast()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Open today {String(todayHours.open).padStart(2, '0')}:00–{String(todayHours.close).padStart(2, '0')}:00
            </span>
            <span className="flex items-center gap-1">
              <Sunset className="w-3.5 h-3.5" />
              Sunset {formatDecimalHours(todaySun.sunset)}
            </span>
            {meta.fetchedAt !== null && !usingMockData && (
              <span>Updated {formatClock(meta.fetchedAt)}</span>
            )}
          </div>

          {/* Activity Selector */}
          <div className="mt-6 bg-gray-100 p-1 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-1 max-w-2xl">
            {ACTIVITIES.map(a => (
              <button
                key={a}
                onClick={() => setActivity(a)}
                aria-pressed={activity === a}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all text-sm md:text-base ${
                  activity === a ? ACTIVITY_ACTIVE_CLASSES[a] : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {ACTIVITY_LABELS[a]}
              </button>
            ))}
          </div>

          {usingMockData && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Mock Data:</strong> Using simulated weather data. Run <code>npm run netlify:dev</code> to see real forecasts.
              </p>
            </div>
          )}
          {meta.stale && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                The weather service is unreachable, so this is the last saved forecast
                {meta.fetchedAt !== null && <> from {formatClock(meta.fetchedAt)}</>}.
              </p>
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">Refresh failed ({error}). Showing the previous forecast.</p>
            </div>
          )}
        </div>

        <BestTimes slots={bestSlots} nowSeconds={nowSeconds} onSelect={selectHour} />

        {/* Daily Forecasts - Clean 2-Row Layout */}
        <div className="space-y-6">
          {visibleDays.map((day, index) => {
            // Split hours into two rows
            const midpoint = Math.ceil(day.hours.length / 2);
            const morningHours = day.hours.slice(0, midpoint);
            const afternoonHours = day.hours.slice(midpoint);
            const best = bestSlotOfDay(day.hours, { fromDt: firstBookableHour });
            const prefix = index === 0 && day.key === today.dateKey ? 'Today · ' : day.key === tomorrowKey ? 'Tomorrow · ' : '';

            return (
              <div key={day.key} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    {prefix}{day.label}
                    {day.holiday && (
                      <span className="ml-2 align-middle text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {day.holiday}
                      </span>
                    )}
                  </h3>
                  {best && (
                    <span className="text-sm text-gray-600">
                      Best: <strong>{formatHour(best.start.dt)}–{formatHour(best.start.dt + best.hours.length * 3600)}</strong> · {best.score}
                    </span>
                  )}
                </div>
                {index >= DEFAULT_DAYS && (
                  <p className="text-xs text-gray-500 -mt-3 mb-3">Forecasts this far ahead are less reliable.</p>
                )}

                <div className="space-y-2">
                  {/* First row */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {morningHours.map(hour => (
                      <HourCard key={hour.dt} hour={hour} nowSeconds={nowSeconds} onSelect={selectHour} />
                    ))}
                  </div>

                  {/* Second row */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {afternoonHours.map(hour => (
                      <HourCard key={hour.dt} hour={hour} nowSeconds={nowSeconds} onSelect={selectHour} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hiddenDays > 0 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowAllDays(v => !v)}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-blue-700 bg-white rounded-lg shadow hover:bg-blue-50 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAllDays ? 'rotate-180' : ''}`} />
              {showAllDays ? 'Show fewer days' : `Show ${hiddenDays} more day${hiddenDays > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        <ScoreExplainer activity={activity} usingMockData={usingMockData} airQualityAvailable={meta.airQuality} />
      </div>
    </div>
  );
}
