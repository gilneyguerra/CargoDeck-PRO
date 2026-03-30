import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, LogIn } from 'lucide-react';

const SUPABASE_CONFIGURED = import.meta.env.VITE_SUPABASE_URL && 
                           import.meta.env.VITE_SUPABASE_URL !== 'https://example.supabase.co';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!SUPABASE_CONFIGURED) {
      setError('Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel.');
      setLoading(false);
      return;
    }
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Conta criada! Verifique seu e-mail.");
      }
      onClose();
    } catch (err: unknown) {
      const message = (err as Error).message;
      if (message.includes('fetch') || message.includes('Failed to')) {
        setError('Erro de conexão. Verifique as configurações do Supabase.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-400 dark:border-neutral-800 rounded-xl p-8 w-full max-w-sm relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-600 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white"><X size={20}/></button>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{isLogin ? 'Entrar' : 'Criar Conta'}</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Acesse seus relatórios e Planos de Carga salvos na nuvem.</p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">E-mail</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-white dark:bg-neutral-950 border border-neutral-400 dark:border-neutral-800 rounded px-3 py-2 text-gray-800 dark:text-white outline-none focus:border-indigo-500" placeholder="seu@email.com"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Senha</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-white dark:bg-neutral-950 border border-neutral-400 dark:border-neutral-800 rounded px-3 py-2 text-gray-800 dark:text-white outline-none focus:border-indigo-500" placeholder="••••••••"/>
          </div>
          <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium py-2 rounded transition-colors flex justify-center items-center gap-2">
            {loading ? 'Aguarde...' : isLogin ? <><LogIn size={16}/> Entrar</> : 'Registrar-se agora'}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-500">
          {isLogin ? "Não tem uma conta? " : "Já tem conta? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </div>
      </div>
    </div>
  )
}
