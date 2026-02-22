
import { createClient } from '@supabase/supabase-js';

// Configuration for Ajay Projects Supabase Backend
const supabaseUrl = 'https://vaguthgeaqvpggsvdxiq.supabase.co';

// Safety check for process.env to prevent crashes in raw ESM environments
const getEnv = (key: string): string => {
  try {
    // Check vite define first, then window.process, then fallback
    return (window as any).process?.env?.[key] || '';
  } catch {
    return '';
  }
};

// Use the standard environment variable or the provided public key for this specific project
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_UBLlfFF1mH4IdA8DpUqnPQ_e-S7uGwr';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
