import React, { useState, useEffect } from 'react';
import { Cloud, Wind, Droplets, ThermometerSun, Users, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';

export default function TempelhoferBikeForecast() {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Your OpenWeatherMap API key
  const API_KEY = '';
  const LAT = 52.4732;
  const LON = 13.4053;

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
    let score = 100;
    const date = new Date(hourData.dt * 1000);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    if (!isOpen(hour, date)) return 0;
    
    // Rain penalty - continuous scale
    const pop = hourData.pop;
    if (hourData.weather[0].main.toLowerCase().includes('rain')) {
      score -= 40;
      score -= pop * 20;
    } else {
      if (pop > 0.2) {
        score -= Math.pow((pop - 0.2) / 0.8, 1.5) * 25;
      }
    }
    
    // Wind penalty - continuous scale
    const windSpeed = hourData.wind_speed;
    if (windSpeed > 3) {
      const windPenalty = Math.pow((windSpeed - 3) / 7, 1.3) * 40;
      score -= Math.min(40, windPenalty);
    }
    
    // Crowd penalty
    const crowdFactor = calculateCrowdFactor(hour, dayOfWeek, hourData.temp, hourData.weather[0].main);
    score -= (crowdFactor * 0.25);
    
    // Temperature penalties - continuous scales
    const temp = hourData.temp;
    
    if (temp < 10) {
      const coldPenalty = Math.pow((10 - temp) / 10, 1.2) * 30;
      score -= Math.min(30, coldPenalty);
    }
    
    if (temp > 24) {
      const hotPenalty = Math.pow((temp - 24) / 11, 1.3) * 30;
      score -= Math.min(30, hotPenalty);
    }
    
    // Optimal temperature bonus
    if (temp >= 15 && temp <= 22) {
      score += 5;
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

  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/onecall?lat=${LAT}&lon=${LON}&exclude=minutely,current,alerts&units=metric&appid=${API_KEY}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      setForecastData(data);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
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

  if (loading && !forecastData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700">Loading real weather data...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching from OpenWeatherMap</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 text-center mb-2">API Error</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={fetchWeatherData}
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

  const hourlyData = forecastData.hourly.slice(0, 168);
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
              <p className="text-gray-600">Real-time hourly conditions for the next 7 days</p>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {lastUpdated.toLocaleString('en-US', { 
                    weekday: 'short',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              )}
            </div>
            <button
              onClick={fetchWeatherData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>✓ Live Data:</strong> Using real weather forecast from OpenWeatherMap
            </p>
          </div>
        </div>

        {/* Best Times */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">Top 5 Best Times to Ride</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
                      <p>{Math.round(hour.temp)}°C</p>
                      <p>{Math.round(hour.wind_speed)} m/s wind</p>
                      <p className="text-xs capitalize">{hour.weather[0].description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Forecasts */}
        <div className="space-y-6">
          {Object.entries(dayGroups).slice(0, 3).map(([day, hours]) => (
            <div key={day} className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">{day}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                          : getScoreColor(hour.score)
                      }`}
                    >
                      <div className="text-center mb-2">
                        <div className="font-bold text-lg text-gray-900">
                          {date.getHours().toString().padStart(2, '0')}:00
                        </div>
                        <div className={`text-2xl font-bold ${
                          hour.score === 0 ? 'text-gray-400' : ''
                        }`}>
                          {hour.score}
                        </div>
                        <div className="text-xs font-medium text-gray-600">
                          {getScoreLabel(hour.score)}
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1">
                          <ThermometerSun className="w-3 h-3" />
                          <span>{Math.round(hour.temp)}°C</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Wind className="w-3 h-3" />
                          <span>{Math.round(hour.wind_speed)} m/s</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="w-3 h-3" />
                          <span>{Math.round(hour.pop * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{Math.round(crowdFactor)}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Cloud className="w-3 h-3" />
                          <span className="truncate capitalize">{hour.weather[0].description}</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Penalties (continuous scales):</h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <strong>🌧️ Rain:</strong> -40 base + up to -20 for probability
                </li>
                <li>
                  <strong>💨 Wind:</strong> Gradual from 3 m/s
                  <div className="text-xs mt-1 ml-4">5 m/s = -4, 7 m/s = -11, 10 m/s = -24</div>
                </li>
                <li>
                  <strong>👥 Crowds:</strong> Up to -25 points
                </li>
                <li>
                  <strong>🥶 Cold:</strong> Gradual below 10°C
                  <div className="text-xs mt-1 ml-4">5°C = -8, 0°C = -18</div>
                </li>
                <li>
                  <strong>🥵 Hot:</strong> Gradual above 24°C
                  <div className="text-xs mt-1 ml-4">28°C = -6, 32°C = -17</div>
                </li>
              </ul>
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
                  <strong>Sweet spot:</strong> 15-22°C gets +5 bonus! 🎯
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
