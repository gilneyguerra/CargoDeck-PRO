import { useEffect } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/infrastructure/DatabaseService';

export const useAutoSave = () => {
  // Selectors granulares — actions são refs estáveis, valores também só
  // disparam re-run do useEffect via deps abaixo.
  const locations = useCargoStore(s => s.locations);
  const unallocatedCargoes = useCargoStore(s => s.unallocatedCargoes);
  const manifestsLoaded = useCargoStore(s => s.manifestsLoaded);
  const isHydratedFromCloud = useCargoStore(s => s.isHydratedFromCloud);
  const setSaving = useCargoStore(s => s.setSaving);
  const markSaved = useCargoStore(s => s.markSaved);

  // Auto-Save de 3 segundos contra flooding
  useEffect(() => {
    const handler = setTimeout(async () => {
      // Bloquear auto-save enquanto a hidratação inicial não estiver concluída
      if (!isHydratedFromCloud) {
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // SaveIndicator lê isSaving + lastSavedAt para mostrar feedback visual
      // ao operador. Sem isso, não havia confirmação de que o trabalho foi
      // persistido — só log no console.
      setSaving(true);
      try {
        await DatabaseService.saveStowagePlan();
        markSaved();
        console.log("Auto-save Cloud sincronizado automaticamente.");
      } catch(e) {
        // markSaved só corre no caminho feliz — em erro, isSaving volta a
        // false para o spinner não ficar pendurado, mas lastSavedAt NÃO é
        // atualizado (o indicador continua mostrando o último save bom).
        setSaving(false);
        console.error("Auto-save falhou", e);
      }
    }, 3000);

    return () => clearTimeout(handler);
  }, [locations, unallocatedCargoes, manifestsLoaded, isHydratedFromCloud, setSaving, markSaved]);
};