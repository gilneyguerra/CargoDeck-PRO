import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { ArrowRight, Ship, Layers, Shuffle, Plus, Minus, Divide } from 'lucide-react';
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
  const { locations } = useCargoStore();

  const [targetLocationId, setTargetLocationId] = useState<string>('');
  const [targetBayId, setTargetBayId] = useState<string>('');
  const [targetSide, setTargetSide] = useState<Side>('center');
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('single-bay');
  const [isDistributingSides, setIsDistributingSides] = useState(false);
  const [sideCounts, setSideCounts] = useState({ port: 0, center: selectedCount, starboard: 0 });

  useEffect(() => {
    if (isOpen && locations.length > 0) {
      const firstLoc = locations[0];
      setTargetLocationId(firstLoc.id);
      setTargetBayId(firstLoc.bays[0]?.id ?? '');
      setDistributionMode('single-bay');
      setTargetSide('center');
      setIsDistributingSides(false);
      setSideCounts({ port: 0, center: selectedCount, starboard: 0 });
    }
  }, [isOpen, locations, selectedCount]);

  useEffect(() => {
    const loc = locations.find(l => l.id === targetLocationId);
    if (loc && loc.bays.length > 0) {
      setTargetBayId(loc.bays[0].id);
    }
  }, [targetLocationId, locations]);

  if (!isOpen) return null;

  const activeLoc = locations.find(l => l.id === targetLocationId);
  const totalDistributed = sideCounts.port + sideCounts.center + sideCounts.starboard;
  const isDistributionValid = !isDistributingSides || totalDistributed === selectedCount;

  const handleConfirm = () => {
    if (!targetLocationId || !isDistributionValid) return;
    const { batchMoveCargoesToSides } = useCargoStore.getState();
    const effectiveBayId = distributionMode === 'distribute' ? 'distribute' : targetBayId;
    
    if (isDistributingSides) {
      batchMoveCargoesToSides(selectedCargoIds, targetLocationId, effectiveBayId, sideCounts);
    } else {
      const counts = {
        port: targetSide === 'port' ? selectedCount : 0,
        center: targetSide === 'center' ? selectedCount : 0,
        starboard: targetSide === 'starboard' ? selectedCount : 0,
      };
      batchMoveCargoesToSides(selectedCargoIds, targetLocationId, effectiveBayId, counts);
    }
    
    onSuccess();
    onClose();
  };

  const updateSideCount = (side: Side, delta: number) => {
    setSideCounts(prev => {
      const newVal = Math.max(0, prev[side] + delta);
      return { ...prev, [side]: newVal };
    });
  };

  const splitEvenly = () => {
    const base = Math.floor(selectedCount / 3);
    const remainder = selectedCount % 3;
    setSideCounts({
      port: base + (remainder > 0 ? 1 : 0),
      center: base + (remainder > 1 ? 1 : 0),
      starboard: base
    });
  };

  const sideLabels: { key: Side; label: string; emoji: string; desc: string }[] = [
    { key: 'port', label: 'Bombordo', emoji: '⬅', desc: 'Lado esquerdo' },
    { key: 'center', label: 'Centro', emoji: '☰', desc: 'Faixa central' },
    { key: 'starboard', label: 'Boreste', emoji: '➡', desc: 'Lado direito' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Mover Cargas</h2>
              <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                {selectedCount} carga{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                <Layers className="w-3.5 h-3.5" />
                2. Lado da baia
              </label>
              {selectedCount > 1 && (
                <button 
                  onClick={() => setIsDistributingSides(!isDistributingSides)}
                  className={cn(
                    "text-[10px] font-black px-2 py-1 rounded-md transition-all border uppercase tracking-tighter",
                    isDistributingSides 
                      ? "bg-indigo-600 border-indigo-600 text-white" 
                      : "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-indigo-500 hover:text-indigo-500"
                  )}
                >
                  {isDistributingSides ? 'MODO INDIVIDUAL' : 'DISTRIBUIR BORDOS'}
                </button>
              )}
            </div>

            {!isDistributingSides ? (
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
                    <span className="text-[9px] opacity-60 uppercase font-black">{s.desc}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {sideLabels.map(s => (
                    <div
                      key={s.key}
                      className={cn(
                        "flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all bg-neutral-50 dark:bg-neutral-800/50",
                        sideCounts[s.key] > 0 ? "border-indigo-300 dark:border-indigo-700" : "border-neutral-200 dark:border-neutral-800"
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-tighter">{s.label}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          onClick={() => updateSideCount(s.key, -1)}
                          className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input 
                          type="number" 
                          value={sideCounts[s.key]}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setSideCounts(prev => ({ ...prev, [s.key]: val }));
                          }}
                          className="w-10 text-center bg-transparent font-bold text-sm focus:outline-none"
                        />
                        <button 
                          onClick={() => updateSideCount(s.key, 1)}
                          className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full border border-white/20",
                      totalDistributed === selectedCount ? "bg-emerald-500 animate-pulse" : totalDistributed > selectedCount ? "bg-red-500" : "bg-amber-500"
                    )} />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider",
                      totalDistributed === selectedCount ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"
                    )}>
                      {totalDistributed} de {selectedCount} CARGAS
                    </span>
                  </div>
                  <button onClick={splitEvenly} className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-tighter">
                    <Divide className="w-3 h-3" />
                    DIVIDIR IGUAL
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">
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
                  <p className="text-sm font-bold text-gray-800 dark:text-neutral-100">Baia específica</p>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">Todas as cargas em uma baia única</p>
                </div>
              </button>

              {distributionMode === 'single-bay' && activeLoc && (
                <select
                  value={targetBayId}
                  onChange={e => setTargetBayId(e.target.value)}
                  className="ml-7 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {activeLoc.bays.map(bay => (
                    <option key={bay.id} value={bay.id}>
                      BAIA {String(bay.number).padStart(2, '0')} — {bay.allocatedCargoes.length} CARGAS
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
                  <p className="text-sm font-bold text-gray-800 dark:text-neutral-100">Espalhar sequencialmente</p>
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">Distribuído por {activeLoc?.bays.length ?? 0} baias</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6 mt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            Discard
          </button>
          <button
            onClick={handleConfirm}
            disabled={!targetLocationId || (distributionMode === 'single-bay' && !targetBayId) || !isDistributionValid}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            Execute Transfer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
