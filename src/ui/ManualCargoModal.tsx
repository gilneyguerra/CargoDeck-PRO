import { useState, type FormEvent } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { X } from 'lucide-react';
import type { CargoCategory } from '@/domain/Cargo';
import { CargoPreview } from './CargoPreview';

export function ManualCargoModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addManualCargo } = useCargoStore();

  const [description, setDescription] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [weightTonnes, setWeightTonnes] = useState<number | string>('');
  const [lengthMeters, setLengthMeters] = useState<number | string>('');
  const [widthMeters, setWidthMeters] = useState<number | string>('');
  const [heightMeters, setHeightMeters] = useState<number | string>('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [category, setCategory] = useState<CargoCategory>('GENERAL');
  const [format, setFormat] = useState<'Retangular' | 'Quadrado' | 'Tubular'>('Retangular');
  const [color, setColor] = useState('#3b82f6');
  const [isRemovable, setIsRemovable] = useState(false);
  const [observations, setObservations] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const w = Number(weightTonnes);
    const l = Number(lengthMeters);
    const wi = Number(widthMeters);
    const h = Number(heightMeters);
    const q = Number(quantity);

    if (!description.trim() || !identifier.trim() || w <= 0 || l <= 0 || wi <= 0 || h <= 0 || q <= 0) {
      alert('Preencha todos os campos obrigatórios com valores válidos.');
      return;
    }

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
    setColor('#3b82f6');
    setIsRemovable(false);
    setObservations('');

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
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
              className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4.5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/5"
              placeholder="e.g. SECONDARY CENTRIFUGAL PUMP"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Unit Tag / ID</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4.5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary transition-all focus:ring-4 focus:ring-brand-primary/5"
                  placeholder="TAG-990-PRO"
                  required
                />
              </div>
              <div className="space-y-3">
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

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">Geometria</label>
                <select
                  value={format}
                  onChange={e => setFormat(e.target.value as typeof format)}
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-5 py-3.5 text-primary outline-none focus:border-brand-primary transition-all font-bold appearance-none cursor-pointer"
                >
                  <option value="Retangular">Retangular</option>
                  <option value="Quadrado">Quadrado</option>
                  <option value="Tubular">Tubular</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">Altura (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={heightMeters}
                  onChange={e => setHeightMeters(e.target.value)}
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-5 py-3.5 text-primary outline-none focus:border-brand-primary transition-all font-mono font-bold"
                  required
                />
              </div>
          </div>

           <div className="p-8 bg-main border-2 border-subtle rounded-[2rem] shadow-inner flex flex-col items-center glass">
             <span className="text-[10px] font-extrabold text-muted uppercase tracking-[0.4em] mb-6 opacity-60">Visual Configuration Analysis</span>
             <CargoPreview 
               format={format} 
               length={Number(lengthMeters) || 1} 
               width={Number(widthMeters) || 1} 
               height={Number(heightMeters) || 1} 
               color={color} 
               quantity={Number(quantity) || 1} 
               weightTonnes={Number(weightTonnes) || 0}
               cargo={{
                 lengthMeters: Number(lengthMeters) || 1,
                 widthMeters: Number(widthMeters) || 1,
                 heightMeters: Number(heightMeters) || 1,
                 quantity: Number(quantity) || 1,
                 weightTonnes: Number(weightTonnes) || 0
               }}
               dynamicScale={true}
             />
           </div>

          <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Primary Color</label>
                <div className="relative">
                    <select
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4.5 text-sm font-extrabold text-primary outline-none focus:border-brand-primary appearance-none cursor-pointer"
                    >
                      <option value="#4f46e5">Indigo Premium</option>
                      <option value="#ef4444">Signal Red</option>
                      <option value="#10b981">Offshore Green</option>
                      <option value="#f59e0b">Warning Yellow</option>
                      <option value="#3b82f6">Maritime Blue</option>
                      <option value="#000000">Deep Black</option>
                      <option value="#ffffff">Pure White</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">▼</div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-muted uppercase tracking-[0.2em] ml-1">Special Notes</label>
                <input
                  type="text"
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-6 py-4.5 text-sm font-bold text-primary outline-none focus:border-brand-primary"
                  placeholder="e.g. SLING REQUIRED"
                />
              </div>
          </div>

          <div className="flex items-center gap-4 px-2">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isRemovable}
                  onChange={e => setIsRemovable(e.target.checked)}
                  className="peer hidden"
                />
                <div className="w-12 h-6.5 bg-subtle rounded-full border border-strong peer-checked:bg-status-success transition-all" />
                <div className="absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full transition-all peer-checked:translate-x-5.5 shadow-sm" />
              </div>
              <span className="text-[11px] font-extrabold text-muted uppercase tracking-widest group-hover:text-primary transition-colors">Removable Cargo Status</span>
            </label>
          </div>

          <div className="flex gap-4 pt-4">
             <button
               type="button"
               onClick={onClose}
               className="flex-1 py-5 text-[11px] font-extrabold text-muted uppercase tracking-[0.2em] hover:text-primary transition-all"
             >
               DISCARD
             </button>
             <button
                type="submit"
                className="flex-[2] bg-brand-primary hover:brightness-110 text-white font-extrabold py-5 rounded-[2rem] shadow-high shadow-brand-primary/20 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-[11px] hover-lift"
              >
                COMMIT TO INVENTORY
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}