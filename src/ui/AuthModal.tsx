import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { X, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPABASE_CONFIGURED = !!(import.meta.env?.VITE_SUPABASE_URL || 'https://vdjrfoxnibufxqntwrkr.supabase.co');

export function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!SUPABASE_CONFIGURED) {
      setError('Supabase não configurado. Verifique as variáveis de ambiente.');
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
      setError(message.includes('fetch') ? 'Erro de rede. Verifique seu sinal.' : message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border border-subtle rounded-[3rem] w-full max-w-md shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-primary z-50" />
        
        {/* Header (Integrated) */}
        <div className="p-10 pb-6 text-center shrink-0">
            <button onClick={onClose} className="absolute top-8 right-10 text-muted hover:text-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-6 h-6" />
            </button>
            <div className="inline-flex p-5 bg-brand-primary/10 rounded-[2rem] mb-6 shadow-low border border-brand-primary/10">
                <ShieldCheck size={40} className="text-brand-primary" />
            </div>
            <h2 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">
                {isLogin ? 'Security Access' : 'Create Operator'}
            </h2>
            <p className="text-[10px] font-bold text-muted uppercase tracking-[0.4em] mt-3 opacity-80">
                Logistics Intelligence Portal
            </p>
        </div>

        {/* Scrollable Content (No scrollbars) */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-10 pb-10">
            {error && (
                <div className="bg-status-error/10 border border-status-error/20 text-status-error text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl mb-8 flex items-center gap-3 animate-in shake-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-6">
                <div className="space-y-2">
                    <label className="block text-[9px] font-black text-muted uppercase tracking-widest ml-1">Corporate ID / E-mail</label>
                    <input 
                        type="email" required value={email} onChange={e=>setEmail(e.target.value)} 
                        className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4.5 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner" 
                        placeholder="operator@company.com"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-[9px] font-black text-muted uppercase tracking-widest ml-1">Access Token / Password</label>
                    <input 
                        type="password" required value={password} onChange={e=>setPassword(e.target.value)} 
                        className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4.5 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner" 
                        placeholder="••••••••"
                    />
                </div>
                <button 
                    disabled={loading} type="submit" 
                    className="w-full bg-brand-primary hover:brightness-110 disabled:opacity-50 text-white text-[10px] font-black py-5 rounded-2xl transition-all shadow-xl shadow-brand-primary/20 flex justify-center items-center gap-3 active:scale-95 uppercase tracking-widest"
                >
                    {loading ? 'AUTHENTICATING...' : isLogin ? 'GRANT ACCESS' : 'INITIALIZE ACCOUNT'}
                </button>
            </form>

            <div className="text-center mt-8">
                <p className="text-[10px] text-muted font-bold tracking-tight uppercase">
                    {isLogin ? "New operator? " : "Authorized user? "}
                    <button 
                        onClick={() => setIsLogin(!isLogin)} 
                        className="text-brand-primary hover:underline font-black outline-none tracking-tighter"
                    >
                        {isLogin ? 'REQUEST CREDENTIALS' : 'RETURN TO LOGIN'}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
