import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import type { Cargo } from '@/domain/Cargo';
import { logger } from '../utils/logger';

interface BackloadResolutionModalProps {
  isOpen: boolean; onClose: () => void; extractedBackloads: Cargo[];
}

export function BackloadResolutionModal({ isOpen, onClose, extractedBackloads }: BackloadResolutionModalProps) {
  const { getAllCargo, deleteCargo } = useCargoStore();
  const allCargoOnBoard = useMemo(() => isOpen ? getAllCargo() : [], [getAllCargo, isOpen]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const resolutionItems = useMemo(() => {
    return extractedBackloads.map(backload => {
      const onboardMatch = allCargoOnBoard.find(ob => 
        ob.identifier.trim().toUpperCase() === backload.identifier.trim().toUpperCase() &&
        ob.description.trim().toUpperCase() === backload.description.trim().toUpperCase()
      );
      return { backload, onboardMatch, isFound: !!onboardMatch, isResolved: onboardMatch ? deletedIds.has(onboardMatch.id) : false };
    });
  }, [extractedBackloads, allCargoOnBoard, deletedIds]);

  const foundMatches = resolutionItems.filter(item => item.isFound && !item.isResolved);
  const resolvedCount = deletedIds.size;
  const missingCount = resolutionItems.filter(item => !item.isFound).length;

  if (!isOpen) return null;

  const handleDeleteAllMatches = async () => {
    setIsProcessing(true);
    try {
      const currentMatches = foundMatches.filter(item => item.onboardMatch);
      const matchesToDelete = currentMatches.map(item => item.onboardMatch!.id);
      const logDetails = currentMatches.map(item => `• ${item.backload.identifier} - ${item.backload.description}`).join('\n');
      for (const id of matchesToDelete) await deleteCargo(id);
      setDeletedIds(prev => { const next = new Set(prev); matchesToDelete.forEach(id => next.add(id)); return next; });
      alert(`Protocolo concluído: As seguintes cargas foram desembarcadas:\n\n${logDetails}`);
    } catch (err) { logger.error('Erro na remoção automática de backload:', err); } finally { setIsProcessing(false); }
  };

  const handleManualDelete = async (cargoId: string) => {
    try {
      await deleteCargo(cargoId);
      setDeletedIds(prev => { const next = new Set(prev); next.add(cargoId); return next; });
    } catch (err) { logger.error('Erro na remoção manual de backload:', err); }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border-2 border-subtle rounded-[3rem] w-full max-w-3xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 z-50 shadow-glow shadow-orange-500/20" />
        
        {/* Header Section */}
        <div className="px-10 pt-10 pb-8 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-7 right-10 text-primary hover:text-amber-600 p-2 hover:bg-main rounded-full transition-all">
                <X className="w-7 h-7" />
            </button>
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">Reconciliação de Backload</h2>
                <div className="flex items-center gap-3">
                    <span className="px-4 py-1.5 bg-amber-500/10 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-amber-500/20">
                       Manifesto de Desembarque: {extractedBackloads.length} Itens
                    </span>
                </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
            <div className="space-y-10">
                {foundMatches.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <CheckCircle size={14} /> Cargas Confirmadas a Bordo
                                </h3>
                                <p className="text-[10px] font-bold text-secondary uppercase tracking-tight mt-2 opacity-80 leading-none">Cargas do manifesto localizadas no inventário da embarcação</p>
                            </div>
                            <button 
                                onClick={handleDeleteAllMatches}
                                disabled={isProcessing}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black px-6 py-3 rounded-2xl shadow-xl shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-3 transition-all active:scale-95 uppercase tracking-widest"
                            >
                                <Trash2 size={16} /> DESEMBARCAR TODAS
                            </button>
                        </div>

                        <div className="space-y-3">
                            {foundMatches.map(item => (
                                <div key={item.backload.id} className="bg-main/50 border-2 border-subtle rounded-[2.5rem] p-6 flex justify-between items-center group hover:border-emerald-500/40 transition-all shadow-inner">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono text-sm font-black text-primary">{item.backload.identifier}</span>
                                            <span className="text-[9px] font-black bg-sidebar px-3 py-1 rounded-lg text-primary border-2 border-subtle uppercase tracking-widest shadow-low">{item.backload.weightTonnes.toFixed(2)}t</span>
                                        </div>
                                        <div className="text-xs font-bold text-secondary uppercase tracking-tight truncate mt-2 leading-none opacity-90">{item.backload.description}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleManualDelete(item.onboardMatch!.id)}
                                        className="text-status-error p-3 bg-status-error/5 hover:bg-status-error/10 border-2 border-status-error/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all shadow-low"
                                        title="Remover Carga"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {missingCount > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                            <Search size={14} /> Discrepâncias no Manifesto
                        </h3>
                        <div className="bg-amber-500/5 border-2 border-amber-500/30 rounded-[2.5rem] p-8 flex gap-6 shadow-inner">
                            <AlertCircle className="text-amber-500 shrink-0" size={32} />
                            <div className="space-y-2">
                                <p className="text-[11px] text-amber-900 font-black uppercase leading-relaxed tracking-widest">Anomalia de Identificação Detectada</p>
                                <p className="text-[10px] text-amber-800/80 font-bold uppercase leading-relaxed tracking-tight">
                                    Itens abaixo presentes no manifesto não foram localizados no inventário atual. Verifique os identificadores ou os registros históricos de armazenagem.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3 p-4 rounded-[2.5rem] bg-sidebar/40 border-2 border-subtle/50 shadow-inner">
                            {resolutionItems.filter(item => !item.isFound).map(item => (
                                <div key={item.backload.id} className="bg-main/30 border-2 border-subtle/40 rounded-2xl p-4 flex justify-between items-center opacity-80">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs font-black text-primary/70">{item.backload.identifier}</span>
                                            <span className="text-[8px] font-black bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-500/20 uppercase tracking-[0.2em]">Pendente</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-secondary uppercase tracking-tight truncate mt-1 opacity-60">{item.backload.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {foundMatches.length === 0 && missingCount === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
                        <div className="p-10 bg-emerald-500/10 rounded-full border-2 border-emerald-500/30 shadow-glow shadow-emerald-500/10 scale-125">
                            <CheckCircle className="text-emerald-500" size={64} />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-4xl font-black text-primary uppercase tracking-tighter">Inventário Reconciliado</h3>
                            <p className="text-[11px] font-bold text-secondary uppercase tracking-[0.4em] max-w-sm opacity-80">Todos os protocolos de desembarque foram sincronizados com sucesso.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer Section */}
        <div className="px-10 py-6 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-between gap-10">
            <div className="flex gap-12">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-secondary font-black uppercase tracking-[0.2em] opacity-80">Processadas</span>
                    <span className="text-4xl font-black text-emerald-600 leading-none tracking-tighter">{resolvedCount}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-secondary font-black uppercase tracking-[0.2em] opacity-80">Não Localizadas</span>
                    <span className="text-4xl font-black text-amber-500 leading-none tracking-tighter">{missingCount}</span>
                </div>
            </div>
            <button 
                onClick={onClose}
                className="flex-1 bg-brand-primary text-white py-6 rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-primary/25 hover:brightness-110 active:scale-95 transition-all"
            >
                CONCLUIR
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

