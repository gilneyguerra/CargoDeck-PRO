import { useEffect } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/infrastructure/DatabaseService';

export const useAuthAndHydration = () => {
  const { hydrateFromDb, shipOperationCode } = useCargoStore();

  // Carrega o plano de estiba ao autenticar ou mudar o código da operação
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        DatabaseService.loadStowagePlan(shipOperationCode).then(data => {
          if (data) hydrateFromDb(data);
        });
      }
    });
  }, [shipOperationCode, hydrateFromDb]);

  // Inscreve-se nas mudanças de estado de autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        DatabaseService.loadStowagePlan(shipOperationCode).then(data => {
          if (data) hydrateFromDb(data);
        });
      } else if (event === 'SIGNED_OUT') {
        // Opcional: Esvaziar RAM ou recarregar pra segurança.
        window.location.reload();
      }
    });
    return () => subscription.unsubscribe();
  }, [shipOperationCode, hydrateFromDb]);
};