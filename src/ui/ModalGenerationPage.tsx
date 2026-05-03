import { useState, useMemo, useDeferredValue, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Search, Table2, Plus,
  ArrowRight, CheckSquare, Square, Trash2, Package, X,
  Boxes, Flame, Layers, Flag, Zap, Users, AlertOctagon,
  FolderOpen, Building2,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, horizontalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { reportException } from '@/features/errorReporter';
import { useContainerStore } from '@/features/containerStore';
import { PdfGeneratorService } from '@/infrastructure/PdfGeneratorService';
import { ManualCargoModal } from './ManualCargoModal';
import { AllocateCargoModal } from './AllocateCargoModal';
import { PriorityModal } from './PriorityModal';
import { GroupMoveModal } from './GroupMoveModal';
import { canHoldItems, type Cargo } from '@/domain/Cargo';
import type { Container } from '@/domain/Container';
import { cn } from '@/lib/utils';

// Lazy: parsers Excel/CSV (SheetJS via CDN) e LLM Assistant ficam fora do
// bundle inicial — só carregam quando o usuário abre cada modal.
const CargoEditorModal = lazy(() =>
  import('./CargoEditorModal').then(m => ({ default: m.CargoEditorModal }))
);
// CargoAssistant agora vive no ChatWidget global (FAB) — montado em
// App.tsx, acessível em todas as rotas. Removido daqui.

// Lazy: inventário DANFE — só carrega quando o usuário abre o popup de
// alocar/desalocar itens em uma carga-CONTAINER.
const ContainerInventoryModal = lazy(() =>
  import('./containers/ContainerInventoryModal').then(m => ({ default: m.ContainerInventoryModal }))
);

// ─── Filtros ──────────────────────────────────────────────────────────────────

// Tabs dinâmicas: 'all' e 'priority' são fixas. Outras tabs nascem de cada categoria
// distinta presente nas cargas (Excel manda; manual respeita; Excel novo cria filtro novo).
// O valor de cada tab dinâmica é um prefixo seguro: 'cat:CONTAINER', 'cat:HAZARDOUS', etc.
type FilterTab = string;

const FILTER_STORAGE_KEY = 'cargodeck-modal-generation-filter';
const TAB_ORDER_STORAGE_KEY = 'cargodeck-tab-order';

/** Limite de tabs dinâmicas além do qual a UX em viewports estreitos
 *  começa a degradar (scroll horizontal vira a única forma de ver todas).
 *  Notificação (toast warning + uma vez por sessão) avisa o usuário. */
const MAX_RESPONSIVE_TABS = 8;

// Mapa de ícone por categoria conhecida; categorias livres caem no fallback Layers.
const CATEGORY_ICONS: Record<string, typeof Boxes> = {
  CONTAINER: Package,
  BASKET: Boxes,
  TUBULAR: Layers,
  EQUIPMENT: Package,
  HAZARDOUS: Flame,
  HEAVY: Boxes,
  FRAGILE: Boxes,
  GENERAL: Layers,
  OTHER: Layers,
};

// Labels amigáveis (fallback: a própria string da categoria, capitalizada).
const CATEGORY_LABELS: Record<string, string> = {
  CONTAINER: 'Contentores',
  BASKET: 'Cestas',
  TUBULAR: 'Tubulares',
  EQUIPMENT: 'Equipamentos',
  HAZARDOUS: 'Perigosas',
  HEAVY: 'Pesadas',
  FRAGILE: 'Frágeis',
  GENERAL: 'Gerais',
  OTHER: 'Outros',
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? (cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase());
}

function categoryIcon(cat: string): typeof Boxes {
  return CATEGORY_ICONS[cat] ?? Layers;
}

// ─── SortableDynamicTab ────────────────────────────────────────────────────────

interface SortableDynamicTabProps {
  id: string; // rawCategory (ex.: 'CONTAINER')
  active: boolean;
  isHazardousTab: boolean;
  label: string;
  count: number;
  Icon: typeof Boxes;
  onSelect: () => void;
}

/** Tab dinâmica draggable. Estilo igual ao botão original, com cursor-grab
 *  e elevação durante drag para feedback visual. dnd-kit aplica transform
 *  CSS via setNodeRef + style. */
function SortableDynamicTab({ id, active, isHazardousTab, label, count, Icon, onSelect }: SortableDynamicTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-[background-color,border-color,color,box-shadow] duration-200 min-h-[40px] shrink-0 cursor-grab active:cursor-grabbing touch-none',
        active
          ? isHazardousTab
            ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-sm shadow-purple-500/20'
            : 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-sm'
          : 'border-transparent text-secondary hover:text-primary hover:bg-sidebar',
      )}
    >
      <Icon size={13} className={isHazardousTab && !active ? 'text-purple-500' : ''} />
      {label}
      <span className={cn(
        'inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-mono font-black tabular-nums shadow-sm',
        active
          ? isHazardousTab ? 'bg-purple-500 text-white' : 'bg-brand-primary text-white'
          : 'bg-subtle text-muted',
      )}>
        {count}
      </span>
    </button>
  );
}

// ─── CargoGridCard ─────────────────────────────────────────────────────────────

interface CargoGridCardProps {
  cargo: Cargo;
  selected: boolean;
  /** Quantidade de itens DANFE já alocados nesta carga (apenas relevante quando category==='CONTAINER'). */
  danfeItemCount?: number;
  /** Delay em ms para a entrada em cascade (stagger). Capped em 12*40=480ms
   *  pelo caller — undefined = sem animation-delay aplicado. */
  enterDelayMs?: number;
  onToggle: (id: string) => void;
  onEdit: (cargo: Cargo) => void;
  onDelete: (cargo: Cargo) => void;
  /** Move ESTA carga (single) — abre AllocateCargoModal com 1 ID. */
  onMove: (cargo: Cargo) => void;
  /** Altera prioridade DESTA carga (single) — abre PriorityModal com 1 ID. */
  onChangePriority: (cargo: Cargo) => void;
  /** Acionado pelo botão "Alocar / Desalocar Itens" — apenas para cargas-CONTENTOR. */
  onOpenInventory?: (cargo: Cargo) => void;
}

function CargoGridCard({ cargo, selected, danfeItemCount = 0, enterDelayMs, onToggle, onEdit, onDelete, onMove, onChangePriority, onOpenInventory }: CargoGridCardProps) {
  const ratio = (cargo.lengthMeters || 1) / (cargo.widthMeters || 1);
  const baseSize = 80;
  const visualWidth = ratio >= 1 ? baseSize : Math.max(20, baseSize * ratio);
  const visualHeight = ratio >= 1 ? Math.max(20, baseSize / ratio) : baseSize;
  const isUrgent = cargo.priority === 'urgent';
  const isHigh = cargo.priority === 'high';
  const isHazardous = cargo.isHazardous || cargo.category === 'HAZARDOUS';

  // Estilo inline em hazardous: borda + glow roxo pulsante (priority sobrepõe se também urgente)
  const hazardousStyle = isHazardous && !selected ? {
    borderColor: '#a855f7',
    backgroundColor: '#a855f70a',
    boxShadow: '0 0 0 1px #a855f740, 0 0 14px #a855f750',
  } : undefined;

  const urgentStyle = isUrgent && !selected ? {
    borderColor: '#B71C1C',
    backgroundColor: '#B71C1C10',
    boxShadow: '0 0 0 1px #B71C1C40, 0 0 12px #B71C1C30',
  } : undefined;

  // Combina o style de prioridade (hazardous/urgent) com o animationDelay
  // do stagger. animationDelay é só aplicado quando enterDelayMs é passado.
  const cardStyle = enterDelayMs !== undefined
    ? { ...(hazardousStyle ?? urgentStyle ?? {}), animationDelay: `${enterDelayMs}ms` }
    : (hazardousStyle ?? urgentStyle);

  // Cascade de entrada (Emil's stagger): só aplicada em cards "calmos".
  // Cards hazardous/urgent já têm `animate-pulse` e não podem ter outra
  // animation simultânea — o pulse é mais informativo.
  const showEnterAnimation = !isHazardous && !isUrgent;

  return (
    <div
      onClick={() => onToggle(cargo.id)}
      className={cn(
        'group relative p-4 rounded-2xl border-2 transition-[background-color,border-color,box-shadow,transform] duration-200 cursor-pointer flex flex-col gap-3 hover:shadow-md active:scale-[0.98]',
        // Keyframe `cargoCardEnter` mora em src/index.css; reduced-motion
        // neutraliza via duration override (commit anterior).
        showEnterAnimation && 'animate-[cargoCardEnter_300ms_var(--ease-out-fast)_both]',
        selected
          ? 'border-brand-primary bg-brand-primary/5 shadow-md'
          : isHazardous || isUrgent
          ? 'animate-pulse'
          : 'border-subtle bg-sidebar/40 hover:border-strong'
      )}
      style={cardStyle}
    >
      {/* Badges de status — perigosa tem prioridade visual sobre urgente */}
      {isHazardous && (
        <div className="absolute -top-2 -right-2 bg-purple-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/40 flex items-center gap-1">
          <AlertOctagon size={9} /> Perigosa
        </div>
      )}
      {!isHazardous && isUrgent && (
        <div className="absolute -top-2 -right-2 bg-[#B71C1C] text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
          <Zap size={9} /> Urgente
        </div>
      )}
      {!isHazardous && isHigh && (
        <div className="absolute -top-2 -right-2 bg-status-warning text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-md flex items-center gap-1">
          <Flag size={9} /> Alta
        </div>
      )}

      {/* Header: checkbox + identifier */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected ? (
            <CheckSquare size={18} className="text-brand-primary shrink-0" />
          ) : (
            <Square size={18} className="text-muted/50 shrink-0" />
          )}
          <span className="text-[12px] font-mono font-black text-secondary truncate max-w-[110px]" title={cargo.identifier}>
            {cargo.identifier}
          </span>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0"
          style={{ backgroundColor: `${cargo.color || '#3b82f6'}20`, color: cargo.color || '#3b82f6' }}
        >
          {cargo.category}
        </span>
      </div>

      {/* Visual proporcional */}
      <div className="flex items-center justify-center bg-main rounded-xl border border-subtle/40 h-[120px] relative overflow-hidden">
        <div
          className="border-2 rounded shadow-md flex items-center justify-center transition-[background-color,border-color,transform] duration-200"
          style={{
            width: `${visualWidth}px`,
            height: `${visualHeight}px`,
            backgroundColor: `${cargo.color || '#3b82f6'}40`,
            borderColor: cargo.color || '#3b82f6',
          }}
        >
          <span className="text-[10px] font-mono font-black text-primary px-1 truncate tabular-nums">
            {cargo.lengthMeters?.toFixed(1)}×{cargo.widthMeters?.toFixed(1)}m
          </span>
        </div>
      </div>

      {/* Descrição */}
      <h4 className="text-[11px] font-black text-primary leading-tight line-clamp-2 min-h-[28px]" title={cargo.description}>
        {cargo.description}
      </h4>

      {/* Empresa proprietária — exibido apenas quando informado. Linha discreta,
          prosa em font-sans (não compete com numéricos do card). */}
      {cargo.empresa && cargo.empresa.trim() && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-secondary -mt-1" title={`Empresa: ${cargo.empresa}`}>
          <Building2 size={11} className="text-muted shrink-0" />
          <span className="truncate">{cargo.empresa}</span>
        </div>
      )}

      {/* Métricas — labels em uppercase tracking + números em mono tabular */}
      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest pt-2 border-t border-subtle/40">
        <span className="text-secondary">
          <span className="font-mono tabular-nums text-brand-primary">{cargo.weightTonnes.toFixed(2)}</span>
          <span className="text-muted"> t</span>
        </span>
        {cargo.destinoCarga && (
          <span className="text-status-success/80 font-mono tabular-nums truncate max-w-[90px]" title={cargo.destinoCarga}>
            → {cargo.destinoCarga}
          </span>
        )}
      </div>

      {/* Ações da carga — SEMPRE visíveis (sem ocultar via hover). 4 botões
          inline: Mover (verde), Prioridade (âmbar), Editar (brand), Excluir
          (vermelho). Mover/Prioridade abrem os mesmos modais que antes
          rodavam só em batch — agora também por carga individual. */}
      <div className="grid grid-cols-4 gap-1 -mt-1">
        <button
          onClick={(e) => { e.stopPropagation(); onMove(cargo); }}
          className="min-h-[36px] px-1.5 py-1.5 rounded-md flex items-center justify-center gap-1 bg-status-success/10 text-status-success hover:bg-status-success hover:text-white border border-status-success/30 transition-[background-color,border-color,color] duration-200 text-[9px] font-black uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-status-success/40"
          title="Mover para um convés"
          aria-label={`Mover ${cargo.identifier} para um convés`}
        >
          <ArrowRight size={11} />
          Mover
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onChangePriority(cargo); }}
          className="min-h-[36px] px-1.5 py-1.5 rounded-md flex items-center justify-center gap-1 bg-status-warning/10 text-status-warning hover:bg-status-warning hover:text-white border border-status-warning/30 transition-[background-color,border-color,color] duration-200 text-[9px] font-black uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-status-warning/40"
          title="Alterar Prioridade"
          aria-label={`Alterar prioridade de ${cargo.identifier}`}
        >
          <Flag size={11} />
          Prior
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(cargo); }}
          className="min-h-[36px] px-1.5 py-1.5 rounded-md flex items-center justify-center hover:bg-brand-primary/10 text-muted hover:text-brand-primary border border-transparent hover:border-brand-primary/30 transition-[background-color,border-color,color] duration-200 text-[9px] font-black uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
          title="Editar"
          aria-label={`Editar ${cargo.identifier}`}
        >
          Editar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(cargo); }}
          className="min-h-[36px] px-1.5 py-1.5 rounded-md flex items-center justify-center hover:bg-status-error/10 text-muted hover:text-status-error border border-transparent hover:border-status-error/30 transition-[background-color,border-color,color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-status-error/40"
          title="Excluir"
          aria-label={`Excluir ${cargo.identifier}`}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Inventário DANFE: visível apenas para modais unitizadores (flag
          declarada na criação ou default por categoria). Sempre exibido,
          pois é ação de fluxo principal. */}
      {canHoldItems(cargo) && onOpenInventory && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenInventory(cargo); }}
          className="flex items-center justify-center gap-1.5 min-h-[36px] px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 border-brand-primary/30 bg-brand-primary/5 text-brand-primary hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-[background-color,border-color,color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
          title={danfeItemCount > 0 ? `${danfeItemCount} ${danfeItemCount === 1 ? 'item DANFE alocado' : 'itens DANFE alocados'}` : 'Sem itens DANFE'}
          aria-label={`Alocar ou desalocar itens DANFE do contentor ${cargo.identifier}`}
        >
          <FolderOpen size={11} />
          <span>Alocar / Desalocar Itens</span>
          {danfeItemCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-brand-primary text-white text-[8px] font-mono">
              {danfeItemCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────

export function ModalGenerationPage() {
  // Selectors granulares: cada campo só dispara re-render quando seu próprio
  // valor muda. Antes, o destructure massivo re-renderizava a página inteira
  // (e os 50+ CargoGridCard) a cada toggle de seleção, drag de cargas no
  // /deck, ou tick do auto-save de 3s. Actions são refs estáveis em Zustand,
  // então selecioná-las uma a uma não custa nada extra além das linhas.
  const unallocatedCargoes = useCargoStore(s => s.unallocatedCargoes);
  const selectedCargos = useCargoStore(s => s.selectedCargos);
  const toggleCargoSelection = useCargoStore(s => s.toggleCargoSelection);
  const selectMultipleCargos = useCargoStore(s => s.selectMultipleCargos);
  const clearCargoSelection = useCargoStore(s => s.clearCargoSelection);
  const setEditingCargo = useCargoStore(s => s.setEditingCargo);
  const deleteCargo = useCargoStore(s => s.deleteCargo);
  const deleteMultipleCargoes = useCargoStore(s => s.deleteMultipleCargoes);
  const { notify, ask } = useNotificationStore();
  const navigate = useNavigate();

  // Modais
  const [showEditor, setShowEditor] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showGroupMove, setShowGroupMove] = useState(false);

  // Container inventory (DANFE) — modal acessado via "Alocar/Desalocar
  // Itens" inline em CargoGridCard que tem category==='CONTAINER'.
  // Não há mais view dedicada de listing — gerenciamento é feito por
  // cargo individual.
  const [inventoryContainer, setInventoryContainer] = useState<Container | null>(null);
  // IDs alvo das ações de Mover/Prioridade — pode vir de uma seleção batch
  // OU de uma carga individual (botão inline no CargoGridCard). null = não
  // definido (modal não está aberto). Limpa quando o modal fecha.
  const [actionIds, setActionIds] = useState<string[] | null>(null);
  const containerStore = useContainerStore();
  const danfeItems = useContainerStore(s => s.items);
  const fetchAllContainers = useContainerStore(s => s.fetchAll);
  const containerLoaded = useContainerStore(s => s.loaded);
  const containerLoading = useContainerStore(s => s.loading);

  // Hidrata containers/items do Supabase ao montar para que o badge de
  // contagem DANFE no CargoGridCard fique correto desde o primeiro paint.
  useEffect(() => {
    if (!containerLoaded && !containerLoading) fetchAllContainers();
  }, [containerLoaded, containerLoading, fetchAllContainers]);

  // Mapa containerId(=cargo.id) → contagem de itens DANFE — usado pelo badge.
  const danfeCountByCargoId = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of danfeItems) map.set(it.containerId, (map.get(it.containerId) ?? 0) + 1);
    return map;
  }, [danfeItems]);

  // Filtro persistido (aceita qualquer string: 'all' | 'priority' | 'cat:<CATEGORIA>')
  const [filterTab, setFilterTab] = useState<FilterTab>(() => {
    try {
      const v = localStorage.getItem(FILTER_STORAGE_KEY);
      if (v) return v;
    } catch { /* noop */ }
    return 'all';
  });

  useEffect(() => {
    try { localStorage.setItem(FILTER_STORAGE_KEY, filterTab); } catch { /* noop */ }
  }, [filterTab]);

  // Busca com debounce via useDeferredValue
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);

  // Tabs dinâmicas: derivadas das categorias presentes nas cargas
  // Ordem custom das tabs dinâmicas — reordenável por drag-and-drop.
  // Persistida em localStorage para manter o gosto do usuário entre sessões.
  // Categorias novas (não presentes no array) entram no fim em ordem natural.
  const [tabOrder, setTabOrder] = useState<string[]>(() => {
    try {
      const v = localStorage.getItem(TAB_ORDER_STORAGE_KEY);
      if (v) return JSON.parse(v) as string[];
    } catch { /* noop */ }
    return [];
  });

  useEffect(() => {
    try { localStorage.setItem(TAB_ORDER_STORAGE_KEY, JSON.stringify(tabOrder)); } catch { /* noop */ }
  }, [tabOrder]);

  const dynamicTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of unallocatedCargoes) {
      const k = c.category || 'OTHER';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    // Ordem natural: por quantidade decrescente, depois alfabético
    const naturalOrder = Array.from(counts.keys())
      .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b));

    // Aplica ordem persistida: categorias na tabOrder vêm primeiro (na ordem
    // do user), depois categorias novas em ordem natural.
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const cat of tabOrder) {
      if (counts.has(cat)) {
        ordered.push(cat);
        seen.add(cat);
      }
    }
    for (const cat of naturalOrder) {
      if (!seen.has(cat)) ordered.push(cat);
    }

    return ordered.map(cat => ({
      value: `cat:${cat}` as FilterTab,
      label: categoryLabel(cat),
      icon: categoryIcon(cat),
      count: counts.get(cat) ?? 0,
      rawCategory: cat,
    }));
  }, [unallocatedCargoes, tabOrder]);

  // ─── Drag-and-drop para reordenar tabs dinâmicas ────────────────────────
  // PointerSensor com distância mínima evita "drag" em cliques curtos.
  const tabSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const handleTabDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setTabOrder(prev => {
      const ids = dynamicTabs.map(t => t.rawCategory);
      const oldIdx = ids.indexOf(String(active.id));
      const newIdx = ids.indexOf(String(over.id));
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(ids, oldIdx, newIdx);
    });
  };

  // Notificação one-shot por sessão quando excede o limite responsivo.
  // Ao atingir o teto, avisa o operador que a UX começa a degradar (scroll
  // horizontal) — não bloqueia, só informa.
  const tabsOverflowNotifiedRef = useRef(false);
  useEffect(() => {
    const totalTabs = 1 + dynamicTabs.length + (unallocatedCargoes.some(c => c.priority === 'urgent') ? 1 : 0);
    if (totalTabs > MAX_RESPONSIVE_TABS && !tabsOverflowNotifiedRef.current) {
      notify(
        `Quantidade de abas (${totalTabs}) ultrapassou o limite recomendado (${MAX_RESPONSIVE_TABS}). Use scroll horizontal ou reorganize as cargas em menos categorias para melhor responsividade.`,
        'warning',
      );
      tabsOverflowNotifiedRef.current = true;
    }
  }, [dynamicTabs.length, unallocatedCargoes, notify]);

  // Filtragem completa
  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return unallocatedCargoes.filter(c => {
      // Tab filter
      if (filterTab === 'priority' && c.priority !== 'urgent') return false;
      if (filterTab.startsWith('cat:')) {
        const cat = filterTab.slice(4);
        if ((c.category || 'OTHER') !== cat) return false;
      }

      // Busca: ID, descrição, manifesto (numeroAtendimento ou observations)
      if (!q) return true;
      const haystack = [
        c.identifier, c.description, c.category,
        c.destinoCarga, c.origemCarga,
        c.numeroAtendimento, c.observations,
        c.nomeEmbarcacao,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [unallocatedCargoes, deferredSearch, filterTab]);

  // Métricas
  const selectedIds = useMemo(() => Array.from(selectedCargos), [selectedCargos]);
  const selectedCount = selectedIds.length;
  const selectedWeight = useMemo(
    () => unallocatedCargoes.filter(c => selectedCargos.has(c.id)).reduce((s, c) => s + (c.weightTonnes || 0), 0),
    [unallocatedCargoes, selectedCargos]
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedCargos.has(c.id));

  // Contadores fixos
  const totalCount = unallocatedCargoes.length;
  const priorityCount = useMemo(
    () => unallocatedCargoes.filter(c => c.priority === 'urgent').length,
    [unallocatedCargoes]
  );

  // Resetar filterTab para 'all' se a categoria atual não existe mais
  useEffect(() => {
    if (filterTab === 'all' || filterTab === 'priority') return;
    if (filterTab.startsWith('cat:')) {
      const cat = filterTab.slice(4);
      if (!dynamicTabs.some(t => t.rawCategory === cat)) setFilterTab('all');
    }
  }, [filterTab, dynamicTabs]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleBack = () => {
    clearCargoSelection();
    navigate('/deck');
  };

  // Toda troca de aba feita pelo usuário também limpa a busca. Sem isso, o
  // operador trocava de aba com filtro residual e via "Nenhum resultado",
  // parecendo bug — quando na verdade era a busca da aba anterior aplicada.
  const handleTabChange = (tab: FilterTab) => {
    setFilterTab(tab);
    if (searchInput) setSearchInput('');
  };

  const handleSelectAll = () => {
    if (allFilteredSelected) clearCargoSelection();
    else selectMultipleCargos(filtered.map(c => c.id));
  };

  const handleEdit = (cargo: Cargo) => setEditingCargo(cargo);

  const handleDelete = async (cargo: Cargo) => {
    const ok = await ask('Excluir Carga', `Excluir "${cargo.identifier}" definitivamente?`);
    if (ok) {
      await deleteCargo(cargo.id);
      notify('Carga excluída.', 'success');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCount === 0) return;
    const ok = await ask(
      'Excluir Cargas Selecionadas',
      `Excluir permanentemente ${selectedCount} carga(s)? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;
    await deleteMultipleCargoes(selectedIds);
    notify(`${selectedCount} carga(s) excluída(s).`, 'success');
    clearCargoSelection();
  };

  // Mover/Prioridade agora vivem em cada CargoGridCard (botões inline,
  // sempre visíveis). Os handlers single abrem os mesmos modais de antes
  // — apenas o conjunto de IDs muda (1 carga em vez do batch).
  const handleMoveSingle = (cargo: Cargo) => {
    setActionIds([cargo.id]);
    setShowAllocate(true);
  };
  const handleChangePrioritySingle = (cargo: Cargo) => {
    setActionIds([cargo.id]);
    setShowPriority(true);
  };

  // ─── Container Inventory (DANFE) ────────────────────────────────────────

  const handleOpenInventory = async (cargo: Cargo) => {
    try {
      const ensured = await containerStore.ensureContainerRecord(cargo);
      setInventoryContainer(ensured);
    } catch {
      notify('Não foi possível abrir o inventário deste contentor.', 'error');
    }
  };

  /** Export PDF de um único container já hidratado (chamada a partir do
   *  inventário aberto). Bypassa o passo de ensureContainerRecord — o
   *  registro já existe porque o usuário abriu este inventário. */
  const handleExportSingleContainer = async (c: Container) => {
    try {
      const items = containerStore.getItemsByContainer(c.id);
      if (items.length === 0) {
        notify('Adicione ao menos 1 item antes de exportar.', 'warning');
        return;
      }
      const itemsByContainer = new Map<string, ReturnType<typeof containerStore.getItemsByContainer>>();
      itemsByContainer.set(c.id, items);

      // Resolve empresa via cargo.id === container.id (relação 1:1
      // estabelecida em ensureContainerRecord). Lookup direto no cargoStore.
      const empresaByContainer = new Map<string, string>();
      const cargoState = useCargoStore.getState();
      const allCargos: Cargo[] = [
        ...cargoState.unallocatedCargoes,
        ...cargoState.locations.flatMap(loc => loc.bays.flatMap(b => b.allocatedCargoes)),
      ];
      const matched = allCargos.find(cg => cg.id === c.id);
      if (matched?.empresa && matched.empresa.trim()) {
        empresaByContainer.set(c.id, matched.empresa.trim());
      }

      await PdfGeneratorService.executeContainersExport([c], itemsByContainer, empresaByContainer);
      notify('Relatório RMD gerado.', 'success');
    } catch (err) {
      reportException(err, {
        title: 'Falha ao gerar PDF do contentor',
        category: 'runtime',
        source: 'container-single-pdf-export',
      });
      notify('Não foi possível gerar o PDF.', 'error');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="flex-1 flex flex-col bg-main overflow-hidden relative">
      {/* Toolbar Header */}
      <div className="px-6 py-4 border-b-2 border-subtle bg-sidebar/50 shrink-0 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Boxes size={20} className="text-brand-primary" />
          </div>
          <div>
            <h1 className="text-base font-montserrat font-black text-primary tracking-tighter uppercase leading-none">Criação do Modal de Transporte</h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {/* Voltar ao Deck — mesmo design visual do botão GERAÇÃO MODAL do
              Sidebar (gradient brand-primary, ring pulsante, sweep no hover).
              Seta posicionada à DIREITA do label apontando pra frente:
              alinhamento com a posição do botão no canto direito da toolbar e
              com a noção de "avançar" para o deck. */}
          <button
            onClick={handleBack}
            title="Voltar ao Plano de Estivagem (Deck)"
            className="nav-cta relative flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-br from-brand-primary to-indigo-600 text-white rounded-2xl transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group cursor-pointer min-h-[48px] shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] overflow-hidden shrink-0"
          >
            <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-brand-primary/40 animate-ping opacity-30" />
            <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:left-full transition-[left] duration-700" />
            <span className="relative text-[11px] font-black uppercase tracking-[0.18em] whitespace-nowrap">Ver área de estiva</span>
            <span className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-white/15 group-hover:bg-white/25 group-hover:rotate-3 group-hover:translate-x-0.5 transition-[background-color,transform] duration-200">
              <ArrowRight size={14} />
            </span>
          </button>

        </div>
      </div>

      {/* Tabs de Filtragem */}
      <div
        className="relative px-6 py-3 border-b-2 border-subtle bg-main shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
        title="Arraste as abas de categoria para reordenar"
      >
        {/* Tab fixa: Todas */}
        {(() => {
          const active = filterTab === 'all';
          return (
            <button
              key="all"
              onClick={() => handleTabChange('all')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-[background-color,border-color,color,box-shadow,transform] duration-200 min-h-[40px] shrink-0',
                active
                  ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-sm'
                  : 'border-transparent text-secondary hover:text-primary hover:bg-sidebar'
              )}
            >
              <Layers size={13} />
              Todas
              <span className={cn(
                'inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-mono font-black tabular-nums shadow-sm',
                active ? 'bg-brand-primary text-white' : 'bg-subtle text-muted'
              )}>
                {totalCount}
              </span>
            </button>
          );
        })()}

        {/* Tabs dinâmicas: uma por categoria presente. Drag-and-drop horizontal
            permite reordenar (estilo planilha Excel). dnd-kit aplica transform
            CSS no SortableDynamicTab; ordem persiste em localStorage via
            `tabOrder` state. */}
        <DndContext sensors={tabSensors} collisionDetection={closestCenter} onDragEnd={handleTabDragEnd}>
          <SortableContext items={dynamicTabs.map(t => t.rawCategory)} strategy={horizontalListSortingStrategy}>
            {dynamicTabs.map(tab => (
              <SortableDynamicTab
                key={tab.rawCategory}
                id={tab.rawCategory}
                active={filterTab === tab.value}
                isHazardousTab={tab.rawCategory === 'HAZARDOUS'}
                label={tab.label}
                count={tab.count}
                Icon={tab.icon}
                onSelect={() => handleTabChange(tab.value)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Tab fixa: Prioridade Máxima — só aparece se houver urgentes */}
        {priorityCount > 0 && (() => {
          const active = filterTab === 'priority';
          return (
            <button
              key="priority"
              onClick={() => handleTabChange('priority')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border-2 transition-[background-color,border-color,color,box-shadow,transform] duration-200 min-h-[40px] shrink-0',
                active
                  ? 'border-status-error bg-status-error/10 text-status-error shadow-sm'
                  : 'border-transparent text-secondary hover:text-primary hover:bg-sidebar'
              )}
            >
              <Flame size={13} className={active ? '' : 'text-status-error'} />
              Prioridade Máxima
              <span className={cn(
                'inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-mono font-black tabular-nums shadow-sm',
                active ? 'bg-status-error text-white' : 'bg-subtle text-muted'
              )}>
                {priorityCount}
              </span>
            </button>
          );
        })()}

      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header do grid — Selecionar Tudo + Busca + ações de criação +
            Action Bar lado a lado. Renderiza sempre (não depende de
            unallocatedCargoes.length) porque os botões de criação precisam
            estar acessíveis mesmo com inventário vazio. Selecionar Tudo só
            aparece se a aba atual tem cargas; Action Bar só aparece quando
            há seleção em batch (empurrada à direita por ml-auto). */}
        <div className="flex items-center mb-4 gap-3 flex-wrap">
          {filtered.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-secondary hover:text-brand-primary hover:bg-sidebar border-2 border-subtle hover:border-brand-primary/40 transition-[background-color,border-color,color] duration-200 min-h-[36px]"
              title={allFilteredSelected ? 'Desmarcar tudo' : 'Selecionar tudo'}
            >
              {allFilteredSelected ? <CheckSquare size={13} /> : <Square size={13} />}
              {allFilteredSelected ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
              <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[9px] font-mono font-black tabular-nums bg-subtle text-muted">
                {filtered.length}
              </span>
            </button>
          )}

          <div className="relative w-[200px] sm:w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar ID, descrição, manifesto…"
              className="w-full bg-main border-2 border-subtle rounded-xl pl-9 pr-9 py-2 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-[background-color,border-color,color,box-shadow,transform] duration-200 min-h-[36px]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-sidebar text-muted hover:text-primary"
                title="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Ações de criação / movimentação em massa — migradas do toolbar
              header para o header do grid (logo após a busca). Mantém o
              fluxo de criação próximo do inventário que ele alimenta. */}
          <button
            onClick={() => setShowEditor(true)}
            title="Editor em Grade (Excel/CSV)"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap bg-main border-2 border-subtle hover:border-brand-primary/40 text-secondary hover:text-brand-primary transition-[background-color,border-color,color,box-shadow,transform] duration-200 min-h-[36px]"
          >
            <Table2 size={12} /> Criar Modal via Excel
          </button>
          <button
            onClick={() => setShowManual(true)}
            title="Criar modal manualmente"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap bg-brand-primary text-white hover:brightness-110 transition-[background-color,border-color,color,box-shadow,transform] duration-200 min-h-[36px] shadow-md"
          >
            <Plus size={12} /> Criar Modal Manualmente
          </button>
          <button
            onClick={() => setShowGroupMove(true)}
            title="Movimentar Cargas em Grupo (Alocadas + Não Alocadas)"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap text-white bg-[#1A237E] hover:brightness-110 shadow-md transition-[background-color,border-color,color,box-shadow,transform] duration-200 min-h-[36px]"
          >
            <Users size={12} />
            Movimentar Modais em Grupo
          </button>

          {selectedCount > 0 && (
            <div className="ml-auto flex items-center gap-2 pl-2 border-l-2 border-brand-primary/30 bg-main/40 rounded-r-xl py-1 pr-1 animate-in slide-in-from-right-2 fade-in duration-200">
              <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest">
                <span className="text-brand-primary font-mono">{selectedCount}</span>
                <span className="text-muted">·</span>
                <span className="text-status-success font-mono">{selectedWeight.toFixed(2)} t</span>
              </div>

              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-status-error/50 text-secondary hover:text-status-error transition-[background-color,border-color,color,box-shadow,transform] duration-200 min-h-[36px]"
                title="Excluir Selecionadas"
              >
                <Trash2 size={12} />
                Excluir
              </button>

              <button
                onClick={clearCargoSelection}
                className="p-2 rounded-lg text-muted hover:text-primary hover:bg-sidebar transition-[background-color,border-color,color,box-shadow,transform] duration-200 min-h-[36px]"
                title="Limpar seleção"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="w-24 h-24 rounded-full bg-sidebar border-2 border-subtle flex items-center justify-center mb-5 shadow-inner">
              <Package size={36} className="text-primary opacity-40" />
            </div>
            {unallocatedCargoes.length === 0 ? (
              <>
                <h3 className="text-lg font-black text-primary uppercase tracking-widest mb-3">
                  Nenhum Modal de Transporte no Inventário
                </h3>
                <p className="text-[13px] font-medium text-primary leading-relaxed opacity-80 max-w-md">
                  Use os botões acima para importar seus modais de transporte via Excel ou crie seus modais de transporte manualmente.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-black text-primary uppercase tracking-widest mb-3">
                  Nenhum resultado nesta aba
                </h3>
                <p className="text-[13px] font-medium text-primary leading-relaxed opacity-80 max-w-md">
                  Ajuste a aba ou a busca para encontrar suas cargas.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filtered.map((c, idx) => (
              <CargoGridCard
                key={c.id}
                cargo={c}
                selected={selectedCargos.has(c.id)}
                danfeItemCount={danfeCountByCargoId.get(c.id) ?? 0}
                /* Stagger limitado a 12 itens (480ms total) — grids grandes
                   não devem atrasar percepção do usuário. */
                enterDelayMs={Math.min(idx, 12) * 40}
                onToggle={toggleCargoSelection}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMove={handleMoveSingle}
                onChangePriority={handleChangePrioritySingle}
                onOpenInventory={handleOpenInventory}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      {showEditor && (
        <Suspense fallback={null}>
          <CargoEditorModal isOpen={showEditor} onClose={() => setShowEditor(false)} />
        </Suspense>
      )}
      <ManualCargoModal isOpen={showManual} onClose={() => setShowManual(false)} />
      <AllocateCargoModal
        isOpen={showAllocate}
        onClose={() => { setShowAllocate(false); setActionIds(null); }}
        selectedCargoIds={actionIds ?? selectedIds}
        onSuccess={() => { /* handled inside */ }}
      />
      <PriorityModal
        isOpen={showPriority}
        onClose={() => { setShowPriority(false); setActionIds(null); }}
        selectedCargoIds={actionIds ?? selectedIds}
      />
      <GroupMoveModal isOpen={showGroupMove} onClose={() => setShowGroupMove(false)} />
    </div>
    {/* Inventário DANFE — abre via "Alocar / Desalocar Itens" inline em
        qualquer carga-CONTAINER no CargoGridCard. */}
    {inventoryContainer && (
      <Suspense fallback={null}>
        <ContainerInventoryModal
          isOpen={!!inventoryContainer}
          container={inventoryContainer}
          onClose={() => setInventoryContainer(null)}
          onExportPdf={handleExportSingleContainer}
        />
      </Suspense>
    )}
    </>
  );
}
