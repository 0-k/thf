"""
Tempelhofer Feld Weather API Backend
====================================
A simple Flask server that fetches weather data from OpenWeatherMap
and serves it to the frontend. Caches data for 1 hour to avoid API rate limits.

Setup:
1. Install dependencies: pip install flask flask-cors requests
2. Set your OpenWeatherMap API key in the environment variable: OPENWEATHER_API_KEY
3. Run: python weather_backend.py

For PythonAnywhere:
- Upload this file
- Install dependencies in a virtual environment
- Set environment variable in .env or directly in the code
- Configure as a Flask web app
"""

from flask import Flask, jsonify
from flask_cors import CORS
import requests
import os
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Configuration
OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY', 'YOUR_API_KEY_HERE')
TEMPELHOFER_LAT = 52.4732
TEMPELHOFER_LON = 13.4053

# Cache configuration
cache = {
    'data': None,
    'timestamp': None,
    'cache_duration': timedelta(hours=1)
}

def fetch_weather_data():
    """Fetch weather data from OpenWeatherMap API"""
    url = f"https://api.openweathermap.org/data/3.0/onecall"
    params = {
        'lat': TEMPELHOFER_LAT,
        'lon': TEMPELHOFER_LON,
        'exclude': 'minutely,current,alerts',
        'units': 'metric',
        'appid': OPENWEATHER_API_KEY
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching weather data: {e}")
        return None

def is_cache_valid():
    """Check if cached data is still valid"""
    if cache['data'] is None or cache['timestamp'] is None:
        return False
    
    age = datetime.now() - cache['timestamp']
    return age < cache['cache_duration']

@app.route('/api/weather', methods=['GET'])
def get_weather():
    """
    Get weather forecast for Tempelhofer Feld
    Returns cached data if less than 1 hour old
    """
    # Return cached data if valid
    if is_cache_valid():
        return jsonify({
            'success': True,
            'data': cache['data'],
            'cached': True,
            'cached_at': cache['timestamp'].isoformat()
        })
    
    # Fetch fresh data
    weather_data = fetch_weather_data()
    
    if weather_data is None:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch weather data from OpenWeatherMap'
        }), 503
    
    # Update cache
    cache['data'] = weather_data
    cache['timestamp'] = datetime.now()
    
    return jsonify({
        'success': True,
        'data': weather_data,
        'cached': False,
        'fetched_at': cache['timestamp'].isoformat()
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'cache_valid': is_cache_valid()
    })

@app.route('/', methods=['GET'])
def index():
    """Root endpoint with API info"""
    return jsonify({
        'name': 'Tempelhofer Feld Weather API',
        'version': '1.0',
        'endpoints': {
            '/api/weather': 'Get weather forecast (cached for 1 hour)',
            '/api/health': 'Health check'
        }
    })

if __name__ == '__main__':
    # Check if API key is set
    if OPENWEATHER_API_KEY == 'YOUR_API_KEY_HERE':
        print("WARNING: OpenWeatherMap API key not set!")
        print("Set the OPENWEATHER_API_KEY environment variable or edit the code.")
    
    # Run the server
    # For production, use a proper WSGI server like gunicorn
    app.run(host='0.0.0.0', port=5000, debug=False)
