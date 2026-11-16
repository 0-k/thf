import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, RefreshCw, TriangleAlert } from 'lucide-react';
import { getOpeningHours, scoreHour, type Activity, type HourData } from './utils/scoring';
import { bestSlotOfDay, findBestSlots, type ScoredHour } from './utils/ranking';
import { generateMockWeatherData } from './utils/mockData';
import { getHolidayName, getSunTimes } from './utils/calendar';
import { berlinParts, formatClock, formatDay, startOfBerlinDay } from './utils/time';
import { ACTIVITIES } from './utils/display';
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
// A page left open (or a phone tab reopened the next morning) refetches by itself.
// The function caches for 1 h, so this costs at most one upstream call per hour.
export const AUTO_REFRESH_MS = 30 * 60 * 1000;

const readStoredActivity = (): Activity => {
  try {
    const stored = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (stored && (ACTIVITIES as string[]).includes(stored)) return stored as Activity;
  } catch {
    // storage blocked (private mode etc.) - fall through to default
  }
  return 'cycling';
};

/** Faint mowing stripes across the grass */
const MOWN_STRIPES = 'bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_46px,transparent_46px,transparent_92px)]';

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

  const lastLoadAttempt = useRef<number>(0);

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
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    document.getElementById(`day-${scrollTarget}`)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    setScrollTarget(null);
  }, [scrollTarget, showAllDays]);

  const loadForecast = useCallback(async (): Promise<void> => {
    lastLoadAttempt.current = Date.now();
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

  // Keep "now" fresh so past hours grey out and the current hour moves, and
  // refetch once the forecast is old. Background tabs throttle timers, so the
  // same check runs the moment the tab becomes visible again.
  useEffect(() => {
    const tick = (): void => {
      setNowSeconds(nowInSeconds());
      if (document.visibilityState === 'visible' && Date.now() - lastLoadAttempt.current >= AUTO_REFRESH_MS) {
        void loadForecast();
      }
    };
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
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
  const nextOpen = scoredHours.find(h => h.dt >= currentHourStart && h.breakdown.status === 'open') ?? null;

  if (!forecastData) {
    return (
      <div className={`min-h-screen flex flex-col justify-center px-4 py-8 text-white bg-field ${MOWN_STRIPES}`}>
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-xs uppercase tracking-[0.12em]">THF · EDDI · 52.47°N 13.41°E</div>
          <h1 className="mt-3 font-display font-black uppercase [font-stretch:125%] leading-[0.84] tracking-[-0.02em] text-[clamp(2.2rem,9.4vw,5rem)]">
            Tempel&shy;hofer Feld
          </h1>
          <Runway className="mt-6" />
          {error ? (
            <div className="mt-6 bg-white text-ink p-5">
              <p className="flex items-center gap-2 font-display text-xl font-black uppercase [font-stretch:110%] leading-none">
                <TriangleAlert className="w-6 h-6 text-sock shrink-0" aria-hidden="true" />
                Couldn&apos;t load the forecast
              </p>
              <p className="text-sm mt-2 mb-4">The weather service is unavailable right now ({error}).</p>
              <button
                onClick={() => void loadForecast()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sock text-ink font-display font-extrabold uppercase tracking-wide hover:brightness-110 disabled:opacity-60 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Try again
              </button>
            </div>
          ) : (
            <div className="mt-6 flex items-center gap-2 text-sm uppercase tracking-[0.12em]">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading forecast…</span>
            </div>
          )}
        </div>
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
    <div className={`min-h-screen bg-field px-4 py-5 sm:px-6 sm:py-6 ${MOWN_STRIPES}`}>
      {selectedHour && <DetailModal hour={selectedHour} activity={activity} onClose={closeModal} />}

      <div className="max-w-6xl mx-auto space-y-7">
        <Hero
          activity={activity}
          onActivityChange={setActivity}
          current={currentHour}
          nextOpen={nextOpen}
          nowSeconds={nowSeconds}
          todayHours={getOpeningHours(new Date(nowSeconds * 1000))}
          sunset={todaySun.sunset}
          fetchedAt={meta.fetchedAt}
          showUpdated={!usingMockData}
          loading={loading}
          onRefresh={() => void loadForecast()}
        />

        {usingMockData && (
          <div className="bg-white text-ink px-4 py-3 text-sm">
            <strong>Mock Data:</strong> Using simulated weather data. Run <code>npm run netlify:dev</code> to see real forecasts.
          </div>
        )}
        {meta.stale && (
          <div className="bg-white text-ink border-l-[10px] border-sock px-4 py-3 text-sm">
            The weather service is unreachable, so this is the last saved forecast
            {meta.fetchedAt !== null && <> from {formatClock(meta.fetchedAt)}</>}.
          </div>
        )}
        {error && (
          <div className="bg-white text-ink border-l-[10px] border-red-600 px-4 py-3 text-sm">
            Refresh failed ({error}). Showing the previous forecast.
          </div>
        )}

        <BestTimes slots={bestSlots} activity={activity} relativeLabel={relativeLabel} onSelect={selectHour} />

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
              className="flex items-center gap-1.5 px-5 py-2.5 border-[3px] border-white text-white font-display text-[15px] font-extrabold uppercase tracking-wide hover:bg-white hover:text-field transition-colors"
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
