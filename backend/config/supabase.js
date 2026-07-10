require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error('[Supabase] ❌ SUPABASE_URL is missing in .env — all database operations will fail');
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('[Supabase] ❌ SUPABASE_SERVICE_KEY is missing in .env — all database operations will fail');
}

/**
 * Server-side admin client.
 * Uses SERVICE_KEY — bypasses RLS, safe for backend only.
 * NEVER expose to frontend or client-side code.
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

module.exports = { supabase };
