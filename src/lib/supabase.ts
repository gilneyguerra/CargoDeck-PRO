import { createClient } from '@supabase/supabase-js';

// Use fallback values for build - these should be set via environment variables at runtime
const supabaseUrl = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta as ImportMeta & { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://example.supabase.co') {
  console.warn('Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);