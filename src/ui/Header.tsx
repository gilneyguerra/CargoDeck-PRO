import {
  UserCircle, LogIn, Sun, Moon
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthModal } from './AuthModal';
import { SaveIndicator } from './SaveIndicator';
import type { User } from '@supabase/supabase-js';

export function Header() {
  const { locations } = useCargoStore();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      const isDark = storedTheme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      setIsDark(isDark);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      setIsDark(prefersDark);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const currentTotalWeight = useMemo(() => {
    let weight = 0;
    locations.forEach(loc => {
      loc.bays.forEach(bay => {
        bay.allocatedCargoes.forEach(c => {
          weight += c.weightTonnes * c.quantity;
        });
      });
    });
    return weight;
  }, [locations]);

  return (
    <>
      <header className="navbar flex flex-wrap items-center justify-between min-h-[5rem] px-6 lg:px-10 border-b border-subtle bg-header shrink-0 gap-6 shadow-medium z-30 font-sans">

        {/* Left Section: Logo */}
        <div className="flex items-center gap-6 order-1">
          <div className="flex items-center gap-4 group cursor-pointer ml-1">
            <div className="relative">
              <div className="absolute -inset-1.5 bg-brand-primary/15 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <img
                src="/logo-premium.png"
                alt="CargoDeck Plan"
                className="relative h-16 w-16 object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 rounded-2xl mix-blend-multiply dark:mix-blend-screen dark:brightness-200"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[26px] font-black tracking-tighter text-primary leading-none transition-colors group-hover:text-brand-primary/90">
                CargoDeck
              </span>
              <span className="text-[18px] font-extrabold text-brand-primary uppercase tracking-[0.15em] leading-none opacity-90 pt-1">
                Plan
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Payload + Theme + User */}
        <div className="flex items-center gap-4 order-3 ml-auto">
          {/* Peso Plano */}
          <div
            className="hidden xxl:flex flex-col items-end px-6 py-2.5 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl shadow-low"
            title="Carga Útil Total"
          >
            <span className="text-[10px] text-brand-primary font-black uppercase tracking-[0.2em] mb-1 opacity-80">Payload Total</span>
            <span className="text-primary font-black text-xl tabular-nums leading-none">{currentTotalWeight.toFixed(1)} <sub className="text-[11px] font-bold bottom-0 uppercase ml-1 opacity-50">Ton</sub></span>
          </div>

          {/* Indicador de auto-save — só renderiza algo durante "salvando…"
              ou nos 4s pós-save bem-sucedido. Em idle / signed-out, retorna
              null. Reduz ansiedade do operador em turnos longos: confirmação
              visual de que o trabalho está persistido sem precisar abrir
              DevTools. */}
          <SaveIndicator />

          <div className="h-10 w-px bg-border-subtle hidden lg:block" />

          {/* User Section */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(prev => !prev)}
              title={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
              className="p-3 text-secondary hover:bg-sidebar rounded-2xl border border-transparent hover:border-subtle transition-all"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
              <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 p-1.5 pr-4 bg-status-success/10 border border-status-success/20 rounded-full hover:bg-status-success/20 transition-all">
                <UserCircle className="w-9 h-9 text-status-success" />
                <div className="flex flex-col items-start leading-none gap-1">
                  <span className="text-[10px] font-black text-status-success uppercase tracking-widest">Active</span>
                  <span className="text-xs font-bold text-primary truncate max-w-[80px]">{user.email?.split('@')[0]}</span>
                </div>
              </button>
            ) : (
              <button onClick={() => setIsAuthOpen(true)} className="p-3 text-secondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all">
                <LogIn size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
