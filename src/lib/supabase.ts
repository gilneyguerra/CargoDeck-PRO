import { createClient } from '@supabase/supabase-js';

// Usamos valores padrão vazios temporários caso variáveis não existam,
// para não enlouquecer o compilador antes de fornecermos o .env de fato.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'example-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
