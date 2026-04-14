import { useState, useEffect } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { ArrowRight, Ship, Layers, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchMoveModalProps {
  isOpen: boolean;
  selectedCount: number;
  selectedCargoIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

type Side = 'port' | 'center' | 'starboard';
type DistributionMode = 'single-bay' | 'distribute';

export function BatchMoveModal({ isOpen, selectedCount, selectedCargoIds, onClose, onSuccess }: BatchMoveModalProps) {
  const { locations, batchMoveCargoes } = useCargoStore();

  const [targetLocationId, setTargetLocationId] = useState<string>('');
  const [targetBayId, setTargetBayId] = useState<string>('');
  const [targetSide, setTargetSide] = useState<Side>('center');
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('single-bay');

  // Set default location on open
  useEffect(() => {
    if (isOpen && locations.length > 0) {
      const firstLoc = locations[0];
      setTargetLocationId(firstLoc.id);
      setTargetBayId(firstLoc.bays[0]?.id ?? '');
      setDistributionMode('single-bay');
      setTargetSide('center');
    }
  }, [isOpen, locations]);

  // Update default bay when location changes
  useEffect(() => {
    const loc = locations.find(l => l.id === targetLocationId);
    if (loc && loc.bays.length > 0) {
      setTargetBayId(loc.bays[0].id);
    }
  }, [targetLocationId, locations]);

  if (!isOpen) return null;

  const activeLoc = locations.find(l => l.id === targetLocationId);

  const handleConfirm = () => {
    if (!targetLocationId) return;
    const effectiveBayId = distributionMode === 'distribute' ? 'distribute' : targetBayId;
    batchMoveCargoes(selectedCargoIds, targetLocationId, effectiveBayId, targetSide);
    onSuccess();
    onClose();
  };

  const sideLabels: { key: Side; label: string; emoji: string; desc: string }[] = [
    { key: 'port', label: 'Bombordo', emoji: '⬅', desc: 'Lado esquerdo' },
    { key: 'center', label: 'Centro', emoji: '☰', desc: 'Faixa central' },
    { key: 'starboard', label: 'Boreste', emoji: '➡', desc: 'Lado direito' },
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Mover Cargas</h2>
              <p className="text-indigo-200 text-sm">
                {selectedCount} carga{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Step 1: Location */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
              <Ship className="w-3.5 h-3.5" />
              1. Local de destino
            </label>
            <select
              value={targetLocationId}
              onChange={e => setTargetLocationId(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.bays.length} baias)
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Side */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
              <Layers className="w-3.5 h-3.5" />
              2. Lado da baia
            </label>
            <div className="grid grid-cols-3 gap-2">
              {sideLabels.map(s => (
                <button
                  key={s.key}
                  onClick={() => setTargetSide(s.key)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                    targetSide === s.key
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shadow-md scale-[1.03]"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-indigo-300 dark:hover:border-indigo-700"
                  )}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span className="text-[11px] font-bold">{s.label}</span>
                  <span className="text-[9px] opacity-60">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Distribution */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
              <Shuffle className="w-3.5 h-3.5" />
              3. Distribuição entre baias
            </label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setDistributionMode('single-bay')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all",
                  distributionMode === 'single-bay'
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  distributionMode === 'single-bay' ? "border-indigo-500" : "border-neutral-400"
                )}>
                  {distributionMode === 'single-bay' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-neutral-100">Baia específica</p>
                  <p className="text-xs text-neutral-500">Todas as cargas vão para uma baia escolhida</p>
                </div>
              </button>

              {distributionMode === 'single-bay' && activeLoc && (
                <select
                  value={targetBayId}
                  onChange={e => setTargetBayId(e.target.value)}
                  className="ml-7 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {activeLoc.bays.map(bay => (
                    <option key={bay.id} value={bay.id}>
                      Baia {String(bay.number).padStart(2, '0')} — {bay.allocatedCargoes.length} carga(s) atualmente
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => setDistributionMode('distribute')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all",
                  distributionMode === 'distribute'
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/20"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                  distributionMode === 'distribute' ? "border-indigo-500" : "border-neutral-400"
                )}>
                  {distributionMode === 'distribute' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-neutral-100">Distribuir entre baias</p>
                  <p className="text-xs text-neutral-500">Cargas distribuídas sequencialmente pelas {activeLoc?.bays.length ?? 0} baias</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!targetLocationId || (distributionMode === 'single-bay' && !targetBayId)}
            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Mover {selectedCount} carga{selectedCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
