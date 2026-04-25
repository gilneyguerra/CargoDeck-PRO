import { useState } from 'react';
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

  const handleSubmit = (e: React.FormEvent) => {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-header border border-subtle rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl relative max-h-[95vh] overflow-auto animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-muted hover:text-primary hover:bg-sidebar rounded-full transition-all">
          <X className="w-6 h-6" />
        </button>
        
        <div className="mb-8">
            <h2 className="text-2xl font-black text-primary tracking-tight">Adicionar Carga</h2>
            <p className="text-xs text-muted font-bold uppercase tracking-widest mt-1">Manual Inventory Input</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">Descrição Comercial</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-main border-2 border-subtle rounded-2xl px-5 py-3.5 text-primary outline-none focus:border-brand-primary transition-all font-bold"
              placeholder="Ex: Bomba centrífuga secundária"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">ID / Tag</label>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-5 py-3.5 text-primary outline-none focus:border-brand-primary transition-all font-bold"
                  placeholder="Ex: TAG-990"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">Quantidade</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-5 py-3.5 text-primary outline-none focus:border-brand-primary transition-all font-bold"
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

           <div className="p-6 bg-main border-2 border-subtle rounded-3xl shadow-inner flex flex-col items-center">
             <span className="text-[10px] font-black text-muted uppercase tracking-widest mb-4">Visual Logic Preview</span>
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
             />
           </div>

          <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">Cor Primária</label>
                <select
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-5 py-3.5 text-primary font-bold appearance-none cursor-pointer"
                >
                  <option value="#4f46e5">Indigo (Default)</option>
                  <option value="#ef4444">Vermelho</option>
                  <option value="#10b981">Verde</option>
                  <option value="#f59e0b">Amarelo</option>
                  <option value="#3b82f6">Azul</option>
                  <option value="#000000">Preto</option>
                  <option value="#ffffff">Branco</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest ml-1">Observações</label>
                <input
                  type="text"
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  className="w-full bg-main border-2 border-subtle rounded-2xl px-5 py-3.5 text-primary font-medium"
                  placeholder="Ex: Requer estropo longo"
                />
              </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isRemovable}
                  onChange={e => setIsRemovable(e.target.checked)}
                  className="peer hidden"
                />
                <div className="w-10 h-6 bg-subtle rounded-full border border-strong peer-checked:bg-brand-primary transition-all" />
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4 shadow-sm" />
              </div>
              <span className="text-[10px] font-black text-muted uppercase tracking-widest group-hover:text-primary transition-colors">Removível na operação</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-brand-primary hover:brightness-110 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-brand-primary/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            CONFIRMAR ENTRADA NO SISTEMA
          </button>
        </form>
      </div>
    </div>
  );
}