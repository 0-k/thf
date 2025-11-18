import React, { useState, useEffect } from 'react';
import { Cloud, Wind, Droplets, ThermometerSun, Users, TrendingUp, RefreshCw } from 'lucide-react';

// Scoring configuration for each activity
const SCORING_CONFIG = {
  cycling: {
    rain: { base: -40, probMultiplier: -20, threshold: 0.2, exponent: 1.5, maxPenalty: 25 },
    wind: { threshold: 3, maxPenalty: 40, range: 7, exponent: 1.3 },
    crowd: { multiplier: 0.25 },
    cold: { threshold: 12, maxPenalty: 40, range: 12, exponent: 1.2 },
    heat: { threshold: 24, maxPenalty: 30, range: 11, exponent: 1.3 },
    airQuality: { threshold: 1, maxPenalty: 35, range: 4, exponent: 1.4 },
    uv: { threshold: 5, maxPenalty: 20, range: 6, exponent: 1.2 }
  },
  jogging: {
    rain: { base: -25, probMultiplier: -12, threshold: 0.3, exponent: 1.5, maxPenalty: 18 },
    wind: { threshold: 5, maxPenalty: 15, range: 8, exponent: 1.2 },
    crowd: { multiplier: 0.1 },
    cold: { threshold: 10, maxPenalty: 20, range: 10, exponent: 1.1 },
    heat: { threshold: 22, maxPenalty: 35, range: 10, exponent: 1.4 },
    airQuality: { threshold: 1, maxPenalty: 35, range: 4, exponent: 1.4 },
    uv: { threshold: 4, maxPenalty: 25, range: 7, exponent: 1.3 }
  },
  kiting: {
    rain: { base: -30, probMultiplier: -15, threshold: 0.3, exponent: 1.5, maxPenalty: 20 },
    wind: {
      tooLightPenalty: -50, tooLightThreshold: 5,      // < 5 m/s: Too light
      optimalMin: 7, optimalMax: 9,                     // 7-9 m/s: Sweet spot (no penalty)
      workableMin: 5, workableMax: 11,                  // 5-11 m/s: Workable range (no penalty)
      dangerousMin: 11, dangerousMax: 13, dangerousPenalty: -25,  // 11-13 m/s: Getting dangerous
      veryDangerousPenalty: -50, veryDangerousThreshold: 13      // > 13 m/s: Very dangerous
    },
    crowd: { multiplier: 0.35 },
    cold: { threshold: 10, maxPenalty: 40, range: 10, exponent: 1.4 },
    heat: { threshold: 30, flatPenalty: -10 },
    airQuality: { threshold: 2, maxPenalty: 15, range: 3, exponent: 1.3 },
    uv: { threshold: 5, maxPenalty: 20, range: 6, exponent: 1.2 }
  },
  picnic: {
    rain: { base: -60, probMultiplier: -20, threshold: 0.2, exponent: 1.6, maxPenalty: 35 },
    wind: { threshold: 3, maxPenalty: 40, range: 7, exponent: 1.3 },
    crowd: { multiplier: 0.25 },  // Changed from bonus to penalty
    cold: { threshold: 15, maxPenalty: 35, range: 15, exponent: 1.3 },
    heat: { threshold: 28, maxPenalty: 20, range: 10, exponent: 1.2 },
    airQuality: { threshold: 2, maxPenalty: 20, range: 3, exponent: 1.3 },
    uv: { threshold: 4, maxPenalty: 30, range: 7, exponent: 1.3 }
  }
};

export default function TempelhoferBikeForecast() {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState('cycling');
  const [usingMockData, setUsingMockData] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);

  // Generate mock weather data
  const generateMockWeatherData = () => {
    const now = new Date();
    // Start from midnight of today to ensure full days are shown
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const hourly = [];

    for (let i = 0; i < 168; i++) { // 7 days
      const time = new Date(startOfToday.getTime() + i * 60 * 60 * 1000);
      const hour = time.getHours();
      
      // Create realistic weather patterns (adjusted for current season)
      // November in Berlin: typically 2-8°C
      const baseTemp = 5 + Math.sin((i / 24) * Math.PI) * 3;
      const seasonalVariation = Math.sin((i / 168) * Math.PI) * 2;
      const temp = baseTemp + seasonalVariation + (Math.random() - 0.5) * 2;
      
      // Wind patterns
      const windBase = hour < 6 || hour > 20 ? 2 : 5;
      const windSpeed = windBase + Math.random() * 4;
      
      // Rain probability
      const rainDay = Math.floor(i / 24) % 7;
      const rainBase = [0.1, 0.1, 0.6, 0.7, 0.2, 0.1, 0.3][rainDay];
      const pop = Math.min(0.9, rainBase + (Math.random() - 0.5) * 0.2);
      
      // Air Quality Index (1-5)
      // Worse in morning rush hour and evening, better at night
      let aqi;
      if (hour >= 7 && hour <= 9) {
        aqi = Math.floor(Math.random() * 2) + 2; // 2-3 (Fair-Moderate)
      } else if (hour >= 17 && hour <= 19) {
        aqi = Math.floor(Math.random() * 2) + 2; // 2-3 (Fair-Moderate)
      } else if (hour >= 0 && hour <= 5) {
        aqi = Math.floor(Math.random() * 2) + 1; // 1-2 (Good-Fair)
      } else {
        aqi = Math.floor(Math.random() * 3) + 1; // 1-3 (Good-Moderate)
      }
      
      // Weather conditions (must be defined before UV calculation)
      let weatherMain = 'Clear';
      let weatherDescription = 'clear sky';
      let hasThunderstorm = false;
      
      if (pop > 0.5) {
        weatherMain = 'Rain';
        weatherDescription = pop > 0.7 ? 'moderate rain' : 'light rain';
        // Chance of thunderstorm with heavy rain
        if (pop > 0.7 && Math.random() > 0.7) {
          weatherMain = 'Thunderstorm';
          weatherDescription = 'thunderstorm';
          hasThunderstorm = true;
        }
      } else if (pop > 0.3) {
        weatherMain = 'Clouds';
        weatherDescription = 'scattered clouds';
      } else if (Math.random() > 0.7) {
        weatherMain = 'Clouds';
        weatherDescription = 'few clouds';
      }
      
      // UV index (higher during midday, lower at night and in cloudy weather)
      let uvi = 0;
      if (hour >= 8 && hour <= 18) {
        // Peak UV around noon
        const noonDistance = Math.abs(hour - 13);
        uvi = Math.max(0, 8 - noonDistance * 1.2);
        // Reduce UV on cloudy/rainy days
        if (weatherMain === 'Clouds') uvi *= 0.6;
        if (weatherMain === 'Rain') uvi *= 0.3;
        uvi = Math.round(uvi * 10) / 10;
      }
      
      hourly.push({
        dt: Math.floor(time.getTime() / 1000),
        temp: Math.round(temp * 10) / 10,
        wind_speed: Math.round(windSpeed * 10) / 10,
        pop: Math.round(pop * 100) / 100,
        uvi: uvi,
        weather: [{ main: weatherMain, description: weatherDescription }],
        air_quality: { aqi: aqi },
        hasThunderstorm: hasThunderstorm
      });
    }
    
    return { hourly };
  };

  const getOpeningHours = (date) => {
    const month = date.getMonth();
    return month >= 3 && month <= 8 ? { open: 6, close: 22 } : { open: 7, close: 21 };
  };

  const isOpen = (hour, date) => {
    const hours = getOpeningHours(date);
    return hour >= hours.open && hour < hours.close;
  };

  const calculateCrowdFactor = (hour, dayOfWeek, temp, weatherCondition) => {
    let crowdScore = 0;
    if (dayOfWeek === 0 || dayOfWeek === 6) crowdScore += 30;
    if (hour >= 11 && hour <= 18) crowdScore += 25;
    else if (hour >= 9 && hour < 11) crowdScore += 15;
    else if (hour > 18 && hour <= 20) crowdScore += 15;
    if (temp > 15 && temp < 25 && !weatherCondition.includes('rain')) crowdScore += 20;
    if (weatherCondition.includes('rain') || temp < 5 || temp > 30) crowdScore -= 20;
    return Math.max(0, Math.min(100, crowdScore));
  };

  const calculateBikeabilityScore = (hourData) => {
    if (activity === 'jogging') {
      return calculateJoggingScore(hourData);
    } else if (activity === 'kiting') {
      return calculateKitingScore(hourData);
    } else if (activity === 'picnic') {
      return calculatePicnicScore(hourData);
    }
    return calculateCyclingScore(hourData);
  };

  const calculateCyclingScore = (hourData) => {
    let score = 100;
    const date = new Date(hourData.dt * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const config = SCORING_CONFIG.cycling;

    if (!isOpen(hour, date)) return 0;

    // Thunderstorm penalty - CRITICAL (exposed area)
    if (hourData.hasThunderstorm || hourData.weather[0].main === 'Thunderstorm') {
      return 0; // Absolutely not safe
    }

    // Rain penalty
    const pop = hourData.pop;
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      score += config.rain.base;
      score += pop * config.rain.probMultiplier;
    } else if (pop > config.rain.threshold) {
      score -= Math.pow((pop - config.rain.threshold) / (1 - config.rain.threshold), config.rain.exponent) * config.rain.maxPenalty;
    }

    // Wind penalty
    const windSpeed = hourData.wind_speed;
    if (windSpeed > config.wind.threshold) {
      const windPenalty = Math.pow((windSpeed - config.wind.threshold) / config.wind.range, config.wind.exponent) * config.wind.maxPenalty;
      score -= Math.min(config.wind.maxPenalty, windPenalty);
    }

    // Crowd penalty
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * config.crowd.multiplier);

    // Temperature penalties
    const temp = hourData.temp;

    // Cold penalty
    if (temp < config.cold.threshold) {
      const coldPenalty = Math.pow((config.cold.threshold - temp) / config.cold.range, config.cold.exponent) * config.cold.maxPenalty;
      score -= Math.min(config.cold.maxPenalty, coldPenalty);
    }

    // Heat penalty
    if (temp > config.heat.threshold) {
      const hotPenalty = Math.pow((temp - config.heat.threshold) / config.heat.range, config.heat.exponent) * config.heat.maxPenalty;
      score -= Math.min(config.heat.maxPenalty, hotPenalty);
    }

    // Air Quality penalty
    if (hourData.air_quality && hourData.air_quality.aqi) {
      const aqi = hourData.air_quality.aqi;
      if (aqi > config.airQuality.threshold) {
        const aqiPenalty = Math.pow((aqi - config.airQuality.threshold) / config.airQuality.range, config.airQuality.exponent) * config.airQuality.maxPenalty;
        score -= aqiPenalty;
      }
    }

    // UV Index penalty
    if (hourData.uvi !== undefined) {
      const uvi = hourData.uvi;
      if (uvi > config.uv.threshold) {
        const uvPenalty = Math.pow((uvi - config.uv.threshold) / config.uv.range, config.uv.exponent) * config.uv.maxPenalty;
        score -= Math.min(config.uv.maxPenalty, uvPenalty);
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const calculateJoggingScore = (hourData) => {
    let score = 100;
    const date = new Date(hourData.dt * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const config = SCORING_CONFIG.jogging;

    if (!isOpen(hour, date)) return 0;

    // Thunderstorm penalty - CRITICAL (exposed area)
    if (hourData.hasThunderstorm || hourData.weather[0].main === 'Thunderstorm') {
      return 0; // Absolutely not safe
    }

    // Rain penalty
    const pop = hourData.pop;
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      score += config.rain.base;
      score += pop * config.rain.probMultiplier;
    } else if (pop > config.rain.threshold) {
      score -= Math.pow((pop - config.rain.threshold) / (1 - config.rain.threshold), config.rain.exponent) * config.rain.maxPenalty;
    }

    // Wind penalty
    const windSpeed = hourData.wind_speed;
    if (windSpeed > config.wind.threshold) {
      const windPenalty = Math.pow((windSpeed - config.wind.threshold) / config.wind.range, config.wind.exponent) * config.wind.maxPenalty;
      score -= Math.min(config.wind.maxPenalty, windPenalty);
    }

    // Crowd penalty
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * config.crowd.multiplier);

    // Temperature penalties
    const temp = hourData.temp;

    // Cold penalty
    if (temp < config.cold.threshold) {
      const coldPenalty = Math.pow((config.cold.threshold - temp) / config.cold.range, config.cold.exponent) * config.cold.maxPenalty;
      score -= Math.min(config.cold.maxPenalty, coldPenalty);
    }

    // Heat penalty
    if (temp > config.heat.threshold) {
      const hotPenalty = Math.pow((temp - config.heat.threshold) / config.heat.range, config.heat.exponent) * config.heat.maxPenalty;
      score -= Math.min(config.heat.maxPenalty, hotPenalty);
    }

    // Air Quality penalty
    if (hourData.air_quality && hourData.air_quality.aqi) {
      const aqi = hourData.air_quality.aqi;
      if (aqi > config.airQuality.threshold) {
        const aqiPenalty = Math.pow((aqi - config.airQuality.threshold) / config.airQuality.range, config.airQuality.exponent) * config.airQuality.maxPenalty;
        score -= aqiPenalty;
      }
    }

    // UV Index penalty
    if (hourData.uvi !== undefined) {
      const uvi = hourData.uvi;
      if (uvi > config.uv.threshold) {
        const uvPenalty = Math.pow((uvi - config.uv.threshold) / config.uv.range, config.uv.exponent) * config.uv.maxPenalty;
        score -= Math.min(config.uv.maxPenalty, uvPenalty);
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const calculateKitingScore = (hourData) => {
    let score = 100;
    const date = new Date(hourData.dt * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const config = SCORING_CONFIG.kiting;

    if (!isOpen(hour, date)) return 0;

    // Thunderstorm penalty - EXTREMELY CRITICAL for kiting (metal frame + lightning)
    if (hourData.hasThunderstorm || hourData.weather[0].main === 'Thunderstorm') {
      return 0; // Deadly combination
    }

    // Wind - CRITICAL for kiting! Need wind but not too much
    const windSpeed = hourData.wind_speed;
    const w = config.wind;
    if (windSpeed < w.tooLightThreshold) {
      // < 5 m/s: Too light, insufficient power
      score += w.tooLightPenalty;
    } else if (windSpeed >= w.workableMin && windSpeed <= w.workableMax) {
      // 5-11 m/s: Workable range (no penalty, this is good!)
      // No adjustment needed - this is the ideal range
    } else if (windSpeed > w.dangerousMin && windSpeed <= w.dangerousMax) {
      // 11-13 m/s: Getting dangerous
      score += w.dangerousPenalty;
    } else if (windSpeed > w.veryDangerousThreshold) {
      // > 13 m/s: Very dangerous
      score += w.veryDangerousPenalty;
    }

    // Rain penalty
    const pop = hourData.pop;
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      score += config.rain.base;
      score += pop * config.rain.probMultiplier;
    } else if (pop > config.rain.threshold) {
      score -= Math.pow((pop - config.rain.threshold) / (1 - config.rain.threshold), config.rain.exponent) * config.rain.maxPenalty;
    }

    // Crowd penalty
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * config.crowd.multiplier);

    // Temperature penalties
    const temp = hourData.temp;

    // Cold penalty
    if (temp < config.cold.threshold) {
      const coldPenalty = Math.pow((config.cold.threshold - temp) / config.cold.range, config.cold.exponent) * config.cold.maxPenalty;
      score -= Math.min(config.cold.maxPenalty, coldPenalty);
    } else if (temp > config.heat.threshold) {
      score += config.heat.flatPenalty;
    }

    // Air Quality penalty
    if (hourData.air_quality && hourData.air_quality.aqi) {
      const aqi = hourData.air_quality.aqi;
      if (aqi > config.airQuality.threshold) {
        const aqiPenalty = Math.pow((aqi - config.airQuality.threshold) / config.airQuality.range, config.airQuality.exponent) * config.airQuality.maxPenalty;
        score -= aqiPenalty;
      }
    }

    // UV Index penalty
    if (hourData.uvi !== undefined) {
      const uvi = hourData.uvi;
      if (uvi > config.uv.threshold) {
        const uvPenalty = Math.pow((uvi - config.uv.threshold) / config.uv.range, config.uv.exponent) * config.uv.maxPenalty;
        score -= Math.min(config.uv.maxPenalty, uvPenalty);
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const calculatePicnicScore = (hourData) => {
    let score = 100;
    const date = new Date(hourData.dt * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const config = SCORING_CONFIG.picnic;

    if (!isOpen(hour, date)) return 0;

    // Thunderstorm penalty - ruins everything
    if (hourData.hasThunderstorm || hourData.weather[0].main === 'Thunderstorm') {
      return 0; // Pack up and go home
    }

    // Rain penalty - WORST for picnic
    const pop = hourData.pop;
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      score += config.rain.base;
      score += pop * config.rain.probMultiplier;
    } else if (pop > config.rain.threshold) {
      score -= Math.pow((pop - config.rain.threshold) / (1 - config.rain.threshold), config.rain.exponent) * config.rain.maxPenalty;
    }

    // Wind penalty
    const windSpeed = hourData.wind_speed;
    if (windSpeed > config.wind.threshold) {
      const windPenalty = Math.pow((windSpeed - config.wind.threshold) / config.wind.range, config.wind.exponent) * config.wind.maxPenalty;
      score -= Math.min(config.wind.maxPenalty, windPenalty);
    }

    // Crowd penalty (mild for picnic - crowds less of an issue)
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * config.crowd.multiplier);

    // Temperature penalties
    const temp = hourData.temp;

    // Cold penalty
    if (temp < config.cold.threshold) {
      const coldPenalty = Math.pow((config.cold.threshold - temp) / config.cold.range, config.cold.exponent) * config.cold.maxPenalty;
      score -= Math.min(config.cold.maxPenalty, coldPenalty);
    }

    // Heat penalty
    if (temp > config.heat.threshold) {
      const hotPenalty = Math.pow((temp - config.heat.threshold) / config.heat.range, config.heat.exponent) * config.heat.maxPenalty;
      score -= Math.min(config.heat.maxPenalty, hotPenalty);
    }

    // Air Quality penalty
    if (hourData.air_quality && hourData.air_quality.aqi) {
      const aqi = hourData.air_quality.aqi;
      if (aqi > config.airQuality.threshold) {
        const aqiPenalty = Math.pow((aqi - config.airQuality.threshold) / config.airQuality.range, config.airQuality.exponent) * config.airQuality.maxPenalty;
        score -= aqiPenalty;
      }
    }

    // UV Index penalty
    if (hourData.uvi !== undefined) {
      const uvi = hourData.uvi;
      if (uvi > config.uv.threshold) {
        const uvPenalty = Math.pow((uvi - config.uv.threshold) / config.uv.range, config.uv.exponent) * config.uv.maxPenalty;
        score -= Math.min(config.uv.maxPenalty, uvPenalty);
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getScoreColor = (score) => {
    if (score === 0) {
      // Closed - grey
      return {
        backgroundColor: 'rgb(229, 231, 235)', // gray-200
        borderColor: 'rgb(156, 163, 175)', // gray-400
        color: 'rgb(55, 65, 81)' // gray-700
      };
    }

    // Continuous gradient from green (100) → yellow (70) → red (1)
    // Using HSL for smooth color transitions
    let hue, saturation, lightness;

    if (score >= 70) {
      // Green to Yellow (100 → 70)
      // Hue: 120 (green) → 60 (yellow)
      const t = (score - 70) / 30;
      hue = 60 + t * 60;
      saturation = 65;
      lightness = 75;
    } else if (score >= 35) {
      // Yellow to Orange (70 → 35)
      // Hue: 60 (yellow) → 30 (orange)
      const t = (score - 35) / 35;
      hue = 30 + t * 30;
      saturation = 70;
      lightness = 72;
    } else {
      // Orange to Red (35 → 1)
      // Hue: 30 (orange) → 0 (red)
      const t = (score - 1) / 34;
      hue = 0 + t * 30;
      saturation = 75;
      lightness = 70;
    }

    return {
      backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      borderColor: `hsl(${hue}, ${saturation + 10}%, ${lightness - 20}%)`,
      color: `hsl(${hue}, ${saturation}%, 25%)`
    };
  };

  const getScoreLabel = (score) => {
    if (score === 0) return 'Closed';
    if (score >= 70) return 'Good';
    if (score >= 35) return 'Fair';
    return 'Poor';
  };

  const loadForecast = async () => {
    setLoading(true);

    try {
      // Try to fetch real weather data from Netlify function
      const response = await fetch('/.netlify/functions/weather');

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setForecastData(result.data);
          setUsingMockData(false);
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.log('Failed to fetch real weather data, using mock data:', error.message);
    }

    // Fallback to mock data if API fetch fails
    setTimeout(() => {
      setForecastData(generateMockWeatherData());
      setUsingMockData(true);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    loadForecast();
  }, []);

  const groupHoursByDay = (hours) => {
    const days = {};
    hours.forEach(hour => {
      const date = new Date(hour.dt * 1000);
      const dayKey = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!days[dayKey]) days[dayKey] = [];
      days[dayKey].push(hour);
    });
    return days;
  };

  if (loading || !forecastData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700">Loading forecast...</p>
        </div>
      </div>
    );
  }

  const hourlyData = forecastData.hourly;
  const hoursWithScores = hourlyData.map(hour => ({
    ...hour,
    score: calculateBikeabilityScore(hour)
  }));
  
  const dayGroups = groupHoursByDay(hoursWithScores);
  
  // Get top 3 times from next 3 days only (72 hours) - exclude past hours
  const now = new Date();
  const next3Days = hoursWithScores.slice(0, 72);
  const bestTimes = next3Days
    .filter(h => {
      const hourDate = new Date(h.dt * 1000);
      return h.score > 0 && hourDate >= now; // Only future hours
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      {/* Detail Modal */}
      {selectedHour && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedHour(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {new Date(selectedHour.dt * 1000).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedHour.dt * 1000).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedHour(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold -mt-1"
                >
                  ×
                </button>
              </div>

              {/* Score */}
              <div className="mb-3">
                <div
                  className="inline-block px-4 py-2 rounded-lg border-2"
                  style={selectedHour.score > 0 ? getScoreColor(selectedHour.score) : {
                    backgroundColor: 'rgb(229, 231, 235)',
                    borderColor: 'rgb(156, 163, 175)',
                    color: 'rgb(55, 65, 81)'
                  }}
                >
                  <div className="text-xs font-medium opacity-80">
                    {activity.charAt(0).toUpperCase() + activity.slice(1)} Score
                  </div>
                  <div className="text-3xl font-bold">
                    {selectedHour.score === 0 ? 'Closed' : selectedHour.score}
                  </div>
                  <div className="text-xs opacity-80">
                    {getScoreLabel(selectedHour.score)}
                  </div>
                </div>
              </div>

              {/* Weather Details */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                    <ThermometerSun className="w-4 h-4" />
                    <span className="text-xs font-medium">Temperature</span>
                  </div>
                  <div className="text-xl font-bold text-gray-800">
                    {Math.round(selectedHour.temp)}°C
                  </div>
                  {selectedHour.feels_like && (
                    <div className="text-xs text-gray-600">
                      Feels {Math.round(selectedHour.feels_like)}°C
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                    <Wind className="w-4 h-4" />
                    <span className="text-xs font-medium">Wind</span>
                  </div>
                  <div className="text-xl font-bold text-gray-800">
                    {Math.round(selectedHour.wind_speed)} m/s
                  </div>
                  {selectedHour.wind_gust && selectedHour.wind_gust > selectedHour.wind_speed && (
                    <div className="text-xs text-gray-600">
                      Gusts {Math.round(selectedHour.wind_gust)} m/s
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                    <Droplets className="w-4 h-4" />
                    <span className="text-xs font-medium">Precipitation</span>
                  </div>
                  <div className="text-xl font-bold text-gray-800">
                    {Math.round(selectedHour.pop * 100)}%
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {selectedHour.weather[0].description}
                  </div>
                </div>

                <div className="bg-gray-50 p-2 rounded-lg">
                  <div className="flex items-center gap-1 text-gray-600 mb-0.5">
                    <Cloud className="w-4 h-4" />
                    <span className="text-xs font-medium">Air Quality</span>
                  </div>
                  <div className="text-xl font-bold text-gray-800">
                    AQI {selectedHour.air_quality?.aqi || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {selectedHour.air_quality?.aqi === 1 && 'Good'}
                    {selectedHour.air_quality?.aqi === 2 && 'Fair'}
                    {selectedHour.air_quality?.aqi === 3 && 'Moderate'}
                    {selectedHour.air_quality?.aqi === 4 && 'Poor'}
                    {selectedHour.air_quality?.aqi === 5 && 'Very Poor'}
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="border-t pt-2 space-y-1">
                <h3 className="font-semibold text-xs text-gray-700 mb-1.5">Additional Details</h3>

                {selectedHour.uvi !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">UV Index</span>
                    <span className="font-medium text-gray-800">
                      {selectedHour.uvi.toFixed(1)}
                    </span>
                  </div>
                )}

                {selectedHour.humidity !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Humidity</span>
                    <span className="font-medium text-gray-800">
                      {selectedHour.humidity}%
                    </span>
                  </div>
                )}

                {selectedHour.pressure !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Pressure</span>
                    <span className="font-medium text-gray-800">
                      {selectedHour.pressure} hPa
                    </span>
                  </div>
                )}

                {selectedHour.clouds !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Cloud Cover</span>
                    <span className="font-medium text-gray-800">
                      {selectedHour.clouds}%
                    </span>
                  </div>
                )}

                {selectedHour.visibility !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Visibility</span>
                    <span className="font-medium text-gray-800">
                      {(selectedHour.visibility / 1000).toFixed(1)} km
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Estimated Crowds</span>
                  <span className="font-medium text-gray-800">
                    {calculateCrowdFactor(
                      new Date(selectedHour.dt * 1000).getHours(),
                      new Date(selectedHour.dt * 1000).getDay(),
                      selectedHour.temp,
                      selectedHour.weather[0].main
                    ).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Tempelhofer Feld
              </h1>
              <p className="text-gray-600">
                {activity === 'cycling' && 'Cycling Forecast - Next 7 days'}
                {activity === 'jogging' && 'Jogging Forecast - Next 7 days'}
                {activity === 'kiting' && 'Kiting Forecast - Next 7 days'}
                {activity === 'picnic' && 'Picnic Forecast - Next 7 days'}
              </p>
            </div>
            <button
              onClick={loadForecast}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {/* Activity Selector */}
          <div className="mt-6 bg-gray-100 p-1 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-1 max-w-2xl">
            <button
              onClick={() => setActivity('cycling')}
              className={`px-4 py-2.5 rounded-lg font-semibold transition-all text-sm md:text-base ${
                activity === 'cycling'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Cycling
            </button>
            <button
              onClick={() => setActivity('jogging')}
              className={`px-4 py-2.5 rounded-lg font-semibold transition-all text-sm md:text-base ${
                activity === 'jogging'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Jogging
            </button>
            <button
              onClick={() => setActivity('kiting')}
              className={`px-4 py-2.5 rounded-lg font-semibold transition-all text-sm md:text-base ${
                activity === 'kiting'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kiting
            </button>
            <button
              onClick={() => setActivity('picnic')}
              className={`px-4 py-2.5 rounded-lg font-semibold transition-all text-sm md:text-base ${
                activity === 'picnic'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Picnic
            </button>
          </div>
          
          {usingMockData && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Mock Data:</strong> Using simulated weather data. Add an OpenWeatherMap API key to see real forecasts.
              </p>
            </div>
          )}

          {!usingMockData && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Live Data:</strong> Showing real weather forecast from OpenWeatherMap.
              </p>
            </div>
          )}
        </div>

        {/* Best Times */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">Top 3 Best Times (Next 3 Days)</h2>
          </div>
          <div className="flex justify-center">
            <div className="grid grid-cols-3 gap-4">
              {bestTimes.map((hour, idx) => {
                const date = new Date(hour.dt * 1000);
                const colors = getScoreColor(hour.score);
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="text-sm text-gray-500 mb-2">#{idx + 1}</div>
                    <div
                      onClick={() => setSelectedHour(hour)}
                      className="border-2 rounded-lg p-1.5 transition-all hover:scale-105 cursor-pointer w-24"
                      style={colors}
                    >
                      <div className="flex flex-col items-center mb-0.5">
                        <div className="text-[10px] font-medium text-gray-600 mb-0.5 whitespace-nowrap">
                          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-900 w-full text-center">
                          {date.getHours().toString().padStart(2, '0')}:00
                        </div>
                        <div className="text-lg font-bold leading-tight">
                          {hour.score}
                        </div>
                      </div>
                      
                      <div className="space-y-0.5 text-xs min-h-[64px] flex flex-col justify-center">
                        <div className="flex items-center justify-center gap-1">
                          <ThermometerSun className="w-3 h-3" />
                          <span>{Math.round(hour.temp)}°C</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <Wind className="w-3 h-3" />
                          <span>{Math.round(hour.wind_speed)}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <Droplets className="w-3 h-3" />
                          <span>{Math.round(hour.pop * 100)}%</span>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <Cloud className="w-3 h-3" />
                          <span>{hour.air_quality ? `AQI ${hour.air_quality.aqi}` : 'AQI N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Daily Forecasts - Clean 2-Row Layout */}
        <div className="space-y-6">
          {Object.entries(dayGroups).slice(0, 3).map(([day, hours]) => {
            // Split hours into two rows
            const midpoint = Math.ceil(hours.length / 2);
            const morningHours = hours.slice(0, midpoint);
            const afternoonHours = hours.slice(midpoint);
            
            const renderHourCard = (hour) => {
              const date = new Date(hour.dt * 1000);
              const now = new Date();
              const isPast = date < now;
              const isToday = date.toDateString() === now.toDateString();
              const showGreyedOut = isPast && isToday;
              
              const crowdFactor = calculateCrowdFactor(
                date.getHours(),
                date.getDay(),
                hour.temp,
                hour.weather[0].main
              );

              const colors = hour.score > 0 ? getScoreColor(hour.score) : {};

              return (
                <div
                  key={hour.dt}
                  onClick={() => setSelectedHour(hour)}
                  className={`border-2 rounded-lg p-1.5 transition-all hover:scale-105 cursor-pointer ${
                    showGreyedOut
                      ? 'opacity-40'
                      : hour.score === 0
                      ? 'border-gray-300 bg-gray-50 opacity-40'
                      : ''
                  }`}
                  style={hour.score > 0 ? colors : {}}
                >
                  <div className="flex flex-col items-center mb-0.5">
                    <div className={`text-[10px] font-semibold w-full text-center ${
                      showGreyedOut ? 'text-gray-500' : 'text-gray-900'
                    }`}>
                      {date.getHours().toString().padStart(2, '0')}:00
                    </div>
                    <div className={`text-lg font-bold leading-tight ${
                      showGreyedOut ? 'text-gray-400' : hour.score === 0 ? 'text-gray-400' : ''
                    }`}>
                      {hour.score === 0 ? '-' : hour.score}
                    </div>
                  </div>
                  
                  <div className={`space-y-0.5 text-xs ${showGreyedOut ? 'text-gray-500' : ''}`}>
                    <div className="flex items-center justify-center gap-1">
                      <ThermometerSun className="w-3 h-3" />
                      <span>{Math.round(hour.temp)}°C</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Wind className="w-3 h-3" />
                      <span>{Math.round(hour.wind_speed)}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Droplets className="w-3 h-3" />
                      <span>{Math.round(hour.pop * 100)}%</span>
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div key={day} className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{day}</h3>
                
                <div className="space-y-2">
                  {/* First row */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {morningHours.map(renderHourCard)}
                  </div>
                  
                  {/* Second row */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {afternoonHours.map(renderHourCard)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            How the Score Works for {activity === 'cycling' && 'Cycling'}
            {activity === 'jogging' && 'Jogging'}
            {activity === 'kiting' && 'Kiting'}
            {activity === 'picnic' && 'Picnic'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Penalties (continuous scales):</h4>
              {activity === 'cycling' ? (
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <strong>Thunderstorms:</strong> Score = 0
                    <div className="text-xs mt-1 ml-4">Not safe in exposed area</div>
                  </li>
                  <li>
                    <strong>Rain:</strong> -40 base + up to -20 for probability
                    <div className="text-xs mt-1 ml-4">Active rain is worst, but high chance also penalized</div>
                  </li>
                  <li>
                    <strong>Wind:</strong> Gradual from 3 m/s
                    <div className="text-xs mt-1 ml-4">5 m/s = -4, 7 m/s = -11, 10 m/s = -24, 13+ m/s = -40</div>
                  </li>
                  <li>
                    <strong>Crowds:</strong> Up to -25 points
                    <div className="text-xs mt-1 ml-4">Based on time, day, and weather</div>
                  </li>
                  <li>
                    <strong>Cold:</strong> Gradual below 12°C (max -40)
                    <div className="text-xs mt-1 ml-4">8°C = -8, 5°C = -16, 0°C = -28, -5°C = -40</div>
                  </li>
                  <li>
                    <strong>Heat:</strong> Gradual above 24°C
                    <div className="text-xs mt-1 ml-4">26°C = -2, 28°C = -6, 32°C = -17, 35°C = -26</div>
                  </li>
                  <li>
                    <strong>Air Quality:</strong> AQI-based penalty
                    <div className="text-xs mt-1 ml-4">1=Good (0), 2=Fair (-5), 3=Moderate (-12), 4=Poor (-22)</div>
                  </li>
                  <li>
                    <strong>UV Index:</strong> Gradual above 5
                    <div className="text-xs mt-1 ml-4">6 = -3, 8 = -10, 10 = -17, 11+ = -20</div>
                  </li>
                </ul>
              ) : activity === 'jogging' ? (
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <strong>Thunderstorms:</strong> Score = 0
                    <div className="text-xs mt-1 ml-4">Not safe in exposed area</div>
                  </li>
                  <li>
                    <strong>Rain:</strong> -25 base + up to -12 for probability
                    <div className="text-xs mt-1 ml-4">Many runners don't mind light rain</div>
                  </li>
                  <li>
                    <strong>Wind:</strong> Gradual from 5 m/s (max -15)
                    <div className="text-xs mt-1 ml-4">Much less affected than cycling</div>
                  </li>
                  <li>
                    <strong>Crowds:</strong> Up to -10 points
                    <div className="text-xs mt-1 ml-4">Easier to navigate than on a bike</div>
                  </li>
                  <li>
                    <strong>Cold:</strong> Gradual below 10°C (max -20)
                    <div className="text-xs mt-1 ml-4">You warm up while running</div>
                  </li>
                  <li>
                    <strong>Heat:</strong> Gradual above 22°C (max -35)
                    <div className="text-xs mt-1 ml-4">25°C = -8, 28°C = -18, 30°C = -27 (overheating risk!)</div>
                  </li>
                  <li>
                    <strong>UV Index:</strong> Gradual above 4 (max -25)
                    <div className="text-xs mt-1 ml-4">More exposed, slower, longer duration</div>
                  </li>
                </ul>
              ) : activity === 'kiting' ? (
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <strong>Thunderstorms:</strong> Score = 0 (DEADLY!)
                    <div className="text-xs mt-1 ml-4">Metal frame + lightning = extreme danger</div>
                  </li>
                  <li>
                    <strong>Wind:</strong> NEEDS WIND! 5-11 m/s ideal range
                    <div className="text-xs mt-1 ml-4">&lt;5 m/s = -50 (too light), 5-11 m/s = no penalty, 11-13 m/s = -25, &gt;13 m/s = -50 (dangerous)</div>
                  </li>
                  <li>
                    <strong>Rain:</strong> -30 base + up to -15 for probability
                    <div className="text-xs mt-1 ml-4">Wet equipment, visibility issues</div>
                  </li>
                  <li>
                    <strong>Crowds:</strong> Up to -35 points
                    <div className="text-xs mt-1 ml-4">SAFETY: Need space for kite</div>
                  </li>
                  <li>
                    <strong>Cold:</strong> Gradual below 10°C (max -40)
                    <div className="text-xs mt-1 ml-4">5°C = -18, 0°C = -32, -5°C = -40 (cold hands hurt control)</div>
                  </li>
                  <li>
                    <strong>UV Index:</strong> Gradual above 5 (max -20)
                    <div className="text-xs mt-1 ml-4">Standing outside for hours</div>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <strong>Thunderstorms:</strong> Score = 0
                    <div className="text-xs mt-1 ml-4">Pack up and go home</div>
                  </li>
                  <li>
                    <strong>Rain:</strong> -60 base + up to -20 penalty
                    <div className="text-xs mt-1 ml-4">Ruins food, blankets, everything</div>
                  </li>
                  <li>
                    <strong>Wind:</strong> Gradual above 3 m/s (max -40)
                    <div className="text-xs mt-1 ml-4">Flies blankets, ruins setup</div>
                  </li>
                  <li>
                    <strong>Crowds:</strong> Up to -25 points
                    <div className="text-xs mt-1 ml-4">Mild penalty (less of an issue than for cycling)</div>
                  </li>
                  <li>
                    <strong>Cold:</strong> Gradual below 15°C (max -35)
                    <div className="text-xs mt-1 ml-4">12°C = -8, 8°C = -20, 5°C = -28, 0°C = -35</div>
                  </li>
                  <li>
                    <strong>Heat:</strong> Gradual above 28°C (max -20)
                    <div className="text-xs mt-1 ml-4">Too hot for sitting in sun</div>
                  </li>
                  <li>
                    <strong>UV Index:</strong> Gradual above 4 (max -30)
                    <div className="text-xs mt-1 ml-4">Sitting in sun for extended periods</div>
                  </li>
                </ul>
              )}
            </div>
            <div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Scoring System</h4>
                <p className="text-sm text-blue-800">
                  All activities start at <strong>100 points</strong>. Only penalties apply - no bonuses. The score reflects how many conditions are working against your activity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
