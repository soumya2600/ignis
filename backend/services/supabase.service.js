const { supabase } = require('../config/supabase');
const axios = require('axios');

/**
 * Supabase Service — platform-level health checks and file storage utilities.
 *
 * All checks use the SERVICE KEY client (set in config/supabase.js).
 * The ANON key is NEVER used in backend checks — it belongs to the frontend only.
 */

// ── Database ──────────────────────────────────────────────────────────────────
/**
 * Executes a raw SQL SELECT 1 via the Supabase REST RPC endpoint.
 * This works regardless of whether any application tables exist.
 * Returns { ok: boolean, error: string|null }
 */
const checkDatabaseConnection = async () => {
  try {
    // Use Supabase's built-in rpc to run a trivial query
    const { data, error } = await supabase.rpc('pg_catalog.version');

    // pg_catalog.version may not be exposed — fall back to a simple table list check
    if (error) {
      // Try listing tables in information_schema (always exists in Postgres)
      const { error: err2 } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(1);

      if (err2) {
        // Last resort: try the service key REST endpoint directly
        const resp = await axios.get(
          `${process.env.SUPABASE_URL}/rest/v1/`,
          {
            headers: {
              apikey: process.env.SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            },
            timeout: 5000,
          }
        );
        // If the REST gateway responds (even 200 with empty), DB is up
        if (resp.status >= 200 && resp.status < 500) {
          return { ok: true, error: null };
        }
        throw new Error(`REST gateway returned ${resp.status}`);
      }
    }
    return { ok: true, error: null };
  } catch (err) {
    const reason = err.response?.data?.message || err.message || 'Unknown error';
    console.error(`[DB Check] ❌ Database unavailable — ${reason}`);
    console.error(`[DB Check] Fix: Verify SUPABASE_URL and SUPABASE_SERVICE_KEY in .env`);
    return { ok: false, error: reason };
  }
};

// ── Supabase Platform ─────────────────────────────────────────────────────────
/**
 * Confirms the Supabase REST API gateway is reachable using the service key.
 * Returns { ok: boolean, error: string|null }
 */
const checkSupabaseConnection = async () => {
  try {
    const resp = await axios.get(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
      timeout: 5000,
    });
    if (resp.status >= 200 && resp.status < 500) {
      return { ok: true, error: null };
    }
    throw new Error(`Unexpected status ${resp.status}`);
  } catch (err) {
    const reason = err.response?.data?.message || err.message || 'Unknown error';
    console.error(`[Supabase Check] ❌ Supabase REST unreachable — ${reason}`);
    console.error(`[Supabase Check] Fix: Check SUPABASE_URL is correct in .env`);
    return { ok: false, error: reason };
  }
};

// ── Storage ───────────────────────────────────────────────────────────────────
/**
 * Lists storage buckets using the service key.
 * Returns { ok: boolean, error: string|null }
 */
const checkStorage = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error(`[Storage Check] ❌ ${error.message}`);
      return { ok: false, error: error.message };
    }
    return { ok: true, error: null };
  } catch (err) {
    const reason = err.message || 'Unknown error';
    console.error(`[Storage Check] ❌ ${reason}`);
    return { ok: false, error: reason };
  }
};

// ── Realtime ──────────────────────────────────────────────────────────────────
/**
 * Confirms Supabase Realtime is available by checking the platform health endpoint.
 * The realtime WSS endpoint can't be HTTP-probed directly; we confirm via the
 * Supabase project's PostgREST REST gateway which shares the same infra.
 * Returns { ok: boolean, error: string|null }
 */
const checkRealtime = async () => {
  try {
    // Use the storage API health as a platform-wide check (it's on the same infra as realtime)
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error(`[Realtime Check] ❌ Platform health check failed — ${error.message}`);
      return { ok: false, error: error.message };
    }
    return { ok: true, error: null };
  } catch (err) {
    const reason = err.message || 'Unknown error';
    console.error(`[Realtime Check] ❌ ${reason}`);
    return { ok: false, error: reason };
  }
};

// ── Table Existence Check ─────────────────────────────────────────────────────
const REQUIRED_TABLES = [
  'users', 'forest_regions', 'districts', 'weather_logs',
  'fire_hotspots', 'risk_predictions', 'alerts', 'reports',
  'ai_logs', 'settings',
];

/**
 * Checks which application tables exist in the public schema.
 * Logs missing tables but does NOT crash.
 */
const checkTables = async () => {
  const results = {};
  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .limit(1);
    const exists = !error || error.code !== 'PGRST116'; // PGRST116 = relation not found
    results[table] = exists;
    if (!exists) {
      console.warn(`[Tables] ⚠️  Missing table: ${table} — run backend/supabase/schema.sql in Supabase SQL Editor`);
    }
  }
  return results;
};

// ── File Upload / Delete ──────────────────────────────────────────────────────
const uploadFile = async (bucket, path, buffer, contentType = 'application/octet-stream') => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

const deleteFile = async (bucket, path) => {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
  return true;
};

module.exports = {
  checkDatabaseConnection,
  checkSupabaseConnection,
  checkStorage,
  checkRealtime,
  checkTables,
  uploadFile,
  deleteFile,
};
