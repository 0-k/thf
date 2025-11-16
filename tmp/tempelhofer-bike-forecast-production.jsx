import React, { useState, useEffect } from 'react';
import { Cloud, Wind, Droplets, ThermometerSun, Users, Clock, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

const TempelhoferBikeForecast = () => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isCached, setIsCached] = useState(false);

  // Backend API URL - update this to your deployed backend
  const API_URL = 'http://localhost:5000/api/weather';
  // For production, use your actual backend URL:
  // const API_URL = 'https://yourusername.pythonanywhere.com/api/weather';

  // Tempelhofer Feld coordinates
  const LAT = 52.4732;
  const LON = 13.4053;

  // Opening hours for Tempelhofer Feld
  const getOpeningHours = (date) => {
    const month = date.getMonth();
    // Summer hours (Apr-Sep): ~6:00-22:00
    // Winter hours (Oct-Mar): ~7:00-21:00
    if (month >= 3 && month <= 8) {
      return { open: 6, close: 22 };
    }
    return { open: 7, close: 21 };
  };

  const isOpen = (hour, date) => {
    const hours = getOpeningHours(date);
    return hour >= hours.open && hour < hours.close;
  };

  const calculateCrowdFactor = (hour, dayOfWeek, temp, weatherCondition) => {
    let crowdScore = 0;
    
    // Weekend is busier
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      crowdScore += 30;
    }
    
    // Peak hours (11:00-18:00) are busier
    if (hour >= 11 && hour <= 18) {
      crowdScore += 25;
    } else if (hour >= 9 && hour < 11) {
      crowdScore += 15;
    } else if (hour > 18 && hour <= 20) {
      crowdScore += 15;
    }
    
    // Good weather attracts more people
    if (temp > 15 && temp < 25 && !weatherCondition.includes('rain')) {
      crowdScore += 20;
    }
    
    // Bad weather reduces crowds
    if (weatherCondition.includes('rain') || temp < 5 || temp > 30) {
      crowdScore -= 20;
    }
    
    return Math.max(0, Math.min(100, crowdScore));
  };

  const calculateBikeabilityScore = (hourData) => {
    let score = 100;
    const date = new Date(hourData.dt * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Check if closed
    if (!isOpen(hour, date)) {
      return 0;
    }
    
    // Rain (highest priority penalty)
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      score -= 40;
      if (hourData.pop > 0.7) score -= 20;
    } else if (hourData.pop > 0.5) {
      score -= 15;
    } else if (hourData.pop > 0.3) {
      score -= 5;
    }
    
    // Wind
    const windSpeed = hourData.wind_speed;
    if (windSpeed > 10) {
      score -= 30;
    } else if (windSpeed > 7) {
      score -= 20;
    } else if (windSpeed > 5) {
      score -= 10;
    }
    
    // Crowds
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * 0.25);
    
    // Temperature
    const temp = hourData.temp;
    if (temp < 0) {
      score -= 25;
    } else if (temp < 5) {
      score -= 15;
    } else if (temp < 10) {
      score -= 8;
    }
    
    if (temp > 32) {
      score -= 20;
    } else if (temp > 28) {
      score -= 12;
    } else if (temp > 25) {
      score -= 5;
    }
    
    // Optimal temperature bonus (15-22°C)
    if (temp >= 15 && temp <= 22) {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    if (score >= 25) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreLabel = (score) => {
    if (score === 0) return 'Closed';
    if (score >= 75) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 25) return 'Fair';
    return 'Poor';
  };

  const loadForecast = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch weather data (${response.status})`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load weather data');
      }
      
      setForecastData(result.data);
      setLastUpdated(new Date(result.cached_at || result.fetched_at));
      setIsCached(result.cached);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecast();
    
    // Auto-refresh every hour
    const interval = setInterval(() => {
      loadForecast();
    }, 60 * 60 * 1000); // 1 hour
    
    return () => clearInterval(interval);
  }, []);

  const groupHoursByDay = (hours) => {
    const days = {};
    hours.forEach(hour => {
      const date = new Date(hour.dt * 1000);
      const dayKey = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!days[dayKey]) {
        days[dayKey] = [];
      }
      days[dayKey].push(hour);
    });
    return days;
  };

  if (loading && !forecastData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700">Loading forecast...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Error</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={loadForecast}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!forecastData) {
    return null;
  }

  const hourlyData = forecastData.hourly.slice(0, 168); // 7 days
  const hoursWithScores = hourlyData.map(hour => ({
    ...hour,
    score: calculateBikeabilityScore(hour)
  }));
  
  const dayGroups = groupHoursByDay(hoursWithScores);
  const bestTimes = hoursWithScores
    .filter(h => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🚴 Tempelhofer Feld Bike Forecast
              </h1>
              <p className="text-gray-600">
                Hourly conditions for the next 7 days
              </p>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  {isCached ? 'Cached from' : 'Updated at'}: {lastUpdated.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              )}
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
        </div>

        {/* Best Times Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">Top 5 Best Times</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {bestTimes.map((hour, idx) => {
              const date = new Date(hour.dt * 1000);
              return (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-1">#{idx + 1}</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${getScoreColor(hour.score)}`}>
                      {hour.score}
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {date.getHours().toString().padStart(2, '0')}:00
                    </p>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      <p className="flex items-center justify-center gap-1">
                        <ThermometerSun className="w-4 h-4" />
                        {Math.round(hour.temp)}°C
                      </p>
                      <p className="flex items-center justify-center gap-1">
                        <Wind className="w-4 h-4" />
                        {Math.round(hour.wind_speed)} m/s
                      </p>
                      <p className="text-xs">{hour.weather[0].description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly Forecast by Day */}
        <div className="space-y-6">
          {Object.entries(dayGroups).map(([day, hours]) => (
            <div key={day} className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{day}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {hours.map((hour) => {
                  const date = new Date(hour.dt * 1000);
                  const crowdFactor = calculateCrowdFactor(
                    date.getHours(),
                    date.getDay(),
                    hour.temp,
                    hour.weather[0].main
                  );

                  return (
                    <div
                      key={hour.dt}
                      className={`border-2 rounded-lg p-3 transition-all hover:scale-105 ${
                        hour.score === 0 
                          ? 'border-gray-300 bg-gray-50 opacity-50' 
                          : hour.score >= 75
                          ? 'border-green-300 bg-green-50'
                          : hour.score >= 50
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-orange-300 bg-orange-50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-bold text-lg text-gray-900 mb-1">
                          {date.getHours().toString().padStart(2, '0')}:00
                        </div>
                        <div className={`text-2xl font-bold mb-2 ${
                          hour.score === 0 ? 'text-gray-400' : getScoreColor(hour.score).split(' ')[0]
                        }`}>
                          {hour.score}
                        </div>
                        <div className="text-xs font-medium text-gray-600 mb-2">
                          {getScoreLabel(hour.score)}
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1 text-gray-700">
                          <ThermometerSun className="w-3 h-3" />
                          <span>{Math.round(hour.temp)}°C</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Wind className="w-3 h-3" />
                          <span>{Math.round(hour.wind_speed)} m/s</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Droplets className="w-3 h-3" />
                          <span>{Math.round(hour.pop * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Users className="w-3 h-3" />
                          <span>{Math.round(crowdFactor)}%</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Cloud className="w-3 h-3" />
                          <span className="truncate">{hour.weather[0].main}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">How the Score Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Penalties (in priority order):</h4>
              <ul className="space-y-1 text-gray-600">
                <li>🌧️ Rain: -40 points (plus rain probability)</li>
                <li>💨 High wind (&gt;10 m/s): -30 points</li>
                <li>👥 Crowds (peak hours/weekends): up to -25 points</li>
                <li>🥶 Very cold (&lt;0°C): -25 points</li>
                <li>🥵 Very hot (&gt;32°C): -20 points</li>
                <li>🔒 Closed hours: 0 points</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Score Ranges:</h4>
              <ul className="space-y-1">
                <li className="text-green-600 font-medium">75-100: Excellent conditions 🌟</li>
                <li className="text-yellow-600 font-medium">50-74: Good conditions ✓</li>
                <li className="text-orange-600 font-medium">25-49: Fair conditions ~</li>
                <li className="text-red-600 font-medium">1-24: Poor conditions ✗</li>
                <li className="text-gray-500 font-medium">0: Closed 🔒</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempelhoferBikeForecast;
