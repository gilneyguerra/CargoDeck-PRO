import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import type { Cargo } from '@/domain/Cargo';
import { logger } from '../utils/logger';

interface BackloadResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedBackloads: Cargo[];
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
      return {
        backload,
        onboardMatch,
        isFound: !!onboardMatch,
        isResolved: onboardMatch ? deletedIds.has(onboardMatch.id) : false
      };
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
      
      setDeletedIds(prev => {
        const next = new Set(prev);
        matchesToDelete.forEach(id => next.add(id));
        return next;
      });
      alert(`Foram desembarcadas as cargas listadas abaixo:\n\n${logDetails}`);
    } catch (err) {
      logger.error('Erro na remoção automática de backload:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualDelete = async (cargoId: string) => {
    try {
      await deleteCargo(cargoId);
      setDeletedIds(prev => {
        const next = new Set(prev);
        next.add(cargoId);
        return next;
      });
    } catch (err) {
      logger.error('Erro na remoção manual de backload:', err);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border border-subtle rounded-[2.5rem] w-full max-w-2xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 z-50" />
        
        {/* Header Section (Fixed) */}
        <div className="px-8 pt-8 pb-6 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-7 right-8 text-muted hover:text-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none">Backload Reconciliation</h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                       {extractedBackloads.length} items identifed in manifest
                    </span>
                </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
            <div className="space-y-8">
                {foundMatches.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <CheckCircle size={12} /> Confirmed Matches
                                </h3>
                                <p className="text-[9px] font-bold text-muted uppercase tracking-tighter mt-1">On-board items ready for discharge protocol</p>
                            </div>
                            <button 
                                onClick={handleDeleteAllMatches}
                                disabled={isProcessing}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95 uppercase tracking-widest"
                            >
                                <Trash2 size={12} /> Batch Discharge
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {foundMatches.map(item => (
                                <div key={item.backload.id} className="bg-main/40 border border-subtle rounded-2xl p-4 flex justify-between items-center group hover:border-emerald-500/30 transition-all shadow-inner">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs font-black text-primary">{item.backload.identifier}</span>
                                            <span className="text-[8px] font-black bg-sidebar px-2 py-0.5 rounded-md text-muted border border-subtle uppercase tracking-widest">{item.backload.weightTonnes.toFixed(1)}t</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-muted uppercase tracking-tight truncate mt-1">{item.backload.description}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleManualDelete(item.onboardMatch!.id)}
                                        className="text-status-error p-2 rounded-xl hover:bg-status-error/10 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove specific unit"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {missingCount > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Search size={12} /> Unresolved Discrepancies
                        </h3>
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-4">
                            <AlertCircle className="text-amber-500 shrink-0" size={20} />
                            <p className="text-[10px] text-amber-700/80 font-bold uppercase leading-relaxed tracking-tight">
                                These manifest items were not found in current inventory. Please verify identifier integrity or check historical storage.
                            </p>
                        </div>
                        <div className="space-y-2 shadow-inner p-2 rounded-2xl bg-sidebar/20">
                            {resolutionItems.filter(item => !item.isFound).map(item => (
                                <div key={item.backload.id} className="bg-main/20 border border-subtle/50 rounded-xl p-3 flex justify-between items-center opacity-70">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-black text-muted">{item.backload.identifier}</span>
                                            <span className="text-[7px] font-black bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/10 uppercase tracking-[0.2em]">Pending</span>
                                        </div>
                                        <div className="text-[9px] font-bold text-muted/60 uppercase tracking-tight truncate mt-0.5">{item.backload.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {foundMatches.length === 0 && missingCount === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                        <div className="p-6 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-glow shadow-emerald-500/10">
                            <CheckCircle className="text-emerald-500" size={48} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-primary uppercase tracking-tighter">Manifest Resolved</h3>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest max-w-xs">All backload procedures have been synchronized with the master inventory.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer Section (Fixed) */}
        <div className="p-8 border-t border-subtle bg-sidebar/20 shrink-0 flex items-center justify-between gap-8">
            <div className="flex gap-8">
                <div className="flex flex-col">
                    <span className="text-[8px] text-muted font-black uppercase tracking-widest">Discharged</span>
                    <span className="text-2xl font-black text-emerald-600 leading-tight">{resolvedCount}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] text-muted font-black uppercase tracking-widest">Awaiting</span>
                    <span className="text-2xl font-black text-amber-500 leading-tight">{missingCount}</span>
                </div>
            </div>
            <button 
                onClick={onClose}
                className="flex-1 bg-brand-primary text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/10 hover:brightness-110 active:scale-95 transition-all"
            >
                Finalize Resolution
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
