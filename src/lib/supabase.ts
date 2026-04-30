import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase. As env vars VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
 * devem ser definidas no ambiente local (.env) ou no Vercel (Project Settings →
 * Environment Variables). Em ausência delas, caímos em fallback hardcoded para
 * a instância de demonstração — nunca deixar o módulo quebrar na carga, porque
 * App.tsx faz import transitivo (cargoStore → supabase) ANTES da LandingPage
 * montar, e um throw aqui derruba a árvore inteira sem que o ErrorBoundary
 * possa capturar (ErrorBoundary só pega erros de render, não de module load).
 *
 * RLS é validado no backend (vide supabase-setup.sql) — chave anon só funciona
 * dentro das políticas configuradas para auth.uid() = user_id.
 */
const FALLBACK_URL = 'https://vdjrfoxnibufxqntwrkr.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkanJmb3huaWJ1ZnhxbnR3cmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDg5NTMsImV4cCI6MjA5MDMyNDk1M30.IkVLLhVZJGsQUSdke7mC5pinrCCOWO8UYh3jKDCcYJM';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

if (!import.meta.env?.VITE_SUPABASE_URL || !import.meta.env?.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '[supabase] Usando credenciais de fallback. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel para uso em produção.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
