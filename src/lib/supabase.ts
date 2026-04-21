import { createClient } from '@supabase/supabase-js';

// Use environment variables or provided fallbacks to ensure functionality
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://vdjrfoxnibufxqntwrkr.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhYmFzZSIsInJlZiI6InZkanJmb3huaWJ1ZnhxbnR3cmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDg5NTMsImV4cCI6MjA5MDMyNDk1M30.IkVLLhVZJGsQUSdke7mC5pinrCCOWO8UYh3jKDCcYJM';

if (!import.meta.env?.VITE_SUPABASE_URL) {
  console.info('Supabase: Usando credenciais de fallback para conexão.');
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);