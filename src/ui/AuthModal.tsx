import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { X, AlertCircle, ShieldCheck } from 'lucide-react';

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
    if (!SUPABASE_CONFIGURED) { setError('Supabase não configurado. Verifique as variáveis de ambiente.'); setLoading(false); return; }
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
      <div className="bg-header border-2 border-subtle rounded-[3.5rem] w-full max-w-md shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        <div className="absolute top-0 left-0 w-full h-2 bg-brand-primary z-50 shadow-glow" />
        
        {/* Header Section */}
        <div className="p-12 pb-10 text-center shrink-0">
            <button onClick={onClose} className="absolute top-8 right-10 text-primary hover:text-brand-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-7 h-7" />
            </button>
            <div className="inline-flex p-6 bg-brand-primary/10 rounded-[2.5rem] mb-8 shadow-medium border-2 border-brand-primary/20 scale-110">
                <ShieldCheck size={48} className="text-brand-primary" />
            </div>
            <h2 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">
                {isLogin ? 'Operator Access' : 'Create Credential'}
            </h2>
            <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] mt-5 opacity-90 leading-relaxed">
                Offshore Terminal Intelligence Portal
            </p>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-12 pb-12">
            {error && (
                <div className="bg-status-error/10 border-2 border-status-error/30 text-status-error text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl mb-8 flex items-center gap-4 animate-in shake-1 shadow-low">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-8">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Operator E-mail</label>
                    <input 
                        type="email" required value={email} onChange={e=>setEmail(e.target.value)} 
                        className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-5.5 text-sm font-black text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/40" 
                        placeholder="operator@logistic-hub.com"
                    />
                </div>
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Access Token</label>
                    <input 
                        type="password" required value={password} onChange={e=>setPassword(e.target.value)} 
                        className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-5.5 text-sm font-black text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/40" 
                        placeholder="••••••••••••"
                    />
                </div>
                <button 
                    disabled={loading} type="submit" 
                    className="w-full bg-brand-primary hover:brightness-110 disabled:opacity-50 text-white text-xs font-black py-6 rounded-[2rem] transition-all shadow-xl shadow-brand-primary/25 flex justify-center items-center gap-4 active:scale-95 uppercase tracking-[0.25em]"
                >
                    {loading ? 'AUTHENTICATING ENCRYPTED DATA...' : isLogin ? 'GRANT ACCESS' : 'INITIALIZE OPERATOR'}
                </button>
            </form>

            <div className="text-center mt-10">
                <p className="text-[10px] text-secondary font-black tracking-widest uppercase opacity-80">
                    {isLogin ? "Unauthorized Operator? " : "Existing Agent? "}
                    <button 
                        onClick={() => setIsLogin(!isLogin)} 
                        className="text-brand-primary hover:underline underline-offset-4 font-black outline-none tracking-tighter ml-1"
                    >
                        {isLogin ? 'REQUEST ENTRY' : 'RETURN TO TERMINAL'}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
