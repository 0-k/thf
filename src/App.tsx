import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, RefreshCw, TriangleAlert } from 'lucide-react';
import { getOpeningHours, scoreHour, type Activity, type HourData } from './utils/scoring';
import { bestSlotOfDay, findBestSlots, type ScoredHour } from './utils/ranking';
import { generateMockWeatherData } from './utils/mockData';
import { getHolidayName, getSunTimes } from './utils/calendar';
import { berlinParts, formatClock, formatDay, startOfBerlinDay } from './utils/time';
import { ACTIVITIES } from './utils/display';
import { SKY_GRADIENTS, skyPhase } from './utils/sky';
import Hero from './components/Hero';
import BestTimes from './components/BestTimes';
import WeekOutlook from './components/WeekOutlook';
import DaySection, { type DayGroup } from './components/DaySection';
import DetailModal from './components/DetailModal';
import ScoreExplainer from './components/ScoreExplainer';
import Footer from './components/Footer';
import Runway from './components/Runway';

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
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
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

  // Scroll after the target day has rendered (it may have just been expanded).
  useEffect(() => {
    if (!scrollTarget) return;
    document.getElementById(`day-${scrollTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setScrollTarget(null);
  }, [scrollTarget, showAllDays]);

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
    return groups.slice(0, MAX_DAYS);
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
  const dayBest = useMemo(
    () => dayGroups.map(day => bestSlotOfDay(day.hours, { fromDt: firstBookableHour })),
    [dayGroups, firstBookableHour]
  );

  const selectedHour = selectedDt !== null ? scoredHours.find(h => h.dt === selectedDt) ?? null : null;
  const closeModal = useCallback(() => setSelectedDt(null), []);
  const selectHour = useCallback((hour: ScoredHour) => setSelectedDt(hour.dt), []);

  const today = berlinParts(nowSeconds);
  const todaySun = getSunTimes(today.year, today.month, today.day);
  const currentHour = scoredHours.find(h => h.dt <= nowSeconds && nowSeconds < h.dt + 3600) ?? null;
  const nextOpen = scoredHours.find(h => h.dt >= currentHourStart && h.breakdown.status !== 'closed') ?? null;
  const sky = skyPhase(today.hour + today.minute / 60, todaySun.sunrise, todaySun.sunset, currentHour?.clouds, currentHour?.pop);

  if (!forecastData) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 text-white ${SKY_GRADIENTS[sky]}`}>
        <div className="w-full max-w-md text-center">
          <span className="font-display font-bold tracking-[0.2em] bg-amber-400 text-slate-900 px-2 py-0.5 rounded text-sm">THF</span>
          <h1 className="font-display font-bold uppercase text-5xl mt-4 leading-none">Tempelhofer Feld</h1>
          {error ? (
            <div className="mt-6 rounded-3xl bg-black/25 ring-1 ring-white/15 p-6">
              <TriangleAlert className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="font-display text-2xl font-bold uppercase">Couldn&apos;t load the forecast</p>
              <p className="text-sm text-white/80 mt-1 mb-4">The weather service is unavailable right now ({error}).</p>
              <button
                onClick={() => void loadForecast()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 disabled:opacity-60 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Try again
              </button>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-center gap-2 text-white/80">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading forecast…</span>
            </div>
          )}
        </div>
        <Runway className="w-full max-w-md mt-8 opacity-70" />
      </div>
    );
  }

  const tomorrowKey = berlinParts(todayStart + 26 * 3600).dateKey;
  const relativeLabel = (key: string): string | null =>
    key === today.dateKey ? 'Today' : key === tomorrowKey ? 'Tomorrow' : null;
  const visibleDays = dayGroups.slice(0, showAllDays ? MAX_DAYS : DEFAULT_DAYS);
  const hiddenDays = dayGroups.length - DEFAULT_DAYS;

  const jumpToDay = (key: string, index: number): void => {
    if (index >= DEFAULT_DAYS) setShowAllDays(true);
    setScrollTarget(key);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 sm:px-4 sm:py-5">
      {selectedHour && <DetailModal hour={selectedHour} activity={activity} onClose={closeModal} />}

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
        <Hero
          activity={activity}
          onActivityChange={setActivity}
          current={currentHour}
          nextOpen={nextOpen}
          nowSeconds={nowSeconds}
          todayHours={getOpeningHours(new Date(nowSeconds * 1000))}
          sunset={todaySun.sunset}
          sky={sky}
          fetchedAt={meta.fetchedAt}
          showUpdated={!usingMockData}
          loading={loading}
          onRefresh={() => void loadForecast()}
        />

        {usingMockData && (
          <div className="rounded-2xl bg-yellow-50 ring-1 ring-yellow-200 px-4 py-3 text-sm text-yellow-900">
            <strong>Mock Data:</strong> Using simulated weather data. Run <code>npm run netlify:dev</code> to see real forecasts.
          </div>
        )}
        {meta.stale && (
          <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-sm text-amber-900">
            The weather service is unreachable, so this is the last saved forecast
            {meta.fetchedAt !== null && <> from {formatClock(meta.fetchedAt)}</>}.
          </div>
        )}
        {error && (
          <div className="rounded-2xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-800">
            Refresh failed ({error}). Showing the previous forecast.
          </div>
        )}

        <BestTimes slots={bestSlots} activity={activity} nowSeconds={nowSeconds} onSelect={selectHour} />

        <WeekOutlook
          days={dayGroups.map((day, i) => ({ day, best: dayBest[i] ?? null, relativeLabel: relativeLabel(day.key) }))}
          defaultVisible={DEFAULT_DAYS}
          onJump={jumpToDay}
        />

        {/* Daily Forecasts - Clean 2-Row Layout */}
        {visibleDays.map((day, index) => (
          <DaySection
            key={day.key}
            day={day}
            relativeLabel={relativeLabel(day.key)}
            best={dayBest[index] ?? null}
            lessReliable={index >= DEFAULT_DAYS}
            nowSeconds={nowSeconds}
            onSelect={selectHour}
          />
        ))}

        {hiddenDays > 0 && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowAllDays(v => !v)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-900 text-white font-display text-lg uppercase tracking-wide shadow hover:bg-slate-800 transition-colors"
            >
              <ChevronDown className={`w-5 h-5 transition-transform ${showAllDays ? 'rotate-180' : ''}`} />
              {showAllDays ? 'Show fewer days' : `Show ${hiddenDays} more day${hiddenDays > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        <ScoreExplainer activity={activity} today={{ year: today.year, month: today.month, day: today.day }} />
        <Footer usingMockData={usingMockData} airQualityAvailable={meta.airQuality} />
      </div>
    </div>
  );
}
