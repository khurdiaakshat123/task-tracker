import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Determine if we have valid user-defined credentials or are using placeholders
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-supabase-project.supabase.co' &&
  supabaseAnonKey !== 'your-supabase-anon-key' &&
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

// Instantiate the Supabase client if configured, otherwise export null to avoid runtime crashes
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
