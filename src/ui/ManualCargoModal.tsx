import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { X } from 'lucide-react';
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
  const [format, setFormat] = useState<'Retangular' | 'Cilíndrica Vertical' | 'Cilíndrica Horizontal'>('Retangular');

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
      <div className="bg-header border border-subtle rounded-[2.5rem] p-10 w-full max-w-2xl shadow-high relative max-h-[95vh] overflow-auto animate-in zoom-in-95 duration-200 glass">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary" />
        
        <button onClick={onClose} className="absolute top-6 right-8 text-muted hover:text-primary p-2 hover:bg-main rounded-full transition-all">
          <X className="w-7 h-7" />
        </button>
        
        <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-primary tracking-tighter uppercase leading-none">Manual Inventory Entry</h2>
            <p className="text-[11px] font-bold text-muted uppercase tracking-[0.4em] mt-3 opacity-80">Offshore Logistics Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Commercial Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. SECONDARY CENTRIFUGAL PUMP"
              className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4.5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Unit Tag / ID</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="TAG-990-PRO"
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4.5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/5"
                  required
                />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Quantity (Units)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4.5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/5"
                  min="1"
                  required
                />
              </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">Peso (t)</label>
               <input
                 type="number"
                 step="0.001"
                 value={weightTonnes}
                 onChange={e => setWeightTonnes(e.target.value)}
                 className="w-full bg-main border-2 border-subtle rounded-2xl px-4 py-3.5 text-primary outline-none focus:border-brand-primary transition-all font-mono font-bold"
                 required
               />
             </div>
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">C (m)</label>
               <input
                 type="number"
                 step="0.01"
                 value={lengthMeters}
                 onChange={e => setLengthMeters(e.target.value)}
                 className="w-full bg-main border-2 border-subtle rounded-2xl px-4 py-3.5 text-primary outline-none focus:border-brand-primary transition-all font-mono font-bold"
                 required
               />
             </div>
             <div className="space-y-2">
               <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">L (m)</label>
               <input
                 type="number"
                 step="0.01"
                 value={widthMeters}
                 onChange={e => setWidthMeters(e.target.value)}
                 className="w-full bg-main border-2 border-subtle rounded-2xl px-4 py-3.5 text-primary outline-none focus:border-brand-primary transition-all font-mono font-bold"
                 required
               />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="block text-[11px] font-black text-muted uppercase tracking-widest ml-1">Geometria</label>
               <select
                 value={format}
                 onChange={e => setFormat(e.target.value as any)}
                 className="w-full bg-main border-2 border-subtle rounded-2xl px-4 py-4.5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary transition-all appearance-none"
               >
                 <option value="Retangular">Retangular</option>
                 <option value="Cilíndrica Vertical">Cilíndrica Vertical</option>
                 <option value="Cilíndrica Horizontal">Cilíndrica Horizontal</option>
               </select>
            </div>
            <div className="space-y-2">
               <label className="block text-[11px] font-black text-muted uppercase tracking-widest ml-1">Altura (m)</label>
               <input
                 type="number"
                 step="0.01"
                 value={heightMeters}
                 onChange={e => setHeightMeters(e.target.value)}
                 className="w-full bg-main border-2 border-subtle rounded-2xl px-4 py-4.5 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all"
               />
            </div>
          </div>

          <div className="bg-main/40 p-6 rounded-3xl border border-subtle/50 flex flex-col items-center justify-center min-h-[140px] shadow-inner mb-2">
             <span className="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-4 opacity-60">Visual Configuration Analysis</span>
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

          <div className="grid grid-cols-2 gap-8 items-start">
             <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Primary Color</label>
                <div className="relative group">
                  <select
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4 text-sm font-extrabold text-primary appearance-none focus:border-brand-primary transition-all cursor-pointer"
                  >
                    <option value="#3b82f6">Maritime Blue</option>
                    <option value="#10b981">Safety Green</option>
                    <option value="#f59e0b">Warning Amber</option>
                    <option value="#ef4444">Critical Red</option>
                    <option value="#8b5cf6">Logistics Purple</option>
                    <option value="#6b7280">Industrial Grey</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-inner border border-white/20" style={{ backgroundColor: color }} />
                </div>
             </div>
             
             <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Special Notes</label>
                <textarea
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  placeholder="e.g. SLING REQUIRED"
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-3.5 text-xs font-bold text-primary outline-none focus:border-brand-primary transition-all resize-none h-[56px] no-scrollbar shadow-inner"
                />
             </div>
          </div>

          <div className="flex items-center gap-4 py-4 group cursor-pointer" onClick={() => setIsRemovable(!isRemovable)}>
              <div className={cn(
                "w-12 h-6 rounded-full transition-all duration-300 relative",
                isRemovable ? "bg-brand-primary" : "bg-strong/30"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-300",
                  isRemovable ? "left-7" : "left-1"
                )} />
              </div>
              <span className="text-[10px] font-black text-muted uppercase tracking-widest group-hover:text-primary transition-colors">Removable Cargo Status</span>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-subtle gap-6 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-black text-muted hover:text-primary uppercase tracking-widest px-8 transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              className="flex-1 bg-brand-primary text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              Commit to Inventory
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}