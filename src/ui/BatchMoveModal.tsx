import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { ArrowRight, Ship, Layers, Shuffle, Plus, Minus, X } from 'lucide-react';

interface BatchMoveModalProps {
  isOpen: boolean; selectedCount: number; selectedCargoIds: string[]; onClose: () => void; onSuccess: () => void;
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
    if (loc && loc.bays.length > 0) setTargetBayId(loc.bays[0].id);
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
      const counts = { port: targetSide === 'port' ? selectedCount : 0, center: targetSide === 'center' ? selectedCount : 0, starboard: targetSide === 'starboard' ? selectedCount : 0 };
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
    setSideCounts({ port: base + (remainder > 0 ? 1 : 0), center: base + (remainder > 1 ? 1 : 0), starboard: base });
  };

  const sideLabels: { key: Side; label: string; emoji: string; desc: string }[] = [
    { key: 'port', label: 'Bombordo', emoji: '⬅', desc: 'Lado esquerdo' },
    { key: 'center', label: 'Centro', emoji: '☰', desc: 'Faixa central' },
    { key: 'starboard', label: 'Boreste', emoji: '➡', desc: 'Lado direito' },
  ];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border-2 border-subtle rounded-[2.5rem] w-full max-w-lg shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 glass">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 z-50" />
        
        {/* Header Section */}
        <div className="px-10 pt-10 pb-8 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-8 right-10 text-primary hover:text-indigo-600 p-2 hover:bg-main rounded-full transition-all">
                <X className="w-7 h-7" />
            </button>
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">Transfer Hub</h2>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-brand-primary/20">
                       {selectedCount} units for reallocation
                    </span>
                </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
            <div className="space-y-10">
                {/* Destination Section */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest ml-1">
                        <Ship size={16} className="text-brand-primary" /> 1. Operational Destination
                    </label>
                    <select
                        value={targetLocationId} onChange={e => setTargetLocationId(e.target.value)}
                        className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-brand-primary transition-all appearance-none shadow-inner"
                    >
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name} ({loc.bays.length} active bays)</option>
                        ))}
                    </select>
                </div>

                {/* Stowage Orientation Section */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest">
                            <Layers size={16} className="text-brand-primary" /> 2. Stowage Orientation
                        </label>
                        {selectedCount > 1 && (
                            <button 
                                onClick={() => setIsDistributingSides(!isDistributingSides)}
                                className={cn(
                                    "text-[10px] font-black px-4 py-1.5 rounded-xl transition-all border-2 uppercase tracking-tight",
                                    isDistributingSides ? "bg-indigo-600 border-indigo-600 text-white shadow-medium" : "bg-sidebar border-subtle text-primary hover:border-brand-primary"
                                )}
                            >
                                {isDistributingSides ? 'Balance Board' : 'Locked Side'}
                            </button>
                        )}
                    </div>

                    {!isDistributingSides ? (
                        <div className="grid grid-cols-3 gap-4">
                            {sideLabels.map(s => (
                                <button
                                    key={s.key} onClick={() => setTargetSide(s.key)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 py-5 rounded-[2rem] border-2 transition-all",
                                        targetSide === s.key ? "border-indigo-500 bg-indigo-500/5 text-indigo-600 shadow-medium" : "border-subtle text-secondary hover:border-brand-primary/40"
                                    )}
                                >
                                    <span className="text-2xl">{s.emoji}</span>
                                    <span className="text-[11px] font-black uppercase tracking-widest">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-main/50 p-6 rounded-[2.5rem] border-2 border-subtle space-y-6 shadow-inner">
                            <div className="grid grid-cols-3 gap-4">
                                {sideLabels.map(s => (
                                    <div key={s.key} className="flex flex-col items-center gap-3 p-4 bg-header rounded-2xl border-2 border-subtle shadow-low">
                                        <span className="text-[9px] font-black uppercase text-primary tracking-[0.15em] opacity-80">{s.label}</span>
                                        <div className="flex items-center justify-between w-full px-2">
                                            <button onClick={() => updateSideCount(s.key, -1)} className="p-1 box-content h-4 w-4 bg-sidebar rounded-full hover:bg-brand-primary hover:text-white transition-all"><Minus size={14} strokeWidth={3}/></button>
                                            <span className="text-sm font-black font-mono text-primary">{sideCounts[s.key]}</span>
                                            <button onClick={() => updateSideCount(s.key, 1)} className="p-1 box-content h-4 w-4 bg-sidebar rounded-full hover:bg-brand-primary hover:text-white transition-all"><Plus size={14} strokeWidth={3}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-subtle/30">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-3 h-3 rounded-full border-2 border-white/20", totalDistributed === selectedCount ? "bg-emerald-500 shadow-glow animate-pulse" : "bg-amber-500")} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">{totalDistributed} / {selectedCount} Units Balanced</span>
                                </div>
                                <button onClick={splitEvenly} className="text-[10px] font-black text-brand-primary hover:underline underline-offset-4 uppercase tracking-tighter">Automatic Split</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Strategy Section */}
                <div className="space-y-4">
                    <label className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest ml-1">
                        <Shuffle size={16} className="text-brand-primary" /> 3. Layout Strategy
                    </label>
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => setDistributionMode('single-bay')}
                            className={cn(
                                "flex items-center gap-5 px-6 py-5 rounded-[2rem] border-2 text-left transition-all",
                                distributionMode === 'single-bay' ? "border-indigo-500 bg-indigo-500/5 shadow-medium" : "border-subtle hover:border-brand-primary/40"
                            )}
                        >
                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 shadow-inner", distributionMode === 'single-bay' ? "border-indigo-500" : "border-subtle")}>
                                {distributionMode === 'single-bay' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-glow" />}
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-black text-primary uppercase tracking-tight leading-none">Concentrated Point</p>
                                <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter opacity-80 leading-none">Mandatory allocation in a specific physical bay</p>
                            </div>
                        </button>

                        {distributionMode === 'single-bay' && activeLoc && (
                            <select
                                value={targetBayId} onChange={e => setTargetBayId(e.target.value)}
                                className="ml-10 bg-sidebar border-2 border-brand-primary/20 rounded-xl px-5 py-3 text-xs font-black text-primary outline-none focus:border-brand-primary appearance-none transition-all shadow-inner"
                            >
                                {activeLoc.bays.map(bay => (
                                    <option key={bay.id} value={bay.id}>BAY ARCHITECTURE {String(bay.number).padStart(2, '0')}</option>
                                ))}
                            </select>
                        )}

                        <button
                            onClick={() => setDistributionMode('distribute')}
                            className={cn(
                                "flex items-center gap-5 px-6 py-5 rounded-[2rem] border-2 text-left transition-all",
                                distributionMode === 'distribute' ? "border-indigo-500 bg-indigo-500/5 shadow-medium" : "border-subtle hover:border-brand-primary/40"
                            )}
                        >
                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 shadow-inner", distributionMode === 'distribute' ? "border-indigo-500" : "border-subtle")}>
                                {distributionMode === 'distribute' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-glow" />}
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-black text-primary uppercase tracking-tight leading-none">Sequential Loading</p>
                                <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter opacity-80 leading-none">Automatic distribution spread across regional bays</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Section */}
        <div className="px-10 py-10 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-between gap-8">
            <button
                type="button" onClick={onClose}
                className="text-xs font-black text-secondary hover:text-primary uppercase tracking-[0.25em] transition-colors"
            >
                Abort Protocol
            </button>
            <button
                onClick={handleConfirm}
                disabled={!targetLocationId || (distributionMode === 'single-bay' && !targetBayId) || !isDistributionValid}
                className="flex-1 bg-brand-primary text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-4"
            >
                <ArrowRight size={18} /> Execute Spatial Transfer
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function cn(...classes: (string | boolean | undefined)[]) { return classes.filter(Boolean).join(' '); }
