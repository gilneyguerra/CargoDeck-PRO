import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { ArrowRight, Ship, Layers, Shuffle, Plus, Minus, X } from 'lucide-react';
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
    setSideCounts(prev => ({ ...prev, [side]: Math.max(0, prev[side] + delta) }));
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border border-subtle rounded-[2.5rem] w-full max-w-lg shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 z-50" />
        
        {/* Header Section (Fixed) */}
        <div className="px-8 pt-8 pb-6 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-7 right-8 text-muted hover:text-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none">Transfer Hub</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 bg-brand-primary/10 text-brand-primary rounded-lg text-[9px] font-black uppercase tracking-widest border border-brand-primary/20">
                       {selectedCount} item(s) selected
                    </span>
                </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
            <div className="space-y-8">
                {/* Destination Section */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest ml-1">
                        <Ship size={12} className="text-brand-primary" /> 1. Destination Port
                    </label>
                    <select
                        value={targetLocationId} onChange={e => setTargetLocationId(e.target.value)}
                        className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all appearance-none"
                    >
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name} ({loc.bays.length} bays)</option>
                        ))}
                    </select>
                </div>

                {/* Stowage Side Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest ml-1">
                            <Layers size={12} className="text-brand-primary" /> 2. Stowage Orientation
                        </label>
                        {selectedCount > 1 && (
                            <button 
                                onClick={() => setIsDistributingSides(!isDistributingSides)}
                                className={cn(
                                    "text-[9px] font-black px-3 py-1 rounded-lg transition-all border uppercase tracking-tighter",
                                    isDistributingSides ? "bg-indigo-600 border-indigo-600 text-white shadow-low" : "bg-sidebar border-subtle text-muted hover:border-brand-primary"
                                )}
                            >
                                {isDistributingSides ? 'Bulk Balance' : 'Single Side'}
                            </button>
                        )}
                    </div>

                    {!isDistributingSides ? (
                        <div className="grid grid-cols-3 gap-3">
                            {sideLabels.map(s => (
                                <button
                                    key={s.key} onClick={() => setTargetSide(s.key)}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all",
                                        targetSide === s.key ? "border-indigo-500 bg-indigo-500/5 text-indigo-600 shadow-medium" : "border-subtle text-muted hover:border-brand-primary/30"
                                    )}
                                >
                                    <span className="text-xl">{s.emoji}</span>
                                    <span className="text-[10px] font-black uppercase tracking-tighter">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-main/30 p-5 rounded-[1.5rem] border border-subtle space-y-4 shadow-inner">
                            <div className="grid grid-cols-3 gap-3">
                                {sideLabels.map(s => (
                                    <div key={s.key} className="flex flex-col items-center gap-2 p-3 bg-header rounded-xl border border-subtle shadow-low">
                                        <span className="text-[8px] font-black uppercase text-muted tracking-widest">{s.label}</span>
                                        <div className="flex items-center justify-between w-full">
                                            <button onClick={() => updateSideCount(s.key, -1)} className="p-1 hover:text-brand-primary transition-colors"><Minus size={14}/></button>
                                            <span className="text-xs font-black font-mono">{sideCounts[s.key]}</span>
                                            <button onClick={() => updateSideCount(s.key, 1)} className="p-1 hover:text-brand-primary transition-colors"><Plus size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", totalDistributed === selectedCount ? "bg-emerald-500 shadow-glow shadow-emerald-500/20 animate-pulse" : "bg-amber-500")} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">{totalDistributed} / {selectedCount} Allocated</span>
                                </div>
                                <button onClick={splitEvenly} className="text-[9px] font-black text-brand-primary hover:underline uppercase tracking-tighter">Split Evenly</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bay Distribution Section */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest ml-1">
                        <Shuffle size={12} className="text-brand-primary" /> 3. Layout Strategy
                    </label>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setDistributionMode('single-bay')}
                            className={cn(
                                "flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all",
                                distributionMode === 'single-bay' ? "border-indigo-500 bg-indigo-500/5 shadow-medium" : "border-subtle hover:border-brand-primary/30"
                            )}
                        >
                            <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", distributionMode === 'single-bay' ? "border-indigo-500" : "border-subtle")}>
                                {distributionMode === 'single-bay' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                            </div>
                            <div className="flex flex-col">
                                <p className="text-xs font-black text-primary uppercase tracking-tight leading-none">Concentrated</p>
                                <p className="text-[9px] font-bold text-muted uppercase tracking-tighter mt-1">Allocation in a unique specific bay</p>
                            </div>
                        </button>

                        {distributionMode === 'single-bay' && activeLoc && (
                            <select
                                value={targetBayId} onChange={e => setTargetBayId(e.target.value)}
                                className="ml-8 bg-sidebar border-2 border-subtle rounded-xl px-4 py-2.5 text-xs font-bold text-primary outline-none focus:border-brand-primary appearance-none transition-all"
                            >
                                {activeLoc.bays.map(bay => (
                                    <option key={bay.id} value={bay.id}>BAY {String(bay.number).padStart(2, '0')}</option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={() => setDistributionMode('distribute')}
                            className={cn(
                                "flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all",
                                distributionMode === 'distribute' ? "border-indigo-500 bg-indigo-500/5 shadow-medium" : "border-subtle hover:border-brand-primary/30"
                            )}
                        >
                            <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", distributionMode === 'distribute' ? "border-indigo-500" : "border-subtle")}>
                                {distributionMode === 'distribute' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                            </div>
                            <div className="flex flex-col">
                                <p className="text-xs font-black text-primary uppercase tracking-tight leading-none">Sequential Spread</p>
                                <p className="text-[9px] font-bold text-muted uppercase tracking-tighter mt-1">Spread across all available locale bays</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Section (Fixed) */}
        <div className="p-8 border-t border-subtle bg-sidebar/20 shrink-0 flex items-center justify-between gap-6">
            <button
                type="button" onClick={onClose}
                className="text-[10px] font-black text-muted hover:text-primary uppercase tracking-[0.2em] transition-colors"
            >
                Discard
            </button>
            <button
                onClick={handleConfirm}
                disabled={!targetLocationId || (distributionMode === 'single-bay' && !targetBayId) || !isDistributionValid}
                className="flex-1 bg-brand-primary text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/10 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-3"
            >
                <ArrowRight size={14} /> Execute Transfer
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
