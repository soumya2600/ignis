import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set in frontend .env');
}

/**
 * Frontend Supabase client.
 * Uses the ANON key only — safe to expose to the browser.
 * Never use the SERVICE_KEY on the frontend.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
