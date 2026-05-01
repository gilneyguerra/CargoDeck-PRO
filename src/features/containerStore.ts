import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Container,
  ContainerItem,
  ContainerStatus,
  ContainerType,
} from '@/domain/Container';
import { computeVlTotal } from '@/domain/Container';
import { ContainerDatabaseService } from '@/infrastructure/ContainerDatabaseService';
import { reportException } from '@/features/errorReporter';

/**
 * @file Store Zustand para containers (unidades de transporte fiscais) e
 * seus itens DANFE. Persistência única no Supabase via
 * ContainerDatabaseService — não usa middleware `persist` porque os dados
 * fiscais ficam exclusivamente no servidor (não há benefício em cachear
 * em localStorage e arrisca leak entre usuários).
 *
 * Mutations seguem padrão optimistic update: alteram estado local primeiro,
 * depois persistem no Supabase. Em caso de falha, recarregam do servidor.
 */

/**
 * Garante nome único entre os containers do usuário. Se `desired` colide
 * com algum existente (case-insensitive, trim), apenda " (2)", " (3)", … até
 * encontrar um livre. Resolve duplicatas mantendo ordem alfabética
 * determinística no PDF e no grid.
 *
 * `excludeId` permite renomear o próprio container sem auto-colidir.
 */
export function dedupeContainerName(
  desired: string,
  existing: Container[],
  excludeId?: string,
): string {
  const trimmed = desired.trim();
  if (!trimmed) return trimmed;
  const taken = new Set(
    existing
      .filter(c => c.id !== excludeId)
      .map(c => c.name.trim().toLowerCase()),
  );
  if (!taken.has(trimmed.toLowerCase())) return trimmed;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${trimmed} (${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${trimmed} (${Date.now()})`;
}

interface ContainerState {
  containers: Container[];
  items: ContainerItem[]; // todos os itens do usuário (filtrar por containerId conforme necessário)
  selectedContainerIds: Set<string>;
  loading: boolean;
  loaded: boolean;

  // Lifecycle
  fetchAll: () => Promise<void>;
  reset: () => void;

  // Container CRUD
  addContainer: (input: { name: string; type: ContainerType; status: ContainerStatus }) => Promise<Container>;
  updateContainer: (id: string, patch: Partial<Pick<Container, 'name' | 'type' | 'status'>>) => Promise<void>;
  deleteContainer: (id: string) => Promise<void>;

  // Selection
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Item CRUD
  addItems: (containerId: string, items: Partial<ContainerItem>[]) => Promise<ContainerItem[]>;
  updateItem: (id: string, patch: Partial<ContainerItem>) => Promise<void>;
  removeItems: (ids: string[]) => Promise<void>;

  // Helpers
  getItemsByContainer: (containerId: string) => ContainerItem[];
  getContainerById: (id: string) => Container | undefined;
}

export const useContainerStore = create<ContainerState>((set, get) => ({
  containers: [],
  items: [],
  selectedContainerIds: new Set<string>(),
  loading: false,
  loaded: false,

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  fetchAll: async () => {
    set({ loading: true });
    try {
      const [containers, items] = await Promise.all([
        ContainerDatabaseService.loadContainers(),
        ContainerDatabaseService.loadItems(),
      ]);
      set({ containers, items, loaded: true });
    } catch (err) {
      reportException(err, {
        title: 'Falha ao carregar containers',
        category: 'storage',
        source: 'container-store-fetch',
        suggestion: 'Verifique sua conexão e se as tabelas containers/container_items foram criadas no Supabase.',
      });
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({
    containers: [],
    items: [],
    selectedContainerIds: new Set<string>(),
    loaded: false,
  }),

  // ─── Container CRUD ────────────────────────────────────────────────────────

  addContainer: async (input) => {
    // Sufixo " (N)" automático em colisões de nome — ordem alfabética
    // no PDF/grid permanece determinística mesmo se o usuário cadastrar
    // duas vezes "Caixa A".
    const uniqueName = dedupeContainerName(input.name, get().containers);
    const persistedInput = { ...input, name: uniqueName };

    // Optimistic: cria localmente com id temporário, substitui pelo persistido
    const tempId = uuidv4();
    const now = new Date().toISOString();
    const optimistic: Container = {
      id: tempId,
      userId: '',
      name: uniqueName,
      type: input.type,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };
    set(s => ({ containers: [optimistic, ...s.containers] }));

    try {
      const saved = await ContainerDatabaseService.saveContainer(persistedInput);
      set(s => ({
        containers: s.containers.map(c => (c.id === tempId ? saved : c)),
      }));
      return saved;
    } catch (err) {
      // Rollback otimista
      set(s => ({ containers: s.containers.filter(c => c.id !== tempId) }));
      reportException(err, {
        title: 'Falha ao criar container',
        category: 'storage',
        source: 'container-add',
      });
      throw err;
    }
  },

  updateContainer: async (id, patch) => {
    const previous = get().containers.find(c => c.id === id);
    if (!previous) return;

    // Se o nome mudou, garante unicidade ignorando o próprio container
    // na checagem (renomear "Caixa A" para "Caixa A" não vira "Caixa A (2)").
    const nameChanged = patch.name !== undefined && patch.name !== previous.name;
    const finalName = nameChanged
      ? dedupeContainerName(patch.name as string, get().containers, id)
      : previous.name;

    const updated: Container = {
      ...previous,
      ...patch,
      name: finalName,
      updatedAt: new Date().toISOString(),
    };
    set(s => ({ containers: s.containers.map(c => (c.id === id ? updated : c)) }));

    try {
      await ContainerDatabaseService.saveContainer({
        id,
        name: updated.name,
        type: updated.type,
        status: updated.status,
      });
    } catch (err) {
      // Rollback
      set(s => ({ containers: s.containers.map(c => (c.id === id ? previous : c)) }));
      reportException(err, {
        title: 'Falha ao atualizar container',
        category: 'storage',
        source: 'container-update',
      });
    }
  },

  deleteContainer: async (id) => {
    const previousContainers = get().containers;
    const previousItems = get().items;

    // Optimistic remove
    set(s => ({
      containers: s.containers.filter(c => c.id !== id),
      items: s.items.filter(it => it.containerId !== id),
      selectedContainerIds: new Set(Array.from(s.selectedContainerIds).filter(x => x !== id)),
    }));

    try {
      await ContainerDatabaseService.deleteContainer(id);
    } catch (err) {
      set({ containers: previousContainers, items: previousItems });
      reportException(err, {
        title: 'Falha ao deletar container',
        category: 'storage',
        source: 'container-delete',
      });
    }
  },

  // ─── Selection ─────────────────────────────────────────────────────────────

  toggleSelection: (id) => set(s => {
    const next = new Set(s.selectedContainerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { selectedContainerIds: next };
  }),

  clearSelection: () => set({ selectedContainerIds: new Set<string>() }),

  selectAll: () => set(s => ({
    selectedContainerIds: new Set(s.containers.map(c => c.id)),
  })),

  // ─── Item CRUD ─────────────────────────────────────────────────────────────

  addItems: async (containerId, partials) => {
    if (partials.length === 0) return [];

    // Recalcula vl_total para garantir consistência antes de persistir
    const normalized = partials.map(p => ({
      ...p,
      vlTotal: computeVlTotal(p.qtde ?? 0, p.vlUnitario ?? 0, p.vlDesconto ?? 0),
    }));

    try {
      const saved = await ContainerDatabaseService.saveItems(normalized, containerId);
      set(s => ({ items: [...s.items, ...saved] }));
      return saved;
    } catch (err) {
      reportException(err, {
        title: 'Falha ao salvar itens',
        category: 'storage',
        source: 'container-items-add',
      });
      throw err;
    }
  },

  updateItem: async (id, patch) => {
    const previous = get().items.find(it => it.id === id);
    if (!previous) return;

    const merged: ContainerItem = {
      ...previous,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    merged.vlTotal = computeVlTotal(merged.qtde, merged.vlUnitario, merged.vlDesconto);

    set(s => ({ items: s.items.map(it => (it.id === id ? merged : it)) }));

    try {
      await ContainerDatabaseService.saveItems([merged], merged.containerId);
    } catch (err) {
      set(s => ({ items: s.items.map(it => (it.id === id ? previous : it)) }));
      reportException(err, {
        title: 'Falha ao atualizar item',
        category: 'storage',
        source: 'container-item-update',
      });
    }
  },

  removeItems: async (ids) => {
    if (ids.length === 0) return;
    const previous = get().items;
    set(s => ({ items: s.items.filter(it => !ids.includes(it.id)) }));

    try {
      await ContainerDatabaseService.deleteItems(ids);
    } catch (err) {
      set({ items: previous });
      reportException(err, {
        title: 'Falha ao remover itens',
        category: 'storage',
        source: 'container-items-remove',
      });
    }
  },

  // ─── Helpers ───────────────────────────────────────────────────────────────

  getItemsByContainer: (containerId) =>
    get().items.filter(it => it.containerId === containerId),

  getContainerById: (id) =>
    get().containers.find(c => c.id === id),
}));
