import { useEffect } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/infrastructure/DatabaseService';

export const useAutoSave = () => {
  const { locations, unallocatedCargoes, shipOperationCode, manifestsLoaded, isHydratedFromCloud } = useCargoStore();

  // Auto-Save de 3 segundos contra flooding
  useEffect(() => {
    const handler = setTimeout(async () => {
      // Bloquear auto-save enquanto a hidratação inicial não estiver concluída
      if (!isHydratedFromCloud) {
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          await DatabaseService.saveStowagePlan();
          console.log("Auto-save Cloud sincronizado automaticamente.");
        } catch(e) {
          console.error("Auto-save falhou", e);
        }
      }
    }, 3000);

    return () => clearTimeout(handler);
  }, [locations, unallocatedCargoes, shipOperationCode, manifestsLoaded, isHydratedFromCloud]);
};