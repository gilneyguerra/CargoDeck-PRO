import { 
  Plus, Upload, Trash2, Box, Package, Anchor, Truck, 
  Zap, MoveRight
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { usePDFUpload } from '../hooks/usePDFUpload';
import { useRef, useState, useMemo, type ChangeEvent } from 'react';
import DraggableCargo from './DraggableCargo';
import { useNotificationStore } from '@/features/notificationStore';
import { OCRConverterModal } from './OCRConverterModal';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { ManualCargoModal } from './ManualCargoModal';
import { BatchMoveModal } from './BatchMoveModal';

export default function Sidebar() {
  const { 
    unallocatedCargoes, clearUnallocatedCargoes,
    deleteMultipleCargoes, setEditingCargo, searchTerm,
    setExtractedCargoes 
  } = useCargoStore();

  const { upload, loading: isProcessing } = usePDFUpload();
  const notify = useNotificationStore(state => state.notify);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'container' | 'equipment' | 'tubular' | 'basket'>('all');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedCargoIds, setSelectedCargoIds] = useState<Set<string>>(new Set());
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);

  const { setNodeRef } = useDroppable({
    id: 'inventory-sidebar',
  });

  // Filtros combinados com Busca Global
  const filteredCargoes = useMemo(() => {
    let result = unallocatedCargoes;

    // 1. Filtro de Categorias lateral
    if (activeTab !== 'all') {
      result = result.filter(c => {
        const type = (c.category || '').toLowerCase();
        if (activeTab === 'container') return type.includes('container') || type.includes('cont');
        if (activeTab === 'equipment') return type.includes('equipment') || type.includes('equi') || type.includes('skid') || type.includes('tanque');
        if (activeTab === 'tubular') return type.includes('tubular') || type.includes('riser') || type.includes('pipe') || type.includes('tubo');
        if (activeTab === 'basket') return type.includes('basket') || type.includes('cesta');
        return true;
      });
    }

    // 2. Filtro de Busca Global
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.identifier || '').toLowerCase().includes(term) || 
        (c.description || '').toLowerCase().includes(term)
      );
    }

    return result;
  }, [unallocatedCargoes, activeTab, searchTerm]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    notify('Iniciando processamento cirúrgico do manifesto...', 'info');
    
    try {
      const items = await upload(file);
      
      if (items && items.length > 0) {
        // Mapeamento de CargoItem (Serviço) para Cargo (Domínio)
        const domainCargoes = items.map(item => ({
          id: item.id,
          identifier: item.identifier,
          description: item.description,
          weightTonnes: item.weight,
          widthMeters: item.width || 0,
          lengthMeters: item.length || 0,
          heightMeters: item.height || 2,
          quantity: 1,
          category: (item.tipoDetectado as any) || 'GENERAL',
          status: 'UNALLOCATED' as const,
          isBackload: item.isBackload,
          nomeEmbarcacao: item.nomeEmbarcacao,
          numeroAtendimento: item.numeroAtendimento,
          origemCarga: item.origemCarga,
          destinoCarga: item.destinoCarga,
          roteiroPrevisto: item.roteiroPrevisto,
          dataExtracao: item.dataExtracao,
          tamanhoFisico: item.tamanhoFisico,
          color: item.isBackload ? '#fca311' : '#3b82f6', // Amarelo para backload, azul para normal
          format: 'Retangular'
        }));

        setExtractedCargoes(domainCargoes as any);
        notify(`Manifesto processado! ${items.length} cargas carregadas no inventário.`, 'success');
      } else {
        notify('Manifesto processado, mas nenhuma carga válida foi identificada.', 'warning');
      }
    } catch (err) {
      notify('Falha crítica no processamento do manifesto.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelectCargo = (id: string) => {
    const newSet = new Set(selectedCargoIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCargoIds(newSet);
  };

  return (
    <aside className="w-[360px] border-r-[3px] border-brand-primary bg-sidebar flex flex-col shrink-0 h-full shadow-high z-20 font-sans">
        {/* Manifest Import Section */}
        <div className="p-2.5 border-b border-subtle bg-header/20">
            <h2 className="text-[11px] font-black text-secondary mb-5 tracking-[0.2em] uppercase opacity-90">Logistics Hub</h2>
            <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  title="Importar Manifesto"
                  className={cn(
                    "w-full border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-300",
                    isProcessing 
                      ? "bg-brand-primary/5 border-brand-primary/30 cursor-not-allowed" 
                      : "bg-main/30 border-strong/50 hover:bg-main hover:border-brand-primary cursor-pointer group shadow-low hover:shadow-medium"
                  )}
                >
                    <div className="p-5 bg-brand-primary/10 rounded-full text-brand-primary group-hover:scale-110 transition-transform shadow-low">
                      {isProcessing ? <Zap className="w-7 h-7 animate-pulse" /> : <Upload className="w-7 h-7" />}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black text-primary uppercase tracking-[0.1em] mb-1.5">
                        {isProcessing ? 'SCANNING DATA...' : 'UPLOAD MANIFEST'}
                      </span>
                      <span className="text-[10px] font-black text-secondary">Surgical PDF Processing</span>
                    </div>
                </button>
                
                <button 
                  onClick={() => setIsOCRModalOpen(true)}
                  title="Ferramenta OCR"
                  className="w-full mt-2 flex items-center justify-center gap-3 bg-main border border-subtle hover:border-brand-primary text-secondary hover:text-brand-primary px-6 py-4 rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all active:scale-[0.98] shadow-low hover:shadow-medium"
                >
                  <Zap className="w-5 h-5" /> <span className="text-primary">ADVANCED OCR CONVERTER</span>
                </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
        </div>

        {/* Filters and List - Refactored for Containment */}
        <div className="p-4 border-b border-subtle flex flex-col gap-4 overflow-hidden min-w-0">
           {/* Section Identity: Row 1 */}
           <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 shadow-sm flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                  <Package size={20} />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[11px] font-black text-primary uppercase tracking-widest truncate">Inventory</span>
                  <span className="text-[9px] font-bold text-secondary uppercase opacity-70">Ready for Loading</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <span className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                  {unallocatedCargoes.length}
                </span>
                <button 
                  onClick={() => setIsManualModalOpen(true)}
                  title="Novo Item"
                  className="p-2 text-secondary hover:text-brand-primary hover:bg-brand-primary/5 rounded-xl transition-all border border-transparent hover:border-brand-primary/20"
                >
                  <Plus size={18} />
                </button>
              </div>
           </div>

           {/* Operational Controls: Row 2 */}
           <div className="flex items-center justify-between bg-main/40 p-2.5 rounded-2xl border border-subtle/50 gap-2 shadow-inner">
                <button 
                  onClick={() => {
                    if (selectedCargoIds.size === unallocatedCargoes.length) setSelectedCargoIds(new Set());
                    else setSelectedCargoIds(new Set(unallocatedCargoes.map(c => c.id)));
                  }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0",
                    selectedCargoIds.size === unallocatedCargoes.length 
                      ? "bg-brand-primary border-brand-primary text-white shadow-low" 
                      : "bg-sidebar border-subtle text-secondary hover:border-brand-primary/40"
                  )}
                >
                  {selectedCargoIds.size === unallocatedCargoes.length ? 'DESMARCAR' : 'SELEC. TUDO'}
                </button>

                <div className="flex items-center gap-1.5 ml-auto">
                    {selectedCargoIds.size > 0 && (
                      <button 
                        onClick={() => setIsBatchMoveOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black text-white bg-indigo-600 hover:brightness-110 shadow-md shadow-indigo-500/20 transition-all shrink-0"
                      >
                        <MoveRight size={12} /> MOVER
                      </button>
                    )}
                    
                    <button 
                       onClick={() => {
                         if (selectedCargoIds.size > 0) {
                           deleteMultipleCargoes(Array.from(selectedCargoIds));
                           setSelectedCargoIds(new Set());
                         } else if (window.confirm('Excluir todas as cargas não alocadas?')) {
                           clearUnallocatedCargoes();
                         }
                       }}
                       disabled={unallocatedCargoes.length === 0}
                       className={cn(
                         "p-2 rounded-xl transition-all duration-300",
                         selectedCargoIds.size > 0 
                          ? "text-white bg-status-error shadow-md shadow-red-500/20" 
                          : "text-secondary hover:text-status-error hover:bg-status-error/10 disabled:opacity-30"
                       )}
                    >
                       <Trash2 size={18} />
                    </button>
                </div>
           </div>

           <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
              <FilterButton active={activeTab === 'all'} count={unallocatedCargoes.length} label="Todos" onClick={() => setActiveTab('all')} icon={<Box size={12}/>} />
              <FilterButton active={activeTab === 'container'} count={unallocatedCargoes.filter(c => (c.category||'').toLowerCase().includes('cont')).length} label="Cont" onClick={() => setActiveTab('container')} icon={<Package size={12}/>} />
              <FilterButton active={activeTab === 'equipment'} count={unallocatedCargoes.filter(c => (c.category||'').toLowerCase().includes('equi')).length} label="Equip" onClick={() => setActiveTab('equipment')} icon={<Truck size={12}/>} />
              <FilterButton active={activeTab === 'tubular'} count={unallocatedCargoes.filter(c => {
                const type = (c.category || '').toLowerCase();
                return type.includes('tubular') || type.includes('riser') || type.includes('pipe') || type.includes('tubo');
              }).length} label="Tub" onClick={() => setActiveTab('tubular')} icon={<Anchor size={12}/>} />
           </div>
        </div>

        {/* Scrollable Cargo List */}
        <div ref={setNodeRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-main/20 no-scrollbar">
           {filteredCargoes.map(cargo => (
             <div key={cargo.id} className="relative group/cargo">
                <div className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 z-20 transition-opacity",
                  selectedCargoIds.has(cargo.id) ? "opacity-100" : "opacity-0 group-hover/cargo:opacity-100"
                )}>
                   <input 
                     type="checkbox" 
                     checked={selectedCargoIds.has(cargo.id)}
                     onChange={() => toggleSelectCargo(cargo.id)}
                     className="w-4 h-4 rounded border-subtle text-brand-primary focus:ring-brand-primary cursor-pointer"
                   />
                </div>
                <div className={cn("transition-transform", selectedCargoIds.has(cargo.id) && "translate-x-6")}>
                  <DraggableCargo 
                    cargo={cargo} 
                    onEdit={setEditingCargo}
                    selectable={true}
                    isSelected={selectedCargoIds.has(cargo.id)}
                    onToggleSelect={toggleSelectCargo}
                  />
                </div>
             </div>
           ))}
           {filteredCargoes.length === 0 && (
             <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="p-6 bg-sidebar rounded-full mb-4">
                  <Anchor size={32} className="text-secondary" />
                </div>
                <p className="text-xs font-black text-secondary uppercase tracking-widest">Nenhuma carga no inventário</p>
             </div>
           )}
        </div>

        <OCRConverterModal isOpen={isOCRModalOpen} onClose={() => setIsOCRModalOpen(false)} />
        <ManualCargoModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />
        <BatchMoveModal 
          isOpen={isBatchMoveOpen} 
          onClose={() => setIsBatchMoveOpen(false)} 
          selectedCargoIds={Array.from(selectedCargoIds)} 
          selectedCount={selectedCargoIds.size}
          onSuccess={() => {
            setSelectedCargoIds(new Set());
            notify('Cargas movidas com sucesso!', 'success');
          }}
        />
    </aside>
  );
}

function FilterButton({ active, count, label, onClick, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-extrabold uppercase tracking-tight whitespace-nowrap transition-all border shadow-low",
        active 
          ? "bg-brand-primary text-white border-brand-primary scale-105 z-10" 
          : "bg-main border-subtle text-primary hover:text-brand-primary hover:border-brand-primary"
      )}
    >
      {icon}
      {label}
      <span className={cn("ml-1 font-black px-1.5 py-px rounded-md bg-sidebar/50", active ? "text-white" : "text-brand-primary")}>{count}</span>
    </button>
  );
}
