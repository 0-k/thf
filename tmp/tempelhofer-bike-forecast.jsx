import React, { useState, useEffect } from 'react';
import { Cloud, Wind, Droplets, ThermometerSun, Users, Clock, TrendingUp, AlertCircle } from 'lucide-react';

const TempelhoferBikeForecast = () => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(true);

  // Tempelhofer Feld coordinates
  const LAT = 52.4732;
  const LON = 13.4053;

  // Opening hours for Tempelhofer Feld (varies by season, this is a simplified version)
  const getOpeningHours = (date) => {
    const month = date.getMonth();
    // Simplified: opens at sunrise, closes at sunset (actual hours vary by season)
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
      if (hourData.pop > 0.7) score -= 20; // High probability of rain
    } else if (hourData.pop > 0.5) {
      score -= 15; // Significant rain chance
    } else if (hourData.pop > 0.3) {
      score -= 5; // Some rain chance
    }
    
    // Wind
    const windSpeed = hourData.wind_speed;
    if (windSpeed > 10) {
      score -= 30; // Very windy
    } else if (windSpeed > 7) {
      score -= 20; // Quite windy
    } else if (windSpeed > 5) {
      score -= 10; // Moderately windy
    }
    
    // Crowds
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * 0.25); // Scale crowd factor (0-100 -> 0-25 point deduction)
    
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
    
    return Math.max(0, Math.min(100, score));
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

  const fetchWeatherData = async (key) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${LAT}&lon=${LON}&exclude=minutely,current,alerts&units=metric&appid=${key}`
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
        }
        throw new Error('Failed to fetch weather data. Please try again.');
      }
      
      const data = await response.json();
      setForecastData(data);
      setShowApiInput(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeySubmit = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      fetchWeatherData(apiKey.trim());
    }
  };

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

  if (showApiInput || !forecastData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🚴 Tempelhofer Feld
              </h1>
              <h2 className="text-xl text-gray-600 mb-4">Bike Forecast</h2>
              <p className="text-sm text-gray-500">
                Get hourly predictions for the best cycling conditions
              </p>
            </div>
            
            <form onSubmit={handleApiKeySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenWeatherMap API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Get a free API key from{' '}
                  <a 
                    href="https://openweathermap.org/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    openweathermap.org
                  </a>
                  {' '}(requires One Call API 3.0 access)
                </p>
              </div>
              
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading || !apiKey.trim()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Loading...' : 'Get Forecast'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const hourlyData = forecastData.hourly.slice(0, 168); // 7 days * 24 hours
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🚴 Tempelhofer Feld Bike Forecast
              </h1>
              <p className="text-gray-600">
                Hourly conditions for the next 7 days
              </p>
            </div>
            <button
              onClick={() => setShowApiInput(true)}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Change API Key
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
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-center">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${getScoreColor(hour.score)}`}>
                      {hour.score}
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {date.getHours()}:00
                    </p>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>{Math.round(hour.temp)}°C</p>
                      <p>{hour.weather[0].main}</p>
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
                      className={`border-2 rounded-lg p-3 ${
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
                          {date.getHours()}:00
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
          <h3 className="text-lg font-bold text-gray-800 mb-4">Score Factors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Penalties (in priority order):</h4>
              <ul className="space-y-1 text-gray-600">
                <li>🌧️ Rain: -40 points (plus chance of rain)</li>
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
                <li className="text-green-600 font-medium">75-100: Excellent conditions</li>
                <li className="text-yellow-600 font-medium">50-74: Good conditions</li>
                <li className="text-orange-600 font-medium">25-49: Fair conditions</li>
                <li className="text-red-600 font-medium">1-24: Poor conditions</li>
                <li className="text-gray-500 font-medium">0: Closed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempelhoferBikeForecast;
