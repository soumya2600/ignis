const axios = require('axios');
const NodeCache = require('node-cache');
const { supabase } = require('../config/supabase');

const weatherCache = new NodeCache({ stdTTL: 600 }); // 10 min cache
const OPEN_METEO_BASE = process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast';

const getWindDirectionStr = (deg) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  return dirs[Math.round((deg % 360) / 45)];
};

/**
 * Helper to fetch with retry logic
 */
const fetchWithRetry = async (url, retries = 1) => {
  let lastError;
  const startTime = Date.now();
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Weather API] ${url} took ${duration}ms`);
      }
      return response.data;
    } catch (err) {
      lastError = err;
      if (i < retries) {
        console.warn(`[Weather API] Request failed, retrying... (${i + 1}/${retries})`);
      }
    }
  }
  const reason = lastError.response?.data?.reason || lastError.message || 'Unknown network error';
  console.error(`[Weather API] ❌ Failed after ${retries} retries: ${reason}`);
  throw new Error('Weather API Offline');
};

/**
 * Get current weather for a specific location
 */
const getCurrentWeather = async (lat, lon) => {
  if (lat == null || lon == null) {
    throw new Error('Latitude and longitude are required');
  }

  const cacheKey = `current_${lat}_${lon}`;
  if (weatherCache.has(cacheKey)) {
    return weatherCache.get(cacheKey);
  }

  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover`;
  
  const data = await fetchWithRetry(url);
  const cur = data.current;

  const result = {
    temperature: cur.temperature_2m,
    humidity: cur.relative_humidity_2m,
    windSpeed: cur.wind_speed_10m,
    windDirection: getWindDirectionStr(cur.wind_direction_10m),
    pressure: cur.surface_pressure,
    precipitation: cur.precipitation,
    cloudCover: cur.cloud_cover
  };

  weatherCache.set(cacheKey, result);
  return result;
};

/**
 * Get forecast data (stub for completeness, expands based on needs)
 */
const getForecast = async (lat, lon) => {
  // Add forecast params as needed
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m`;
  return fetchWithRetry(url);
};

/**
 * Get fire weather specific parameters
 */
const getFireWeather = async (lat, lon) => {
  const current = await getCurrentWeather(lat, lon);
  // Add any derived or specific metrics for fire weather here
  return {
    ...current,
    ffmc_estimate: 80, // placeholder
    isi_estimate: 10   // placeholder
  };
};

/**
 * Health check function
 */
const checkWeatherAPIHealth = async () => {
  try {
    // Default coordinates: Bhubaneswar
    const data = await getCurrentWeather(20.2961, 85.8245);
    if (data && typeof data.temperature === 'number') {
      return { ok: true, error: null };
    }
    return { ok: false, error: 'Invalid JSON response format' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

/**
 * Legacy wrapper for AI polling loop
 */
const fetchLiveWeather = async (lat, lng) => {
  const data = await getCurrentWeather(lat, lng);
  return {
    temperature: data.temperature,
    humidity: data.humidity,
    rainfall: data.precipitation,
    wind_speed: data.windSpeed,
    wind_direction: data.windDirection,
    ndvi: 0.45,
    elevation: 850,
    soil_moisture: parseFloat((Math.random() * 30 + 20).toFixed(1)),
    solar_radiation: parseFloat((Math.random() * 400 + 400).toFixed(1)),
    drought_index: parseFloat((Math.random() * 5 + 1).toFixed(1)),
    lat,
    lng,
  };
};

/**
 * Save a weather log record to Supabase.
 */
const saveWeatherLog = async ({ forest_region_id, lat, lng, telemetry }) => {
  const { error } = await supabase.from('weather_logs').insert({
    forest_region_id,
    lat,
    lng,
    temperature: telemetry.temperature,
    humidity: telemetry.humidity,
    rainfall: telemetry.rainfall,
    wind_speed: telemetry.wind_speed,
    wind_direction: telemetry.wind_direction,
    ndvi: telemetry.ndvi,
    elevation: telemetry.elevation,
  });

  if (error) console.error('[Weather Log]', error.message);
};

/**
 * Get recent weather logs for a region.
 */
const getWeatherLogs = async (regionId, limit = 100) => {
  const { data, error } = await supabase
    .from('weather_logs')
    .select('*')
    .eq('forest_region_id', regionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data;
};

module.exports = {
  getCurrentWeather,
  getForecast,
  getFireWeather,
  fetchLiveWeather,
  saveWeatherLog,
  getWeatherLogs,
  checkWeatherAPIHealth
};
