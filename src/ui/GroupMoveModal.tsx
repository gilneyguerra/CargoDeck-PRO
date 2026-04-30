// src/ui/GroupMoveModal.tsx
import { useState, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Search, CheckCircle2, AlertTriangle, Scale,
    Users, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useStabilityCalculation } from '@/hooks/useStabilityCalculation';
import { useCargoMovement } from '@/hooks/useCargoMovement';
import { useNotificationStore } from '@/features/notificationStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Cargo } from '@/domain/Cargo';
import { cn } from '@/lib/utils';

// ─── StabilityGauge ─────────────────────────────────────────────────────────

interface GaugeProps {
    pesoBombordo: number;
    pesoBoreste: number;
    diffPercent: number;
    status: 'OK' | 'WARNING' | 'CRITICAL';
}

function StabilityGauge({ pesoBombordo, pesoBoreste, diffPercent, status }: GaugeProps) {
    const barColor  = status === 'OK' ? 'bg-emerald-500' : status === 'WARNING' ? 'bg-amber-500' : 'bg-red-600';
    const textColor = status === 'OK' ? 'text-emerald-600 dark:text-emerald-400' : status === 'WARNING' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
    const label     = status === 'OK' ? 'Estável' : status === 'WARNING' ? 'Atenção' : 'Bloqueado — Desequilíbrio crítico';
    const Icon      = status === 'OK' ? CheckCircle2 : AlertTriangle;

    return (
        <div className="p-4 rounded-xl border border-subtle bg-main space-y-3">
            <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-secondary" />
                <span className="text-xs font-black text-muted uppercase tracking-widest">Estabilidade Transversal</span>
            </div>

            {/* Barra de desequilíbrio */}
            <div className="relative h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${Math.min(diffPercent * 10, 100)}%` }}
                />
            </div>

            {/* Pesos por bordo */}
            <div className="flex justify-between text-[11px] font-bold text-secondary">
                <span>Bombordo: {pesoBombordo.toFixed(2)} t</span>
                <span className={cn('font-black', textColor)}>Δ {diffPercent.toFixed(1)}%</span>
                <span>Boreste: {pesoBoreste.toFixed(2)} t</span>
            </div>

            {/* Status */}
            <div className={cn('flex items-center gap-1.5 text-xs font-black', textColor)}>
                <Icon className="w-3.5 h-3.5" />
                {label}
            </div>
        </div>
    );
}

// ─── CargoCard ───────────────────────────────────────────────────────────────

interface CardProps {
    cargo: Cargo;
    selected: boolean;
    onToggle: (id: string) => void;
    currentLocation: string;
}

function CargoCard({ cargo, selected, onToggle, currentLocation }: CardProps) {
    return (
        <div
            role="checkbox"
            aria-checked={selected}
            tabIndex={0}
            onClick={() => onToggle(cargo.id)}
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') onToggle(cargo.id); }}
            className={cn(
                'relative p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
                'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary/40',
                selected
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
        >
            {/* Checkbox */}
            <div
                className={cn(
                    'absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                    selected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'
                )}
            >
                {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>

            <p className="font-black text-sm text-primary pr-8 leading-tight">{cargo.identifier}</p>
            <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">{cargo.description}</p>

            <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-secondary">
                <span>{cargo.lengthMeters}×{cargo.widthMeters}×{(cargo.heightMeters ?? 0).toFixed(1)} m</span>
                <span className="font-bold text-primary">{cargo.weightTonnes.toFixed(2)} t</span>
            </div>

            <p className="text-[10px] text-muted mt-1.5 font-medium">{currentLocation}</p>
        </div>
    );
}

// ─── GroupMoveModal ──────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function GroupMoveModal({ isOpen, onClose }: Props) {
    const { unallocatedCargoes, locations } = useCargoStore();
    const notify = useNotificationStore(s => s.notify);
    const ask = useNotificationStore(s => s.ask);
    const { execute, loading } = useCargoMovement();
    const titleId = useId();
    const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });

    const [step, setStep] = useState<0 | 1>(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchText, setSearchText] = useState('');
    const [showOnlyUnallocated, setShowOnlyUnallocated] = useState(false);
    const [targetLocationId, setTargetLocationId] = useState(locations[0]?.id ?? '');
    const [targetBayId, setTargetBayId] = useState<string>('distribute');
    const [targetSide, setTargetSide] = useState<'port' | 'center' | 'starboard'>('port');

    // Inventário completo: não alocadas + todas as alocadas em baias
    const allCargoes = useMemo(() => {
        const allocated = locations.flatMap(loc => loc.bays.flatMap(bay => bay.allocatedCargoes));
        return [...unallocatedCargoes, ...allocated];
    }, [unallocatedCargoes, locations]);

    const displayCargoes = useMemo(() => {
        const base = showOnlyUnallocated ? unallocatedCargoes : allCargoes;
        if (!searchText.trim()) return base;
        const s = searchText.toLowerCase();
        return base.filter(c =>
            c.identifier.toLowerCase().includes(s) ||
            c.description.toLowerCase().includes(s)
        );
    }, [allCargoes, unallocatedCargoes, showOnlyUnallocated, searchText]);

    const selectedWeight = useMemo(() =>
        allCargoes
            .filter(c => selectedIds.has(c.id))
            .reduce((sum, c) => sum + c.weightTonnes * c.quantity, 0),
        [allCargoes, selectedIds]
    );

    const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
    const stability = useStabilityCalculation(selectedIdsArray, targetSide);

    const targetLocation = locations.find(l => l.id === targetLocationId);

    const getCargoLocation = useCallback((cargo: Cargo): string => {
        if (cargo.status === 'UNALLOCATED') return 'Não Alocada';
        for (const loc of locations) {
            for (const bay of loc.bays) {
                if (bay.allocatedCargoes.some(c => c.id === cargo.id)) {
                    return `${loc.name} — ${bay.name}`;
                }
            }
        }
        return cargo.bayId ? 'Alocada' : 'Não Alocada';
    }, [locations]);

    const toggleCargo = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll  = () => setSelectedIds(new Set(displayCargoes.map(c => c.id)));
    const clearAll   = () => setSelectedIds(new Set());

    const handleNext = () => {
        if (selectedIds.size === 0) {
            notify('Selecione pelo menos uma carga antes de prosseguir.', 'warning');
            return;
        }
        setStep(1);
    };

    const handleConfirm = async () => {
        if (stability.status === 'CRITICAL' || loading) return;

        if (selectedWeight > 50) {
            const ok = await ask(
                'Confirmar Movimentação em Grupo',
                `A seleção totaliza ${selectedWeight.toFixed(2)} TON. Confirmar a movimentação?`
            );
            if (!ok) return;
        }

        const success = await execute({
            cargoIds: Array.from(selectedIds),
            targetLocationId,
            targetBayId,
            targetSide,
        });

        if (success) {
            onClose();
        }
    };

    const handleClose = () => {
        setStep(0);
        setSelectedIds(new Set());
        setSearchText('');
        setShowOnlyUnallocated(false);
        setTargetBayId('distribute');
        setTargetSide('port');
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-[95vw] h-[90vh] bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-subtle animate-in fade-in slide-in-from-bottom-4 duration-300"
            >

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-subtle shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-primary/10 rounded-xl">
                            <Users className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div>
                            <h2 id={titleId} className="text-base font-black text-primary leading-none">Movimentação em Grupo</h2>
                            {step === 0 && selectedIds.size > 0 && (
                                <p className="text-xs text-muted mt-0.5">
                                    {selectedIds.size} carga(s) selecionada(s) · {selectedWeight.toFixed(2)} TON
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        aria-label="Fechar modal"
                    >
                        <X className="w-5 h-5 text-muted" />
                    </button>
                </div>

                {/* ── Step indicators ── */}
                <div className="flex items-center gap-6 px-6 py-2.5 border-b border-subtle shrink-0 bg-sidebar/20">
                    {(['Seleção de Cargas', 'Configurar Destino'] as const).map((label, i) => (
                        <div key={i} className={cn('flex items-center gap-2 text-xs font-black uppercase tracking-widest', i === step ? 'text-brand-primary' : 'text-muted')}>
                            <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                                i === step ? 'bg-brand-primary text-white' :
                                i < step   ? 'bg-emerald-500 text-white' :
                                             'bg-gray-200 dark:bg-gray-700 text-muted'
                            )}>
                                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            {label}
                        </div>
                    ))}
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-hidden">
                    {step === 0 ? (
                        // ── STEP 1: Seleção ──────────────────────────────────
                        <div className="h-full flex flex-col">
                            {/* Filtros */}
                            <div className="flex items-center gap-3 px-6 py-3 border-b border-subtle shrink-0 bg-sidebar/10">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={e => setSearchText(e.target.value)}
                                        placeholder="Buscar por código ou descrição..."
                                        className="w-full pl-9 pr-4 py-2 bg-main border border-subtle rounded-xl text-sm outline-none focus:border-brand-primary transition-colors"
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-xs font-bold text-muted cursor-pointer whitespace-nowrap select-none">
                                    <input
                                        type="checkbox"
                                        checked={showOnlyUnallocated}
                                        onChange={e => setShowOnlyUnallocated(e.target.checked)}
                                        className="rounded accent-brand-primary"
                                    />
                                    Apenas não alocadas
                                </label>
                                <span className="text-xs text-muted font-bold whitespace-nowrap shrink-0">
                                    {displayCargoes.length} carga(s)
                                </span>
                            </div>

                            {/* Grid de cargas */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {displayCargoes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted py-20">
                                        <Search className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="font-bold text-sm">Nenhuma carga encontrada</p>
                                        <p className="text-xs mt-1">Ajuste os filtros ou carregue um manifesto</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {displayCargoes.map(cargo => (
                                            <CargoCard
                                                key={cargo.id}
                                                cargo={cargo}
                                                selected={selectedIds.has(cargo.id)}
                                                onToggle={toggleCargo}
                                                currentLocation={getCargoLocation(cargo)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        // ── STEP 2: Alocação ─────────────────────────────────
                        <div className="h-full flex overflow-hidden">
                            {/* Formulário */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Location */}
                                <div>
                                    <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-2">Área / Convés</label>
                                    <select
                                        value={targetLocationId}
                                        onChange={e => { setTargetLocationId(e.target.value); setTargetBayId('distribute'); }}
                                        className="w-full px-4 py-3 bg-main border border-subtle rounded-xl text-sm font-bold outline-none focus:border-brand-primary transition-colors"
                                    >
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Bay */}
                                <div>
                                    <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-2">Baia de Destino</label>
                                    <select
                                        value={targetBayId}
                                        onChange={e => setTargetBayId(e.target.value)}
                                        className="w-full px-4 py-3 bg-main border border-subtle rounded-xl text-sm font-bold outline-none focus:border-brand-primary transition-colors"
                                    >
                                        <option value="distribute">Distribuir automaticamente (round-robin)</option>
                                        {targetLocation?.bays.map(bay => (
                                            <option key={bay.id} value={bay.id}>
                                                {bay.name} — {bay.currentWeightTonnes.toFixed(1)} / {bay.maxWeightTonnes} t
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Bordo */}
                                <div>
                                    <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-2">Bordo</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {([
                                            { side: 'port'      as const, label: 'BOMBORDO' },
                                            { side: 'center'    as const, label: 'CENTRO'   },
                                            { side: 'starboard' as const, label: 'BORESTE'  },
                                        ]).map(({ side, label }) => (
                                            <button
                                                key={side}
                                                onClick={() => setTargetSide(side)}
                                                className={cn(
                                                    'py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all',
                                                    targetSide === side
                                                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                                                        : 'border-subtle text-muted hover:border-gray-400 dark:hover:border-gray-500'
                                                )}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Painel lateral: Resumo + Estabilidade */}
                            <div className="w-72 border-l border-subtle p-5 flex flex-col gap-4 shrink-0 bg-sidebar/30 overflow-y-auto">
                                <div className="p-4 rounded-xl border border-subtle bg-main space-y-2">
                                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">Resumo da Movimentação</p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted">Total de cargas</span>
                                        <span className="font-black text-primary">{selectedIds.size}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted">Peso total</span>
                                        <span className="font-black text-primary">{selectedWeight.toFixed(2)} t</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted">Destino</span>
                                        <span className="font-black text-primary text-right text-xs">{targetLocation?.name ?? '—'}</span>
                                    </div>
                                </div>

                                <StabilityGauge
                                    pesoBombordo={stability.pesoBombordo}
                                    pesoBoreste={stability.pesoBoreste}
                                    diffPercent={stability.diffPercent}
                                    status={stability.status}
                                />

                                {stability.status === 'CRITICAL' && (
                                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs font-bold text-red-700 dark:text-red-400">
                                        Desequilíbrio superior a 10%. Mude o bordo de destino ou selecione menos cargas para continuar.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-subtle shrink-0 bg-sidebar/10">
                    {step === 0 ? (
                        <>
                            <div className="flex items-center gap-3">
                                <button onClick={selectAll} className="text-xs font-black text-brand-primary hover:underline underline-offset-2">
                                    Selecionar Todos
                                </button>
                                <span className="text-muted text-xs">|</span>
                                <button onClick={clearAll} className="text-xs font-black text-muted hover:text-primary transition-colors">
                                    Limpar
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleClose}
                                    className="px-5 py-2.5 text-xs font-black text-muted hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={selectedIds.size === 0}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1A237E] text-white rounded-xl text-xs font-black disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest"
                                >
                                    Próximo <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(0)}
                                className="flex items-center gap-2 px-5 py-2.5 text-xs font-black text-muted hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors uppercase tracking-widest"
                            >
                                <ChevronLeft className="w-4 h-4" /> Voltar
                            </button>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleClose}
                                    className="px-5 py-2.5 text-xs font-black text-muted hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={stability.status === 'CRITICAL' || loading}
                                    className={cn(
                                        'flex items-center gap-2 px-7 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                                        stability.status === 'CRITICAL'
                                            ? 'bg-red-100 dark:bg-red-950 text-red-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50'
                                    )}
                                >
                                    {loading ? 'Movendo...' : 'Confirmar Movimentação'}
                                </button>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>,
        document.body
    );
}
