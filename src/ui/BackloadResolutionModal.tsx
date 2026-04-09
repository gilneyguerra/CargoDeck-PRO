import { useState, useMemo } from 'react';
import { X, Trash2, CheckCircle, AlertCircle, LogOut, Search } from 'lucide-react';
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
  const allCargoOnBoard = useMemo(() => {
    return isOpen ? getAllCargo() : [];
  }, [getAllCargo, isOpen]);
  
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Cruzamento de dados: busca cargos à bordo que dão match com os extraídos
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
      
      for (const id of matchesToDelete) {
        await deleteCargo(id);
      }
      
      setDeletedIds(prev => {
        const next = new Set(prev);
        matchesToDelete.forEach(id => next.add(id));
        return next;
      });
      
      alert(`Foram desembarcadas as cargas listadas abaixo:\n\n${logDetails}`);
      logger.info(`Remoção automática de ${matchesToDelete.length} cargas de backload realizada.`);
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

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-400 dark:border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2 rounded-lg shadow-lg shadow-amber-500/20">
              <LogOut size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-none mb-1">Resolução de Backload</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Identificamos {extractedBackloads.length} itens de desembarque no manifesto.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {foundMatches.length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle size={14} /> Correspondências Encontradas
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">Estas cargas estão à bordo e foram identificadas para remoção.</p>
                </div>
                <button 
                  onClick={handleDeleteAllMatches}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Trash2 size={14} /> DELETAR TODAS DA EMBARCAÇÃO
                </button>
              </div>

              <div className="space-y-2">
                {foundMatches.map(item => (
                  <div key={item.backload.id} className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg p-3 flex justify-between items-center group hover:border-emerald-500/50 transition-colors shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-gray-800 dark:text-neutral-100">{item.backload.identifier}</span>
                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500">{item.backload.weightTonnes.toFixed(1)}t</span>
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-500 truncate">{item.backload.description}</div>
                    </div>
                    <div className="text-right ml-4">
                      <button 
                        onClick={() => handleManualDelete(item.onboardMatch!.id)}
                        className="text-red-500 hover:text-red-400 p-2 rounded-full hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all font-bold"
                        title="Remover apenas esta carga"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {missingCount > 0 && (
            <div>
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Search size={14} /> Itens Não Localizados à Bordo
              </h3>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-4 flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Estes itens constam como desembarque no manifesto, mas não foram encontrados no estoque atual. Verifique se o código identificador está correto ou se foram cadastrados em viagens anteriores.
                </p>
              </div>
              <div className="space-y-2 opacity-70">
                {resolutionItems.filter(item => !item.isFound).map(item => (
                  <div key={item.backload.id} className="bg-neutral-200/50 dark:bg-neutral-800/30 border border-neutral-300 dark:border-neutral-800/50 rounded-lg p-3 flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-neutral-600 dark:text-neutral-400">{item.backload.identifier}</span>
                        <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500 italic">Pendente</span>
                      </div>
                      <div className="text-xs text-neutral-500 truncate">{item.backload.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {foundMatches.length === 0 && missingCount === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="bg-emerald-500/10 p-4 rounded-full">
                <CheckCircle className="text-emerald-500" size={48} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Concluído!</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">Não restam mais cargas de backload pendentes de resolução.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-300 dark:border-neutral-800 bg-neutral-200/30 dark:bg-neutral-900/40 flex justify-between items-center">
          <div className="flex gap-4">
             <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 font-bold uppercase">Deletados</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{resolvedCount}</span>
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 font-bold uppercase">Pendentes</span>
                <span className="text-lg font-bold text-amber-500">{missingCount}</span>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            CONCLUIR RESOLUÇÃO
          </button>
        </div>

      </div>
    </div>
  );
}
