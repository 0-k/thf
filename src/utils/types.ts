/**
 * Shared data types for forecast hours (frontend + Netlify Function).
 */

export type Activity = 'cycling' | 'jogging' | 'kiting' | 'socializing';

export interface WeatherCondition {
  main: string;
  description: string;
}

export interface AirQuality {
  /** European Air Quality Index (CAMS): 0-20 good, 20-40 fair, 40-60 moderate, 60-80 poor, 80-100 very poor, >100 extremely poor */
  european_aqi: number;
}

/**
 * One forecast hour. `dt` is the unix start (seconds) of the hour slot [dt, dt + 1h).
 * Precipitation, its probability, gusts and weather code describe that slot
 * (the backend re-aligns Open-Meteo's "preceding hour" aggregates).
 */
export interface HourData {
  dt: number;
  temp: number;
  feels_like?: number;
  uvi?: number;
  clouds?: number;
  visibility?: number;
  wind_speed: number;
  wind_deg?: number;
  wind_gust?: number;
  weather: WeatherCondition[];
  /** Probability of precipitation, 0-1 */
  pop: number;
  rain?: { '1h': number };
  air_quality?: AirQuality;
  hasThunderstorm: boolean;
  is_day?: boolean;
}

export interface OpeningHours {
  open: number;
  close: number;
}

export interface MonthlyOpeningHours {
  /** Monthly opening hours, index 0 = January, 11 = December */
  months: OpeningHours[];
}
