const {
  checkDatabaseConnection,
  checkSupabaseConnection,
  checkStorage,
  checkRealtime,
  checkTables,
} = require('../services/supabase.service');
const { checkWeatherAPIHealth } = require('../services/weather.service');
const { supabase } = require('../config/supabase');
const axios = require('axios');

/**
 * GET /api/health
 * Runs REAL parallel probes against every dependency.
 * Never uses cached values. Logs every failure with reason + fix.
 */
const getHealth = async (req, res) => {
  const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

  // Run all checks in parallel — Promise.allSettled so one failure doesn't block others
  const [dbResult, supabaseResult, storageResult, realtimeResult, weatherResult, aiResult] =
    await Promise.allSettled([
      checkDatabaseConnection(),
      checkSupabaseConnection(),
      checkStorage(),
      checkRealtime(),
      checkWeatherAPIHealth(),
      // AI check — GET / or /health, whichever responds
      Promise.any([
        axios.get(`${AI_URL}/health`, { timeout: 3000 }),
        axios.get(`${AI_URL}/`, { timeout: 3000 }),
      ]).then(() => ({ ok: true, error: null }))
        .catch((err) => {
          console.error(`[AI Check] ❌ AI service unreachable at ${AI_URL} — ${err.message}`);
          console.error('[AI Check] Fix: Start the Python FastAPI service (uvicorn main:app --reload)');
          return { ok: false, error: err.message };
        }),
    ]);

  const resolve = (result) => {
    if (result.status === 'fulfilled') return result.value;
    return { ok: false, error: result.reason?.message || 'Promise rejected' };
  };

  const db        = resolve(dbResult);
  const sb        = resolve(supabaseResult);
  const storage   = resolve(storageResult);
  const realtime  = resolve(realtimeResult);
  const weather   = resolve(weatherResult);
  const ai        = resolve(aiResult);
  
  // Extra verification: Check if required tables exist
  let dbStatus = 'Unavailable';
  let dbError = db.error;
  if (db.ok) {
    try {
      const tables = await checkTables();
      const missing = Object.entries(tables).filter(([, exists]) => !exists).map(([t]) => t);
      if (missing.length > 0) {
        dbStatus = 'Unavailable';
        dbError = `Missing tables: ${missing.join(', ')}`;
      } else {
        dbStatus = 'Connected';
      }
    } catch(err) {
      dbStatus = 'Unavailable';
      dbError = 'Failed to check tables: ' + err.message;
    }
  }

  return res.json({
    status:      'ok',
    server:      'Running',
    database:    dbStatus,
    supabase:    sb.ok        ? 'Connected'   : 'Unavailable',
    storage:     storage.ok   ? 'Connected'   : 'Unavailable',
    realtime:    realtime.ok  ? 'Connected'   : 'Unavailable',
    weather_api: weather.ok   ? 'Ready'       : 'Unavailable',
    ai_service:  ai.ok        ? 'Running'     : 'Offline',
    timestamp:   new Date().toISOString(),
    // Include errors in dev mode for easier debugging
    ...(process.env.NODE_ENV !== 'production' && {
      _errors: {
        database:    dbError         || null,
        supabase:    sb.error        || null,
        storage:     storage.error   || null,
        realtime:    realtime.error  || null,
        weather_api: weather.error   || null,
        ai_service:  ai.error        || null,
      },
    }),
  });
};

/**
 * GET /api/test-db
 * Reads from the users table and returns results.
 * Returns a helpful message if the table doesn't exist yet.
 */
const testDatabase = async (req, res) => {
  try {
    const tablesToCheck = ['users', 'forest_regions', 'weather_logs'];
    const results = {};
    let missingTable = null;

    for (const table of tablesToCheck) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.code === '42P01')) {
        missingTable = table;
        break;
      }
      results[table] = count || 0;
    }

    if (missingTable) {
      return res.status(200).json({
        success: false,
        message: `${missingTable} table not found — run backend/database.sql in Supabase SQL Editor`,
        hint: 'Copy the contents of backend/database.sql and execute it in your Supabase project → SQL Editor → New Query',
      });
    }

    return res.json({
      success: true,
      message: 'All required tables accessible',
      counts: results,
    });
  } catch (err) {
    console.error('[Test DB]', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getHealth, testDatabase };
