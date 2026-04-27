import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { X, Box, Settings, Palette, Info } from 'lucide-react';
import type { CargoCategory } from '@/domain/Cargo';
import { CargoPreview } from './CargoPreview';
import { cn } from '@/lib/utils';

export function ManualCargoModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addManualCargo } = useCargoStore();

  const [description, setDescription] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [weightTonnes, setWeightTonnes] = useState('');
  const [lengthMeters, setLengthMeters] = useState('');
  const [widthMeters, setWidthMeters] = useState('');
  const [heightMeters, setHeightMeters] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState<CargoCategory>('GENERAL');
  const [observations, setObservations] = useState('');
  const [isRemovable, setIsRemovable] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [format, setFormat] = useState<'Retangular' | 'Quadrado' | 'Tubular'>('Retangular');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightTonnes);
    const l = parseFloat(lengthMeters);
    const wi = parseFloat(widthMeters);
    const h = parseFloat(heightMeters) || 1;
    const q = quantity;

    if (isNaN(w) || isNaN(l) || isNaN(wi)) return;

    addManualCargo({
      description: description.trim(),
      identifier: identifier.trim(),
      weightTonnes: w,
      lengthMeters: l,
      widthMeters: wi,
      heightMeters: h,
      quantity: q,
      category,
      observations: observations.trim() || undefined,
      isRemovable,
      color,
      format
    });

    // Reset form
    setDescription('');
    setIdentifier('');
    setWeightTonnes('');
    setLengthMeters('');
    setWidthMeters('');
    setHeightMeters('');
    setQuantity(1);
    setCategory('GENERAL');
    setFormat('Retangular');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-header border border-subtle rounded-[2.5rem] w-full max-w-2xl shadow-high relative max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 glass">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary z-50" />
        
        {/* Header Section (Fixed) */}
        <div className="px-8 pt-8 pb-6 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-7 right-8 text-muted hover:text-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-black text-primary tracking-tighter uppercase leading-none">Manual Inventory</h2>
                <p className="text-[9px] font-black text-muted uppercase tracking-[0.4em] opacity-80">Offshore Logistics Intelligence Hub</p>
            </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
            <form id="manual-cargo-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Description & ID Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                        <label className="flex items-center gap-2 text-[9px] font-black text-muted uppercase tracking-widest ml-1">
                            <Box size={10} className="text-brand-primary" /> Comercial Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g. SECONDARY CENTRIFUGAL PUMP"
                            className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-1">Unit Tag / ID</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder="TAG-990"
                            className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner"
                            required
                        />
                    </div>
                </div>

                {/* Dimensions Grid (All in one row) */}
                <div className="bg-main/30 p-5 rounded-[1.5rem] border border-subtle shadow-inner">
                    <label className="flex items-center gap-2 text-[9px] font-black text-muted uppercase tracking-widest mb-4 opacity-70">
                        <Settings size={10} /> Physical Specifications
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[8px] font-black text-muted uppercase tracking-tighter ml-1">Peso (t)</label>
                            <input
                                type="number" step="0.001" value={weightTonnes} onChange={e => setWeightTonnes(e.target.value)}
                                className="w-full bg-main border border-subtle rounded-lg px-3 py-2 text-xs font-mono font-bold text-primary outline-none focus:border-brand-primary"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[8px] font-black text-muted uppercase tracking-tighter ml-1">C (m)</label>
                            <input
                                type="number" step="0.01" value={lengthMeters} onChange={e => setLengthMeters(e.target.value)}
                                className="w-full bg-main border border-subtle rounded-lg px-3 py-2 text-xs font-mono font-bold text-primary outline-none focus:border-brand-primary"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[8px] font-black text-muted uppercase tracking-tighter ml-1">L (m)</label>
                            <input
                                type="number" step="0.01" value={widthMeters} onChange={e => setWidthMeters(e.target.value)}
                                className="w-full bg-main border border-subtle rounded-lg px-3 py-2 text-xs font-mono font-bold text-primary outline-none focus:border-brand-primary"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[8px] font-black text-muted uppercase tracking-tighter ml-1">H (m)</label>
                            <input
                                type="number" step="0.01" value={heightMeters} onChange={e => setHeightMeters(e.target.value)}
                                className="w-full bg-main border border-subtle rounded-lg px-3 py-2 text-xs font-mono font-bold text-primary outline-none focus:border-brand-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Geometry & Quantity */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-[9px] font-black text-muted uppercase tracking-widest ml-1">Quantity (Units)</label>
                        <input
                            type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                            className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all"
                            min="1" required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[9px] font-black text-muted uppercase tracking-widest ml-1">Geometry</label>
                        <select
                            value={format} onChange={e => setFormat(e.target.value as any)}
                            className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3 text-xs font-bold text-primary outline-none focus:border-brand-primary appearance-none transition-all"
                        >
                            <option value="Retangular">Retangular</option>
                            <option value="Quadrado">Quadrado</option>
                            <option value="Tubular">Tubular (Cilíndrica)</option>
                        </select>
                    </div>
                </div>

                {/* Visual Preview Section (Compact) */}
                <div className="bg-main/50 p-6 rounded-[2rem] border border-subtle/50 flex flex-col items-center justify-center min-h-[120px] shadow-inner relative overflow-hidden group">
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-brand-primary/10 text-brand-primary rounded-full text-[7px] font-black uppercase tracking-[0.2em] border border-brand-primary/20">
                        Visual Analysis Preview
                    </div>
                    <div className="scale-90 transition-transform duration-500 group-hover:scale-100 mt-2">
                        <CargoPreview 
                            format={format} 
                            length={Number(lengthMeters) || 1} 
                            width={Number(widthMeters) || 1} 
                            height={Number(heightMeters) || 1} 
                            color={color} 
                            quantity={quantity} 
                            dynamicScale={true}
                        />
                    </div>
                </div>

                {/* Color & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[9px] font-black text-muted uppercase tracking-widest ml-1">
                           <Palette size={10} /> Brand Customization
                        </label>
                        <div className="relative">
                            <select
                                value={color} onChange={e => setColor(e.target.value)}
                                className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-3 text-xs font-extrabold text-primary appearance-none focus:border-brand-primary cursor-pointer transition-all"
                            >
                                <option value="#3b82f6">Maritime Blue</option>
                                <option value="#10b981">Safety Green</option>
                                <option value="#f59e0b">Warning Amber</option>
                                <option value="#ef4444">Critical Red</option>
                                <option value="#8b5cf6">Logistics Purple</option>
                                <option value="#6b7280">Industrial Grey</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: color }} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[9px] font-black text-muted uppercase tracking-widest ml-1">
                           <Info size={10} /> Operational Notes
                        </label>
                        <textarea
                            value={observations} onChange={e => setObservations(e.target.value)}
                            placeholder="Add handling requirements..."
                            className="w-full bg-main border-2 border-subtle rounded-xl px-5 py-2.5 text-xs font-bold text-primary outline-none focus:border-brand-primary h-[48px] resize-none no-scrollbar shadow-inner"
                        />
                    </div>
                </div>

                {/* Removable Toggle (Compact) */}
                <div className="flex items-center justify-between p-4 bg-sidebar/50 rounded-2xl border border-subtle group cursor-pointer hover:bg-sidebar transition-colors" onClick={() => setIsRemovable(!isRemovable)}>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Removable Status</span>
                        <span className="text-[8px] font-bold text-muted uppercase tracking-tighter mt-1">Can be offloaded during operations</span>
                    </div>
                    <div className={cn(
                        "w-10 h-5 rounded-full transition-all duration-300 relative",
                        isRemovable ? "bg-brand-primary shadow-glow shadow-brand-primary/20" : "bg-strong/30"
                    )}>
                        <div className={cn(
                            "absolute top-1 w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-300",
                            isRemovable ? "left-6" : "left-1"
                        )} />
                    </div>
                </div>
            </form>
        </div>

        {/* Footer Section (Fixed) */}
        <div className="p-8 border-t border-subtle bg-sidebar/20 shrink-0 flex items-center justify-between gap-6">
            <button
                type="button" onClick={onClose}
                className="text-[10px] font-black text-muted hover:text-primary uppercase tracking-[0.2em] transition-colors"
            >
                Discard Entry
            </button>
            <button
                type="submit" form="manual-cargo-form"
                className="flex-1 bg-brand-primary text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/10 hover:brightness-110 active:scale-95 transition-all"
            >
                Commit to Inventory
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}