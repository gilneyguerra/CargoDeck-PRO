import { createClient } from '@supabase/supabase-js';

// Credenciais OBRIGATÓRIAS via variáveis de ambiente.
// RLS é validado no backend (vide supabase-setup.sql) — chave anon só funciona
// dentro das políticas configuradas para auth.uid() = user_id.
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente (.env ou Vercel) antes de iniciar a aplicação.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
