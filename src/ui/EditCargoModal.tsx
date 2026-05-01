import { useState, useEffect, useId, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
/* eslint-disable react-hooks/set-state-in-effect */
import { useCargoStore } from '@/features/cargoStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X, Box, Settings, Palette, Info, FolderOpen, Building2 } from 'lucide-react';
import { canHoldItems, type Cargo } from '@/domain/Cargo';
import type { CargoCategory } from '@/domain/Cargo';
import { CargoPreview } from './CargoPreview';

interface EditCargoModalProps {
  isOpen: boolean; cargo: Cargo | null; onClose: () => void;
}

export function EditCargoModal({ isOpen, cargo, onClose }: EditCargoModalProps) {
  const { updateCargo } = useCargoStore();
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });
  const [description, setDescription] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [weightTonnes, setWeightTonnes] = useState<number | string>('');
  const [lengthMeters, setLengthMeters] = useState<number | string>('');
  const [widthMeters, setWidthMeters] = useState<number | string>('');
  const [heightMeters, setHeightMeters] = useState<number | string>('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [category, setCategory] = useState<CargoCategory>('GENERAL');
  const [observations, setObservations] = useState('');
  const [isRemovable, setIsRemovable] = useState(false);
  const [format, setFormat] = useState<'Retangular' | 'Quadrado' | 'Tubular'>('Retangular');
  const [color, setColor] = useState('#3b82f6');
  const [holdsItems, setHoldsItems] = useState<boolean | undefined>(undefined);
  const [empresa, setEmpresa] = useState('');

  // Resolve estado efetivo do switch: respeita override explícito; senão
  // cai no default por categoria (CONTAINER/BASKET → true).
  const effectiveHoldsItems = canHoldItems({ holdsItems, category });

  useEffect(() => {
    if (cargo) {
      setDescription(cargo.description); setIdentifier(cargo.identifier); setWeightTonnes(cargo.weightTonnes);
      setLengthMeters(cargo.lengthMeters); setWidthMeters(cargo.widthMeters); setHeightMeters(cargo.heightMeters || '');
      setQuantity(cargo.quantity); setCategory(cargo.category); setObservations(cargo.observations || '');
      setIsRemovable(cargo.isRemovable || false); setFormat(cargo.format || 'Retangular'); setColor(cargo.color || '#3b82f6');
      setHoldsItems(cargo.holdsItems);
      setEmpresa(cargo.empresa || '');
    }
  }, [cargo]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); if (!cargo) return;
    const w = Number(weightTonnes); const l = Number(lengthMeters); const wi = Number(widthMeters);
    const h = Number(heightMeters); const q = Number(quantity);
    if (!description.trim() || !identifier.trim() || isNaN(w) || isNaN(l) || isNaN(wi) || isNaN(h) || isNaN(q)) return;
    updateCargo(cargo.id, { description: description.trim(), identifier: identifier.trim(), weightTonnes: w, lengthMeters: l, widthMeters: wi, heightMeters: h, quantity: q, category, observations: observations.trim() || undefined, isRemovable, format, color, holdsItems, empresa: empresa.trim() || undefined });
    onClose();
  };

  if (!isOpen || !cargo) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-header border-2 border-subtle rounded-[2.5rem] w-full max-w-2xl shadow-high relative max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 glass"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary z-50 shadow-glow shadow-brand-primary/10" />
        
        {/* Header Section */}
        <div className="px-10 pt-10 pb-8 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-8 right-10 text-primary hover:text-brand-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-7 h-7" />
            </button>
            <div className="flex flex-col gap-2">
                <h2 id={titleId} className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">Editar Carga</h2>
                <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] opacity-90 leading-relaxed">Atualização de Configuração da Carga</p>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
            <form id="edit-cargo-form" onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                            <Box size={14} className="text-brand-primary" /> Descrição Comercial
                        </label>
                        <input
                            type="text" value={description} onChange={e => setDescription(e.target.value)}
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-brand-primary transition-all shadow-inner"
                            required
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Identificador Único</label>
                        <input
                            type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-brand-primary transition-all shadow-inner"
                            required
                        />
                    </div>
                </div>

                <div className="bg-main/50 p-8 rounded-[2rem] border-2 border-subtle shadow-inner space-y-6">
                    <label className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest border-b border-subtle pb-3">
                        <Settings size={16} className="text-brand-primary" /> Especificações Físicas
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-primary uppercase tracking-tighter ml-1">Peso (t)</label>
                            <input
                                type="number" step="0.001" value={weightTonnes} onChange={e => setWeightTonnes(e.target.value)}
                                className="w-full bg-header border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-primary uppercase tracking-tighter ml-1">Comprimento (m)</label>
                            <input
                                type="number" step="0.01" value={lengthMeters} onChange={e => setLengthMeters(e.target.value)}
                                className="w-full bg-header border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-primary uppercase tracking-tighter ml-1">Largura (m)</label>
                            <input
                                type="number" step="0.01" value={widthMeters} onChange={e => setWidthMeters(e.target.value)}
                                className="w-full bg-header border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-primary uppercase tracking-tighter ml-1">Altura (m)</label>
                            <input
                                type="number" step="0.01" value={heightMeters} onChange={e => setHeightMeters(e.target.value)}
                                className="w-full bg-header border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Quantidade</label>
                        <input
                            type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-brand-primary transition-all shadow-inner"
                            min="1" required
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Geometria</label>
                        <select
                            value={format} onChange={e => setFormat(e.target.value as any)}
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-brand-primary appearance-none transition-all shadow-inner"
                        >
                            <option value="Retangular">Retangular</option>
                            <option value="Quadrado">Quadrado (Caixa)</option>
                            <option value="Tubular">Tubular (Cilindro)</option>
                        </select>
                    </div>
                </div>

                <div className="bg-main/70 p-10 rounded-[2.5rem] border-2 border-dashed border-subtle flex flex-col items-center justify-center min-h-[140px] shadow-inner relative overflow-hidden group">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[8px] font-black uppercase tracking-[0.3em] border border-brand-primary/20">
                        Pré-visualização Dimensional
                    </div>
                    <div className="scale-100 transition-transform duration-500 group-hover:scale-110 mt-4">
                        <CargoPreview format={format} length={Number(lengthMeters) || 1} width={Number(widthMeters) || 1} height={Number(heightMeters) || 1} color={color} quantity={Number(quantity)} dynamicScale={true} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                           <Palette size={14} className="text-brand-primary" /> Cor de Identificação
                        </label>
                        <div className="relative">
                            <select
                                value={color} onChange={e => setColor(e.target.value)}
                                className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary appearance-none focus:border-brand-primary cursor-pointer transition-all shadow-inner"
                            >
                                <option value="#3b82f6">Azul Marítimo (Padrão)</option>
                                <option value="#10b981">Verde Segurança</option>
                                <option value="#f59e0b">Âmbar Atenção</option>
                                <option value="#ef4444">Vermelho Crítico</option>
                                <option value="#8b5cf6">Roxo Especial</option>
                                <option value="#6b7280">Cinza Industrial</option>
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white/30 shadow-medium" style={{ backgroundColor: color }} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                           <Info size={14} className="text-brand-primary" /> Observações do Operador
                        </label>
                        <input
                            type="text" value={observations} onChange={e => setObservations(e.target.value)}
                            placeholder="Instruções especiais de manuseio..."
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-bold text-primary outline-none focus:border-brand-primary shadow-inner"
                        />
                    </div>
                </div>

                {/* Empresa proprietária — linha separada (nomes podem ser longos). Opcional. */}
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                        <Building2 size={14} className="text-brand-primary" /> Empresa Proprietária
                    </label>
                    <input
                        type="text" value={empresa} onChange={e => setEmpresa(e.target.value)}
                        placeholder="Ex.: Petrobras, Subsea7, Halliburton…  (opcional)"
                        className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-bold text-primary outline-none focus:border-brand-primary shadow-inner placeholder:text-muted/50"
                    />
                </div>

                <div className="flex items-center justify-between p-6 bg-sidebar border-2 border-subtle rounded-3xl group cursor-pointer hover:border-brand-primary/40 transition-all shadow-low" onClick={() => setIsRemovable(!isRemovable)}>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-primary uppercase tracking-widest leading-none">Carga Removível / Subsea</span>
                        <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter opacity-80">Item pode ser removido durante a operação</span>
                    </div>
                    <div className={cn(
                        "w-14 h-7 rounded-full transition-all duration-500 relative shadow-inner",
                        isRemovable ? "bg-brand-primary shadow-glow" : "bg-strong/40"
                    )}>
                        <div className={cn(
                            "absolute top-1 w-5 h-5 bg-white rounded-full shadow-high transition-all duration-300",
                            isRemovable ? "left-8" : "left-1"
                        )} />
                    </div>
                </div>

                {/* Toggle Modal Unitizador — declara se este modal carrega
                    itens fiscais (DANFE) por dentro. Override do default
                    de categoria persiste no campo holdsItems. */}
                <div
                    className={cn(
                        "flex items-center justify-between p-6 border-2 rounded-3xl group cursor-pointer transition-all shadow-low",
                        effectiveHoldsItems
                            ? "border-brand-primary bg-brand-primary/10"
                            : "bg-sidebar border-subtle hover:border-brand-primary/40"
                    )}
                    onClick={() => setHoldsItems(!effectiveHoldsItems)}
                >
                    <div className="flex items-center gap-3">
                        <FolderOpen size={18} className={cn("shrink-0", effectiveHoldsItems ? "text-brand-primary" : "text-muted")} />
                        <div className="flex flex-col gap-1">
                            <span className={cn("text-xs font-black uppercase tracking-widest leading-none", effectiveHoldsItems ? "text-brand-primary" : "text-primary")}>
                                Modal unitizador? {effectiveHoldsItems ? "SIM" : "NÃO"}
                            </span>
                            <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter opacity-80">
                                Permite alocar itens fiscais (DANFE) por dentro deste modal
                            </span>
                        </div>
                    </div>
                    <div className={cn(
                        "w-14 h-7 rounded-full transition-all duration-500 relative shadow-inner",
                        effectiveHoldsItems ? "bg-brand-primary shadow-glow" : "bg-strong/40"
                    )}>
                        <div className={cn(
                            "absolute top-1 w-5 h-5 bg-white rounded-full shadow-high transition-all duration-300",
                            effectiveHoldsItems ? "left-8" : "left-1"
                        )} />
                    </div>
                </div>
            </form>
        </div>

        {/* Footer Section */}
        <div className="px-10 py-6 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-between gap-8">
            <button
                type="button" onClick={onClose}
                className="px-8 py-4 rounded-2xl text-xs font-black text-primary bg-main border-2 border-subtle hover:bg-sidebar transition-all active:scale-95 uppercase tracking-[0.2em]"
            >
                CANCELAR
            </button>
            <button
                type="submit" form="edit-cargo-form"
                className="flex-1 bg-brand-primary text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
                SALVAR ALTERAÇÕES
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function cn(...classes: (string | boolean | undefined)[]) { return classes.filter(Boolean).join(' '); }