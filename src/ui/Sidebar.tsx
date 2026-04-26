import { 
  Plus, Upload, Trash2, Box, Package, Anchor, Truck, Filter, 
  FileText, Zap, ChevronLeft, ChevronRight, X, User,
  MoveRight, ScanText, UploadCloud
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useRef, useState, useMemo } from 'react';
import DraggableCargo from './DraggableCargo';
import { useNotificationStore } from '@/features/notificationStore';
import { OCRConverterModal } from './OCRConverterModal';
import { cn } from '@/lib/utils';
import { metersToPixels } from '@/lib/scaling';
import { useDroppable } from '@dnd-kit/core';
import { ManualCargoModal } from './ManualCargoModal';
import { BatchMoveModal } from './BatchMoveModal';
import type { Cargo } from '@/domain/Cargo';

export default function Sidebar() {
  const { 
    unallocatedCargoes, manifestsLoaded, clearUnallocatedCargoes,
    deleteMultipleCargoes
  } = useCargoStore();

  const addNotification = useNotificationStore(state => state.addNotification);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'container' | 'equipment' | 'tubular' | 'basket'>('all');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedCargoIds, setSelectedCargoIds] = useState<Set<string>>(new Set());
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { setNodeRef } = useDroppable({
    id: 'inventory-sidebar',
  });

  // Filtros
  const filteredCargoes = useMemo(() => {
    if (activeTab === 'all') return unallocatedCargoes;
    return unallocatedCargoes.filter(c => {
      const type = (c.category || '').toLowerCase();
      if (activeTab === 'container') return type.includes('container') || type.includes('cont');
      if (activeTab === 'equipment') return type.includes('equipment') || type.includes('equi') || type.includes('skid') || type.includes('tanque');
      if (activeTab === 'tubular') return type.includes('tubular') || type.includes('riser') || type.includes('pipe') || type.includes('tubo');
      if (activeTab === 'basket') return type.includes('basket') || type.includes('cesta');
      return true;
    });
  }, [unallocatedCargoes, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    // Simulação ou chamada real de upload aqui
    setTimeout(() => setIsProcessing(false), 1500);
  };

  const toggleSelectAll = () => {
    if (selectedCargoIds.size === filteredCargoes.length) {
      setSelectedCargoIds(new Set());
    } else {
      setSelectedCargoIds(new Set(filteredCargoes.map(c => c.id)));
    }
  };

  const toggleSelectCargo = (id: string) => {
    const newSet = new Set(selectedCargoIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCargoIds(newSet);
  };

  return (
    <aside className="w-[340px] border-r border-subtle bg-sidebar flex flex-col shrink-0 h-full shadow-lg z-20">
        {/* Manifest Import Section */}
        <div className="p-6 border-b border-subtle bg-header/30">
            <h2 className="text-[10px] font-black text-muted mb-4 tracking-[0.15em] uppercase">Manifest Management</h2>
            <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  title="Importar Manifesto: Selecione o arquivo PDF original para extração inteligente de dados."
                  className={cn(
                    "w-full border-2 border-dashed rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-3 transition-all duration-300",
                    isProcessing 
                      ? "bg-brand-primary/5 border-brand-primary/30 cursor-not-allowed" 
                      : "bg-main/50 border-subtle hover:bg-main hover:border-brand-primary cursor-pointer group"
                  )}
                >
                    <div className="p-4 bg-brand-primary/10 rounded-3xl text-brand-primary group-hover:scale-110 transition-transform">
                      {isProcessing ? <Zap className="w-6 h-6 animate-pulse" /> : <Upload className="w-6 h-6" />}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-black text-primary uppercase tracking-widest leading-none mb-1">
                        {isProcessing ? 'Processando...' : 'Importar Manifesto'}
                      </span>
                      <span className="text-[9px] font-medium text-muted">Apenas arquivos .PDF</span>
                    </div>
                </button>
                
                <button 
                  onClick={() => setIsOCRModalOpen(true)}
                  title="Ferramenta OCR: Utilize para converter imagens ou PDFs escaneados em texto se a extração padrão falhar."
                  className="w-full mt-2 flex items-center justify-center gap-3 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-[0.98] border border-brand-primary/20 shadow-sm"
                >
                  <Zap className="w-5 h-5" /> FERRAMENTA DE CONVERSÃO OCR
                </button>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
        </div>

        {/* Filters and List */}
        <div className="p-4 border-b border-subtle">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Package size={16} />
                </div>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Inventory</span>
                <span className="bg-brand-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1">
                  {unallocatedCargoes.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                 {selectedCargoIds.size > 0 && (
                   <button 
                     onClick={() => setIsBatchMoveOpen(true)}
                     title="Mover em Lote: Alocar todas as cargas selecionadas para um destino comum."
                     className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black text-white bg-brand-primary hover:brightness-110 shadow-lg shadow-brand-primary/20 transition-all"
                   >
                     <MoveRight className="w-3 h-3" /> MOVER
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
                    title="Excluir Cargas: Remove as cargas selecionadas ou todas da lista do inventário."
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      selectedCargoIds.size > 0 ? "text-status-error bg-status-error/10" : "text-muted hover:text-status-error hover:bg-status-error/10 disabled:opacity-30"
                    )}
                 >
                    <Trash2 size={16} />
                 </button>
                 <button 
                   onClick={() => setIsManualModalOpen(true)}
                   title="Adicionar Manualmente: Crie uma nova carga personalizada preenchendo as dimensões e pesos."
                   className="p-2 text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all"
                 >
                   <Plus size={16} />
                 </button>
              </div>
           </div>

           <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
              <FilterButton active={activeTab === 'all'} count={unallocatedCargoes.length} label="Todos" onClick={() => setActiveTab('all')} icon={<Box size={12}/>} />
              <FilterButton active={activeTab === 'container'} count={unallocatedCargoes.filter(c => (c.category||'').toLowerCase().includes('cont')).length} label="Cont" onClick={() => setActiveTab('container')} icon={<Package size={12}/>} />
              <FilterButton active={activeTab === 'equipment'} count={unallocatedCargoes.filter(c => (c.category||'').toLowerCase().includes('equi')).length} label="Equip" onClick={() => setActiveTab('equipment')} icon={<Truck size={12}/>} />
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
                  <DraggableCargo cargo={cargo} />
                </div>
             </div>
           ))}
           {filteredCargoes.length === 0 && (
             <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <div className="p-6 bg-sidebar rounded-full mb-4">
                  <Anchor size={32} className="text-muted" />
                </div>
                <p className="text-xs font-bold text-muted uppercase tracking-widest">Nenhuma carga no inventário</p>
             </div>
           )}
        </div>

        <OCRConverterModal isOpen={isOCRModalOpen} onClose={() => setIsOCRModalOpen(false)} />
        <ManualCargoModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />
        <BatchMoveModal isOpen={isBatchMoveOpen} onClose={() => setIsBatchMoveOpen(false)} cargoIds={Array.from(selectedCargoIds)} />
    </aside>
  );
}

function FilterButton({ active, count, label, onClick, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-all border",
        active 
          ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20" 
          : "bg-sidebar text-muted border-subtle hover:bg-main hover:text-primary"
      )}
    >
      {icon}
      {label}
      <span className={cn("ml-1 font-bold", active ? "text-white/60" : "text-muted")}>{count}</span>
    </button>
  );
}
