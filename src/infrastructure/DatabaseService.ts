import { supabase } from '@/lib/supabase';
import { useCargoStore } from '@/features/cargoStore';

export const DatabaseService = {
  async saveStowagePlan() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Usuário não autenticado");

    const state = useCargoStore.getState();
    const payload = {
      unallocatedCargoes: state.unallocatedCargoes,
      locations: state.locations,
      shipOperationCode: state.shipOperationCode,
      manifestsLoaded: state.manifestsLoaded,
    };

    const { data, error } = await supabase
      .from('stowage_plans')
      .upsert({
        user_id: session.user.id,
        ship_code: state.shipOperationCode || 'DEFAULT',
        state_payload: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, ship_code' });

    if (error) throw error;
    return data;
  },

  async loadStowagePlan(shipCode: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Usuário não autenticado");

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
    if (!session?.user) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from('cargo_items')
      .delete()
      .eq('id', cargoId)
      .eq('user_id', session.user.id);

    if (error) throw error;
    
    // Also update the stowage plan to remove the cargo from state
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
      unallocatedCargoes: updatedUnallocated,
      locations: updatedLocations,
      shipOperationCode: state.shipOperationCode,
      manifestShipName: state.manifestShipName,
      manifestVoyage: state.manifestVoyage,
      manifestsLoaded: state.manifestsLoaded,
    };

    await supabase
      .from('stowage_plans')
      .upsert({
        user_id: session.user.id,
        ship_code: state.shipOperationCode || 'DEFAULT',
        state_payload: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, ship_code' });
  }
};
