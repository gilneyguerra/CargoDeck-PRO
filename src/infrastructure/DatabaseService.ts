import { supabase } from '@/lib/supabase';
import { useCargoStore } from '@/features/cargoStore';

export const DatabaseService = {
  async saveStowagePlan() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Usuário não autenticado');

    const state = useCargoStore.getState();

    // Inclui todos os campos de estado relevantes: cargas, localidades e metadados do manifesto
    const payload = {
      unallocatedCargoes:  state.unallocatedCargoes,
      locations:           state.locations,
      manifestsLoaded:     state.manifestsLoaded,
      // Metadados do manifesto extraído
      manifestShipName:    state.manifestShipName,
      manifestAtendimento: state.manifestAtendimento,
      manifestRoteiro:     state.manifestRoteiro,
    };

    const { data, error } = await supabase
      .from('stowage_plans')
      .upsert({
        user_id:      session.user.id,
        ship_code:    'MAIN_PLAN',
        state_payload: payload,
        updated_at:   new Date().toISOString()
      }, { onConflict: 'user_id, ship_code' });

    if (error) throw error;
    return data;
  },

  async loadStowagePlan(shipCode: string = 'MAIN_PLAN') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('stowage_plans')
      .select('state_payload')
      .eq('user_id', session.user.id)
      .eq('ship_code', shipCode)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data?.state_payload || null;
  },

  async deleteCargo(cargoId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('cargo_items')
      .delete()
      .eq('id', cargoId)
      .eq('user_id', session.user.id);

    if (error) throw error;

    // Atualiza o plano de carga no Supabase removendo a carga deletada
    const state = useCargoStore.getState();
    const updatedUnallocated = state.unallocatedCargoes.filter(c => c.id !== cargoId);

    const updatedLocations = state.locations.map(loc => ({
      ...loc,
      bays: loc.bays.map(bay => ({
        ...bay,
        allocatedCargoes: bay.allocatedCargoes.filter(c => c.id !== cargoId)
      }))
    }));

    const payload = {
      unallocatedCargoes:  updatedUnallocated,
      locations:           updatedLocations,
      manifestsLoaded:     state.manifestsLoaded,
      manifestShipName:    state.manifestShipName,
      manifestAtendimento: state.manifestAtendimento,
      manifestRoteiro:     state.manifestRoteiro,
    };

    await supabase
      .from('stowage_plans')
      .upsert({
        user_id:      session.user.id,
        ship_code:    'MAIN_PLAN',
        state_payload: payload,
        updated_at:   new Date().toISOString()
      }, { onConflict: 'user_id, ship_code' });
  }
};

