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
    setDescription(''); setIdentifier(''); setWeightTonnes(''); setLengthMeters(''); setWidthMeters(''); setHeightMeters(''); setQuantity(1); setCategory('GENERAL'); setFormat('Retangular');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-main border-2 border-subtle rounded-[2.5rem] w-full max-w-2xl shadow-high relative max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary z-50" />
        
        {/* Header Section */}
        <div className="px-8 pt-10 pb-8 border-b border-subtle shrink-0">
            <button onClick={onClose} className="absolute top-7 right-8 text-primary hover:text-brand-primary p-2 hover:bg-main rounded-full transition-all">
                <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">Manual Inventory</h2>
                <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] opacity-90">Offshore Logistics Intelligence Hub</p>
            </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
            <form id="manual-cargo-form" onSubmit={handleSubmit} className="space-y-8">
                {/* Description & ID Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.15em] ml-1">
                            <Box size={14} className="text-brand-primary" /> Comercial Description
                        </label>
                        <input
                            type="text" value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="e.g. SECONDARY CENTRIFUGAL PUMP"
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/50"
                            required
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-primary uppercase tracking-[0.15em] ml-1">Unit Tag / ID</label>
                        <input
                            type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                            placeholder="TAG-990"
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/50"
                            required
                        />
                    </div>
                </div>

                {/* Physical Specs Section */}
                <div className="bg-main/50 p-8 rounded-[2rem] border-2 border-subtle shadow-inner">
                    <label className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest mb-6 border-b border-subtle pb-3">
                        <Settings size={14} className="text-brand-primary" /> Technical Data Package
                    </label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-primary uppercase tracking-widest ml-1">Weight (Tonnes)</label>
                            <input
                                type="number" step="0.001" value={weightTonnes} onChange={e => setWeightTonnes(e.target.value)}
                                className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary shadow-sm"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-primary uppercase tracking-widest ml-1">Length (m)</label>
                            <input
                                type="number" step="0.01" value={lengthMeters} onChange={e => setLengthMeters(e.target.value)}
                                className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary shadow-sm"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-primary uppercase tracking-widest ml-1">Width (m)</label>
                            <input
                                type="number" step="0.01" value={widthMeters} onChange={e => setWidthMeters(e.target.value)}
                                className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary shadow-sm"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[9px] font-black text-primary uppercase tracking-widest ml-1">Height (m)</label>
                            <input
                                type="number" step="0.01" value={heightMeters} onChange={e => setHeightMeters(e.target.value)}
                                className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Geometry & Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Inventory Quantity</label>
                        <input
                            type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-brand-primary transition-all shadow-inner"
                            min="1" required
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Spatial Geometry</label>
                        <select
                            value={format} onChange={e => setFormat(e.target.value as any)}
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary outline-none focus:border-brand-primary appearance-none cursor-pointer shadow-inner"
                        >
                            <option value="Retangular">Retangular Unit</option>
                            <option value="Quadrado">Quadrado (Box)</option>
                            <option value="Tubular">Tubular (Cylinder)</option>
                        </select>
                    </div>
                </div>

                {/* Visual Analysis Preview */}
                <div className="bg-main/70 p-10 rounded-[2.5rem] border-2 border-dashed border-subtle flex flex-col items-center justify-center min-h-[160px] shadow-inner relative overflow-hidden group">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[8px] font-black uppercase tracking-[0.3em] border border-brand-primary/20 shadow-low">
                        Computational Topology Preview
                    </div>
                    <div className="scale-110 transition-transform duration-700 group-hover:scale-125 mt-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                           <Palette size={14} className="text-brand-primary" /> Visual Identifier Tag
                        </label>
                        <div className="relative">
                            <select
                                value={color} onChange={e => setColor(e.target.value)}
                                className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4.5 text-sm font-black text-primary appearance-none focus:border-brand-primary cursor-pointer transition-all shadow-inner"
                            >
                                <option value="#3b82f6">Maritime Blue (Primary)</option>
                                <option value="#10b981">Safety Green (Standard)</option>
                                <option value="#f59e0b">Amber Warning (Attention)</option>
                                <option value="#ef4444">Critical Red (Impact)</option>
                                <option value="#8b5cf6">Logistics Purple (Special)</option>
                                <option value="#6b7280">Industrial Grey (Neutral)</option>
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white/30 shadow-medium" style={{ backgroundColor: color }} />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                           <Info size={14} className="text-brand-primary" /> Operator Observations
                        </label>
                        <textarea
                            value={observations} onChange={e => setObservations(e.target.value)}
                            placeholder="Specify handling protocols or storage requirements..."
                            className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-3.5 text-sm font-bold text-primary outline-none focus:border-brand-primary h-[60px] resize-none no-scrollbar shadow-inner"
                        />
                    </div>
                </div>

                {/* Removable Toggle */}
                <div className="flex items-center justify-between p-6 bg-sidebar border-2 border-subtle rounded-3xl group cursor-pointer hover:border-brand-primary/40 transition-all shadow-low" onClick={() => setIsRemovable(!isRemovable)}>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-primary uppercase tracking-widest leading-none">Subsea/Removable Status</span>
                        <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter opacity-80">Indicates item can be offloaded mid-operation</span>
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
            </form>
        </div>

        {/* Footer Section */}
        <div className="px-10 py-10 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-between gap-8">
            <button
                type="button" onClick={onClose}
                className="text-xs font-black text-secondary hover:text-primary uppercase tracking-[0.25em] transition-colors"
            >
                Discard Entry
            </button>
            <button
                type="submit" form="manual-cargo-form"
                className="flex-1 bg-brand-primary text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
                Commit to Active Inventory
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
}