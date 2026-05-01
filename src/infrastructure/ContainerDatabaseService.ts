import { supabase } from '@/lib/supabase';
import type {
  Container,
  ContainerType,
  ContainerStatus,
  ContainerItem,
} from '@/domain/Container';

/**
 * @file Persistência das tabelas `containers` e `container_items` no Supabase.
 *
 * Mapeia camelCase do domínio (Container, ContainerItem) ↔ snake_case do
 * Postgres no boundary. Toda query é gated por `user_id = session.user.id`,
 * com RLS validando o mesmo no servidor (defesa em profundidade).
 *
 * Falhas com código 42P01 (tabela inexistente) são tratadas graciosamente —
 * retornam vazio + logam warning. Isso permite que o app rode antes do
 * usuário aplicar o SQL de migração, com a UI funcionando em modo "vazio"
 * em vez de quebrar.
 */

// ─── Helpers de mapeamento ───────────────────────────────────────────────────

interface ContainerRow {
  id: string;
  user_id: string;
  name: string;
  type: ContainerType;
  status: ContainerStatus;
  created_at: string;
  updated_at: string;
}

interface ContainerItemRow {
  id: string;
  container_id: string;
  user_id: string;
  cod_prod: string;
  descricao: string;
  ncm_sh: string | null;
  cst: string | null;
  cfop: string | null;
  unid: string | null;
  qtde: number | string;
  vl_unitario: number | string;
  vl_total: number | string;
  vl_desconto: number | string;
  bc_icms: number | string;
  vl_icms: number | string;
  vl_ipi: number | string;
  aliq_icms: number | string;
  aliq_ipi: number | string;
  created_at: string;
  updated_at: string;
}

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function rowToContainer(r: ContainerRow): Container {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    type: r.type,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToItem(r: ContainerItemRow): ContainerItem {
  return {
    id: r.id,
    containerId: r.container_id,
    userId: r.user_id,
    codProd: r.cod_prod,
    descricao: r.descricao,
    ncmSh: r.ncm_sh ?? '',
    cst: r.cst ?? '',
    cfop: r.cfop ?? '',
    unid: r.unid ?? '',
    qtde: toNum(r.qtde),
    vlUnitario: toNum(r.vl_unitario),
    vlTotal: toNum(r.vl_total),
    vlDesconto: toNum(r.vl_desconto),
    bcIcms: toNum(r.bc_icms),
    vlIcms: toNum(r.vl_icms),
    vlIpi: toNum(r.vl_ipi),
    aliqIcms: toNum(r.aliq_icms),
    aliqIpi: toNum(r.aliq_ipi),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function itemToRow(item: Partial<ContainerItem>, userId: string, containerId: string) {
  return {
    ...(item.id ? { id: item.id } : {}),
    container_id: containerId,
    user_id: userId,
    cod_prod: item.codProd ?? '',
    descricao: item.descricao ?? '',
    ncm_sh: item.ncmSh ?? '',
    cst: item.cst ?? '',
    cfop: item.cfop ?? '',
    unid: item.unid ?? '',
    qtde: item.qtde ?? 0,
    vl_unitario: item.vlUnitario ?? 0,
    vl_total: item.vlTotal ?? 0,
    vl_desconto: item.vlDesconto ?? 0,
    bc_icms: item.bcIcms ?? 0,
    vl_icms: item.vlIcms ?? 0,
    vl_ipi: item.vlIpi ?? 0,
    aliq_icms: item.aliqIcms ?? 0,
    aliq_ipi: item.aliqIpi ?? 0,
    updated_at: new Date().toISOString(),
  };
}

async function requireSession(): Promise<{ userId: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Usuário não autenticado');
  return { userId: session.user.id };
}

function isMissingTableError(err: unknown): boolean {
  // Postgres "undefined_table" → SQLSTATE 42P01.
  return typeof err === 'object'
    && err !== null
    && (err as { code?: string }).code === '42P01';
}

// ─── API pública ─────────────────────────────────────────────────────────────

export const ContainerDatabaseService = {
  /** Lista todos os containers do usuário corrente, do mais recente ao mais antigo. */
  async loadContainers(): Promise<Container[]> {
    const { userId } = await requireSession();
    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[containers] Tabela ainda não existe — rode supabase-setup.sql.');
        return [];
      }
      throw error;
    }
    return (data as ContainerRow[]).map(rowToContainer);
  },

  /** Cria ou atualiza container. Detecta create vs update pela presença de `id`. */
  async saveContainer(input: {
    id?: string;
    name: string;
    type: ContainerType;
    status: ContainerStatus;
  }): Promise<Container> {
    const { userId } = await requireSession();
    const now = new Date().toISOString();

    const payload = {
      ...(input.id ? { id: input.id } : {}),
      user_id: userId,
      name: input.name,
      type: input.type,
      status: input.status,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('containers')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return rowToContainer(data as ContainerRow);
  },

  /** Remove container. ON DELETE CASCADE limpa container_items associados. */
  async deleteContainer(id: string): Promise<void> {
    const { userId } = await requireSession();
    const { error } = await supabase
      .from('containers')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  },

  /** Carrega itens de um container (ou todos os itens do usuário se omitido). */
  async loadItems(containerId?: string): Promise<ContainerItem[]> {
    const { userId } = await requireSession();
    let query = supabase
      .from('container_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (containerId) query = query.eq('container_id', containerId);

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[container_items] Tabela ainda não existe — rode supabase-setup.sql.');
        return [];
      }
      throw error;
    }
    return (data as ContainerItemRow[]).map(rowToItem);
  },

  /** Salva (insert/update) múltiplos itens de uma vez. Retorna os items persistidos. */
  async saveItems(
    items: Partial<ContainerItem>[],
    containerId: string
  ): Promise<ContainerItem[]> {
    if (items.length === 0) return [];
    const { userId } = await requireSession();
    const rows = items.map(it => itemToRow(it, userId, containerId));

    const { data, error } = await supabase
      .from('container_items')
      .upsert(rows, { onConflict: 'id' })
      .select();

    if (error) throw error;
    return (data as ContainerItemRow[]).map(rowToItem);
  },

  /** Remove vários itens em lote. */
  async deleteItems(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { userId } = await requireSession();
    const { error } = await supabase
      .from('container_items')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);
    if (error) throw error;
  },
};
