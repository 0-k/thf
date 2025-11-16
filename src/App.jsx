import React, { useState, useEffect } from 'react';
import { Cloud, Wind, Droplets, ThermometerSun, Users, TrendingUp, RefreshCw } from 'lucide-react';

export default function TempelhoferBikeForecast() {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState('cycling'); // 'cycling' or 'jogging'

  // Generate mock weather data
  const generateMockWeatherData = () => {
    const now = new Date();
    const hourly = [];
    
    for (let i = 0; i < 168; i++) { // 7 days
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = time.getHours();
      
      // Create realistic weather patterns
      const baseTemp = 15 + Math.sin((i / 24) * Math.PI) * 5;
      const seasonalVariation = Math.sin((i / 168) * Math.PI) * 3;
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
    
    if (!isOpen(hour, date)) return 0;
    
    // Thunderstorm penalty - CRITICAL (exposed area)
    if (hourData.hasThunderstorm || hourData.weather[0].main === 'Thunderstorm') {
      return 0; // Absolutely not safe
    }
    
    // Rain penalty - continuous scale based on probability and actual rain
    const pop = hourData.pop;
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      // Base penalty for actual rain
      score -= 40;
      // Additional penalty based on rain probability (0-20 points for 0-100% chance)
      score -= pop * 20;
    } else {
      // Penalty for rain chance even without current rain
      // Gradual increase: 30% = -3, 50% = -7.5, 70% = -14, 90% = -22.5
      if (pop > 0.2) {
        score -= Math.pow((pop - 0.2) / 0.8, 1.5) * 25;
      }
    }
    
    // Wind penalty - continuous scale
    // Starts at 3 m/s (light breeze is fine), increases gradually
    // 3 m/s = 0, 5 m/s = -4, 7 m/s = -11, 10 m/s = -24, 13 m/s = -39 (capped at 40)
    const windSpeed = hourData.wind_speed;
    if (windSpeed > 3) {
      const windPenalty = Math.pow((windSpeed - 3) / 7, 1.3) * 40;
      score -= Math.min(40, windPenalty);
    }
    
    // Crowd penalty
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * 0.25);
    
    // Temperature penalty - continuous scales for both cold and hot
    const temp = hourData.temp;
    
    // Cold penalty: gets worse below 10°C
    // 10°C = 0, 5°C = -8, 0°C = -18, -5°C = -30
    if (temp < 10) {
      const coldPenalty = Math.pow((10 - temp) / 10, 1.2) * 30;
      score -= Math.min(30, coldPenalty);
    }
    
    // Hot penalty: gets worse above 24°C
    // 24°C = 0, 26°C = -2, 28°C = -6, 30°C = -11, 32°C = -17, 35°C = -26
    if (temp > 24) {
      const hotPenalty = Math.pow((temp - 24) / 11, 1.3) * 30;
      score -= Math.min(30, hotPenalty);
    }
    
    // Air Quality penalty - continuous scale
    // AQI: 1=Good (0), 2=Fair (-5), 3=Moderate (-12), 4=Poor (-22), 5=Very Poor (-35)
    if (hourData.air_quality && hourData.air_quality.aqi) {
      const aqi = hourData.air_quality.aqi;
      if (aqi > 1) {
        const aqiPenalty = Math.pow((aqi - 1) / 4, 1.4) * 35;
        score -= aqiPenalty;
      }
    }
    
    // UV Index penalty - continuous scale
    // UV: 0-5 = fine (0), 6-7 = high (-5 to -10), 8-10 = very high (-10 to -20), 11+ = extreme (-20)
    if (hourData.uvi !== undefined) {
      const uvi = hourData.uvi;
      if (uvi > 5) {
        const uvPenalty = Math.pow((uvi - 5) / 6, 1.2) * 20;
        score -= Math.min(20, uvPenalty);
      }
    }
    
    // Optimal temperature bonus (15-22°C)
    if (temp >= 15 && temp <= 22) {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const calculateJoggingScore = (hourData) => {
    let score = 100;
    const date = new Date(hourData.dt * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    if (!isOpen(hour, date)) return 0;
    
    // Thunderstorm penalty - CRITICAL (exposed area)
    if (hourData.hasThunderstorm || hourData.weather[0].main === 'Thunderstorm') {
      return 0; // Absolutely not safe
    }
    
    // Rain penalty - less severe for jogging (many runners don't mind light rain)
    const pop = hourData.pop;
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      score -= 20; // Half of cycling penalty
      score -= pop * 10; // Less additional penalty
    } else {
      if (pop > 0.3) {
        score -= Math.pow((pop - 0.3) / 0.7, 1.5) * 15;
      }
    }
    
    // Wind penalty - much less affected while jogging
    // Jogging is slower and lower profile than cycling
    const windSpeed = hourData.wind_speed;
    if (windSpeed > 5) {
      const windPenalty = Math.pow((windSpeed - 5) / 8, 1.2) * 15;
      score -= Math.min(15, windPenalty);
    }
    
    // Crowd penalty - less of an issue for joggers
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * 0.1); // Much less penalty than cycling
    
    // Temperature penalty - HEAT IS WORSE for jogging!
    const temp = hourData.temp;
    
    // Cold penalty: less severe (you warm up while running)
    // 10°C = 0, 5°C = -5, 0°C = -12, -5°C = -20
    if (temp < 10) {
      const coldPenalty = Math.pow((10 - temp) / 10, 1.1) * 20;
      score -= Math.min(20, coldPenalty);
    }
    
    // Hot penalty: MORE severe for jogging (overheating risk)
    // 22°C = 0, 25°C = -8, 28°C = -18, 30°C = -27, 32°C = -35
    if (temp > 22) {
      const hotPenalty = Math.pow((temp - 22) / 10, 1.4) * 35;
      score -= Math.min(35, hotPenalty);
    }
    
    // Air Quality penalty - same as cycling (breathing hard)
    if (hourData.air_quality && hourData.air_quality.aqi) {
      const aqi = hourData.air_quality.aqi;
      if (aqi > 1) {
        const aqiPenalty = Math.pow((aqi - 1) / 4, 1.4) * 35;
        score -= aqiPenalty;
      }
    }
    
    // UV Index penalty - MORE severe for jogging (more exposed, slower, longer duration)
    if (hourData.uvi !== undefined) {
      const uvi = hourData.uvi;
      if (uvi > 4) {
        const uvPenalty = Math.pow((uvi - 4) / 7, 1.3) * 25;
        score -= Math.min(25, uvPenalty);
      }
    }
    
    // Optimal temperature bonus (12-20°C - cooler is better for running)
    if (temp >= 12 && temp <= 20) {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const calculateKitingScore = (hourData) => {
    let score = 100;
    const date = new Date(hourData.dt * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    if (!isOpen(hour, date)) return 0;
    
    // Thunderstorm penalty - EXTREMELY CRITICAL for kiting (metal frame + lightning)
    if (hourData.hasThunderstorm || hourData.weather[0].main === 'Thunderstorm') {
      return 0; // Deadly combination
    }
    
    // Wind - INVERTED SCORING! Need wind for kiting
    const windSpeed = hourData.wind_speed;
    if (windSpeed < 2) {
      score -= 50; // No kiting without wind
    } else if (windSpeed < 4) {
      score -= 30; // Too light
    } else if (windSpeed >= 4 && windSpeed <= 7) {
      score += 30; // PERFECT! Optimal kiting wind
    } else if (windSpeed > 7 && windSpeed <= 10) {
      score += 10; // Good but getting strong
    } else if (windSpeed > 10 && windSpeed <= 12) {
      score -= 20; // Too strong, dangerous
    } else if (windSpeed > 12) {
      score -= 50; // Way too dangerous
    }
    
    // Rain penalty - annoying but not terrible
    const pop = hourData.pop;
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      score -= 15;
      score -= pop * 10;
    } else if (pop > 0.3) {
      score -= Math.pow((pop - 0.3) / 0.7, 1.5) * 10;
    }
    
    // Crowd penalty - VERY IMPORTANT for safety
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * 0.35); // Higher than cycling
    
    // Temperature - less critical for kiting
    const temp = hourData.temp;
    if (temp < 5) {
      score -= 15; // Cold hands
    } else if (temp > 30) {
      score -= 10; // Hot but manageable
    }
    
    // Air Quality - less relevant
    if (hourData.air_quality && hourData.air_quality.aqi) {
      const aqi = hourData.air_quality.aqi;
      if (aqi > 2) {
        const aqiPenalty = Math.pow((aqi - 2) / 3, 1.3) * 15;
        score -= aqiPenalty;
      }
    }
    
    // UV - important (standing outside for hours)
    if (hourData.uvi !== undefined) {
      const uvi = hourData.uvi;
      if (uvi > 5) {
        const uvPenalty = Math.pow((uvi - 5) / 6, 1.2) * 20;
        score -= Math.min(20, uvPenalty);
      }
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const calculatePicnicScore = (hourData) => {
    let score = 100;
    const date = new Date(hourData.dt * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    if (!isOpen(hour, date)) return 0;
    
    // Thunderstorm penalty - ruins everything
    if (hourData.hasThunderstorm || hourData.weather[0].main === 'Thunderstorm') {
      return 0; // Pack up and go home
    }
    
    // Rain penalty - WORST for picnic (ruins food, blankets, etc)
    const pop = hourData.pop;
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      score -= 60; // Deal breaker
      score -= pop * 20;
    } else {
      if (pop > 0.2) {
        score -= Math.pow((pop - 0.2) / 0.8, 1.6) * 35;
      }
    }
    
    // Wind penalty - moderate (ruins setup, flies blankets)
    const windSpeed = hourData.wind_speed;
    if (windSpeed > 4) {
      const windPenalty = Math.pow((windSpeed - 4) / 8, 1.2) * 25;
      score -= Math.min(25, windPenalty);
    }
    
    // Crowds - POSITIVE! Good atmosphere for socializing
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    if (crowdFactor > 30) {
      score += 10; // Nice atmosphere
    }
    
    // Temperature - wider comfort range for sitting
    const temp = hourData.temp;
    if (temp < 12) {
      const coldPenalty = Math.pow((12 - temp) / 12, 1.3) * 25;
      score -= Math.min(25, coldPenalty);
    }
    if (temp > 28) {
      const hotPenalty = Math.pow((temp - 28) / 10, 1.2) * 20;
      score -= Math.min(20, hotPenalty);
    }
    
    // Optimal temperature bonus (18-24°C)
    if (temp >= 18 && temp <= 24) {
      score += 10; // Perfect picnic weather
    }
    
    // Air Quality - moderate concern
    if (hourData.air_quality && hourData.air_quality.aqi) {
      const aqi = hourData.air_quality.aqi;
      if (aqi > 2) {
        const aqiPenalty = Math.pow((aqi - 2) / 3, 1.3) * 20;
        score -= aqiPenalty;
      }
    }
    
    // UV - IMPORTANT (sitting in sun for hours)
    if (hourData.uvi !== undefined) {
      const uvi = hourData.uvi;
      if (uvi > 4) {
        const uvPenalty = Math.pow((uvi - 4) / 7, 1.3) * 30;
        score -= Math.min(30, uvPenalty);
      }
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-600 bg-green-50 border-green-300';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    if (score >= 25) return 'text-orange-600 bg-orange-50 border-orange-300';
    return 'text-red-600 bg-red-50 border-red-300';
  };

  const getScoreLabel = (score) => {
    if (score === 0) return 'Closed';
    if (score >= 75) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 25) return 'Fair';
    return 'Poor';
  };

  const loadForecast = () => {
    setLoading(true);
    setTimeout(() => {
      setForecastData(generateMockWeatherData());
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
  
  // Get top 3 times from next 3 days only (72 hours)
  const next3Days = hoursWithScores.slice(0, 72);
  const bestTimes = next3Days
    .filter(h => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {activity === 'cycling' && '🚴 Tempelhofer Feld - Cycling'}
                {activity === 'jogging' && '🏃 Tempelhofer Feld - Jogging'}
                {activity === 'kiting' && '🪁 Tempelhofer Feld - Kiting'}
                {activity === 'picnic' && '🧺 Tempelhofer Feld - Picnic'}
              </h1>
              <p className="text-gray-600">Hourly conditions for the next 7 days</p>
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
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActivity('cycling')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activity === 'cycling'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🚴 Cycling
            </button>
            <button
              onClick={() => setActivity('jogging')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activity === 'jogging'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏃 Jogging
            </button>
            <button
              onClick={() => setActivity('kiting')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activity === 'kiting'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🪁 Kiting
            </button>
            <button
              onClick={() => setActivity('picnic')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activity === 'picnic'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🧺 Picnic
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Demo Mode:</strong> Showing mock weather and air quality data. In production, this would use real data from OpenWeatherMap.
            </p>
          </div>
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
                return (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="text-sm text-gray-500 mb-2">#{idx + 1}</div>
                    <div
                      className={`border-2 rounded-lg p-1.5 transition-all ${getScoreColor(hour.score)}`}
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
                      
                      <div className="space-y-0.5 text-xs">
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
                        {hour.air_quality && (
                          <div className="flex items-center justify-center gap-1">
                            <Cloud className="w-3 h-3" />
                            <span>AQI {hour.air_quality.aqi}</span>
                          </div>
                        )}
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

              return (
                <div
                  key={hour.dt}
                  className={`border-2 rounded-lg p-1.5 transition-all hover:scale-105 ${
                    showGreyedOut
                      ? 'border-gray-300 bg-gray-100 opacity-50'
                      : hour.score === 0 
                      ? 'border-gray-300 bg-gray-50 opacity-40' 
                      : getScoreColor(hour.score)
                  }`}
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
                      {hour.score}
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
                    <strong>⚡ Thunderstorms:</strong> Score = 0
                    <div className="text-xs mt-1 ml-4">Not safe in exposed area</div>
                  </li>
                  <li>
                    <strong>🌧️ Rain:</strong> -40 base + up to -20 for probability
                    <div className="text-xs mt-1 ml-4">Active rain is worst, but high chance also penalized</div>
                  </li>
                  <li>
                    <strong>💨 Wind:</strong> Gradual from 3 m/s
                    <div className="text-xs mt-1 ml-4">5 m/s = -4, 7 m/s = -11, 10 m/s = -24, 13+ m/s = -40</div>
                  </li>
                  <li>
                    <strong>👥 Crowds:</strong> Up to -25 points
                    <div className="text-xs mt-1 ml-4">Based on time, day, and weather</div>
                  </li>
                  <li>
                    <strong>🥶 Cold:</strong> Gradual below 10°C
                    <div className="text-xs mt-1 ml-4">5°C = -8, 0°C = -18, -5°C = -30</div>
                  </li>
                  <li>
                    <strong>🥵 Hot:</strong> Gradual above 24°C
                    <div className="text-xs mt-1 ml-4">26°C = -2, 28°C = -6, 32°C = -17, 35°C = -26</div>
                  </li>
                  <li>
                    <strong>💨 Air Quality:</strong> AQI-based penalty
                    <div className="text-xs mt-1 ml-4">1=Good (0), 2=Fair (-5), 3=Moderate (-12), 4=Poor (-22)</div>
                  </li>
                  <li>
                    <strong>☀️ UV Index:</strong> Gradual above 5
                    <div className="text-xs mt-1 ml-4">6 = -3, 8 = -10, 10 = -17, 11+ = -20</div>
                  </li>
                </ul>
              ) : activity === 'jogging' ? (
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <strong>⚡ Thunderstorms:</strong> Score = 0
                    <div className="text-xs mt-1 ml-4">Not safe in exposed area</div>
                  </li>
                  <li>
                    <strong>🌧️ Rain:</strong> -20 base + up to -10 for probability
                    <div className="text-xs mt-1 ml-4">Many runners don't mind light rain</div>
                  </li>
                  <li>
                    <strong>💨 Wind:</strong> Gradual from 5 m/s (max -15)
                    <div className="text-xs mt-1 ml-4">Much less affected than cycling</div>
                  </li>
                  <li>
                    <strong>👥 Crowds:</strong> Up to -10 points
                    <div className="text-xs mt-1 ml-4">Easier to navigate than on a bike</div>
                  </li>
                  <li>
                    <strong>🥶 Cold:</strong> Gradual below 10°C (max -20)
                    <div className="text-xs mt-1 ml-4">You warm up while running</div>
                  </li>
                  <li>
                    <strong>🥵 Hot:</strong> Gradual above 22°C (max -35)
                    <div className="text-xs mt-1 ml-4">25°C = -8, 28°C = -18, 30°C = -27 (overheating risk!)</div>
                  </li>
                  <li>
                    <strong>☀️ UV Index:</strong> Gradual above 4 (max -25)
                    <div className="text-xs mt-1 ml-4">More exposed, slower, longer duration</div>
                  </li>
                </ul>
              ) : activity === 'kiting' ? (
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <strong>⚡ Thunderstorms:</strong> Score = 0 (DEADLY!)
                    <div className="text-xs mt-1 ml-4">Metal frame + lightning = extreme danger</div>
                  </li>
                  <li>
                    <strong>💨 Wind:</strong> NEEDS WIND! 4-7 m/s = +30
                    <div className="text-xs mt-1 ml-4">&lt;2 m/s = -50, &gt;12 m/s = -50 (too dangerous)</div>
                  </li>
                  <li>
                    <strong>🌧️ Rain:</strong> -15 base + probability penalty
                    <div className="text-xs mt-1 ml-4">Annoying but manageable</div>
                  </li>
                  <li>
                    <strong>👥 Crowds:</strong> Up to -35 points
                    <div className="text-xs mt-1 ml-4">SAFETY: Need space for kite</div>
                  </li>
                  <li>
                    <strong>🥶 Cold:</strong> Below 5°C: -15
                    <div className="text-xs mt-1 ml-4">Cold hands affect control</div>
                  </li>
                  <li>
                    <strong>☀️ UV Index:</strong> Gradual above 5 (max -20)
                    <div className="text-xs mt-1 ml-4">Standing outside for hours</div>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <strong>⚡ Thunderstorms:</strong> Score = 0
                    <div className="text-xs mt-1 ml-4">Pack up and go home</div>
                  </li>
                  <li>
                    <strong>🌧️ Rain:</strong> -60 base + up to -20 penalty
                    <div className="text-xs mt-1 ml-4">Ruins food, blankets, everything</div>
                  </li>
                  <li>
                    <strong>💨 Wind:</strong> Gradual above 4 m/s (max -25)
                    <div className="text-xs mt-1 ml-4">Flies blankets, ruins setup</div>
                  </li>
                  <li>
                    <strong>👥 Crowds:</strong> +10 points (POSITIVE!)
                    <div className="text-xs mt-1 ml-4">Good atmosphere for socializing</div>
                  </li>
                  <li>
                    <strong>🥶 Cold:</strong> Gradual below 12°C (max -25)
                    <div className="text-xs mt-1 ml-4">Uncomfortable sitting still</div>
                  </li>
                  <li>
                    <strong>🥵 Hot:</strong> Gradual above 28°C (max -20)
                    <div className="text-xs mt-1 ml-4">Too hot for sitting in sun</div>
                  </li>
                  <li>
                    <strong>☀️ UV Index:</strong> Gradual above 4 (max -30)
                    <div className="text-xs mt-1 ml-4">Sitting in sun for extended periods</div>
                  </li>
                </ul>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Score Ranges:</h4>
              <ul className="space-y-2">
                <li className="text-green-600 font-medium">75-100: Excellent 🌟</li>
                <li className="text-yellow-600 font-medium">50-74: Good ✓</li>
                <li className="text-orange-600 font-medium">25-49: Fair ~</li>
                <li className="text-red-600 font-medium">1-24: Poor ✗</li>
                <li className="text-gray-500 font-medium">0: Closed 🔒</li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  {activity === 'cycling' && <><strong>Sweet spot:</strong> 15-22°C temps get a +5 bonus! 🎯</>}
                  {activity === 'jogging' && <><strong>Sweet spot:</strong> 12-20°C temps get a +5 bonus! 🎯</>}
                  {activity === 'kiting' && <><strong>Wind is key:</strong> 4-7 m/s gives +30 bonus! 💨</>}
                  {activity === 'picnic' && <><strong>Sweet spot:</strong> 18-24°C temps get a +10 bonus! 🎯</>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
