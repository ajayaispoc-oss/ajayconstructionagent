
import { createClient } from '@supabase/supabase-js';

// Configuration for Ajay Projects Supabase Backend
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vaguthgeaqvpggsvdxiq.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UBLlfFF1mH4IdA8DpUqnPQ_e-S7uGwr';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
