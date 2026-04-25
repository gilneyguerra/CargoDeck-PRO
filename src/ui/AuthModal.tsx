import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, LogIn, AlertCircle } from 'lucide-react';

const SUPABASE_CONFIGURED = !!(import.meta.env?.VITE_SUPABASE_URL || 'https://vdjrfoxnibufxqntwrkr.supabase.co');


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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-header border border-subtle rounded-[2.5rem] p-10 w-full max-w-md relative shadow-2xl animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-muted hover:text-primary hover:bg-sidebar rounded-full transition-all">
          <X size={24}/>
        </button>
        
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-brand-primary/10 rounded-3xl mb-6">
            <LogIn size={32} className="text-brand-primary" />
          </div>
          <h2 className="text-3xl font-black text-primary mb-3">
            {isLogin ? 'Bem-vindo' : 'Criar Conta'}
          </h2>
          <p className="text-sm text-muted font-medium px-4">
            {isLogin 
              ? 'Acesse seus relatórios e planos de carga sincronizados na nuvem.' 
              : 'Comece a planejar sua logística marítima com mais eficiência.'}
          </p>
        </div>

        {error && (
          <div className="bg-status-error/10 border border-status-error/20 text-status-error text-xs font-bold p-4 rounded-2xl mb-8 flex items-center gap-3 animate-in shake-1">
             <AlertCircle className="w-5 h-5 shrink-0" />
             <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-6 mb-10">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">E-mail Corporativo</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              className="w-full bg-main border-2 border-subtle rounded-2xl px-5 py-4 text-primary outline-none focus:border-brand-primary transition-all font-bold placeholder:text-muted/50" 
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">Senha de Acesso</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              className="w-full bg-main border-2 border-subtle rounded-2xl px-5 py-4 text-primary outline-none focus:border-brand-primary transition-all font-bold placeholder:text-muted/50" 
              placeholder="••••••••"
            />
          </div>
          <button 
            disabled={loading} 
            type="submit" 
            className="w-full bg-brand-primary hover:brightness-110 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-brand-primary/20 flex justify-center items-center gap-3 active:scale-[0.98]"
          >
            {loading ? 'PROCESSANDO...' : isLogin ? 'ENTRAR NO SISTEMA' : 'CADASTRAR AGORA'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-muted font-bold">
            {isLogin ? "Não possui uma credencial? " : "Já possui registro? "}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-brand-primary hover:underline font-black outline-none"
            >
              {isLogin ? 'SOLICITAR ACESSO' : 'EFETUAR LOGIN'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
