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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">Adicionar Carga Manual</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Descrição *</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
              placeholder="Ex: Container 20ft com máquinas"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Identificador *</label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
              placeholder="Ex: CONT001"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Peso (tonnes) *</label>
              <input
                type="number"
                step="0.1"
                value={weightTonnes}
                onChange={e => setWeightTonnes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
                placeholder="10.5"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Quantidade *</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
                placeholder="1"
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Comprimento (m) *</label>
              <input
                type="number"
                step="0.01"
                value={lengthMeters}
                onChange={e => setLengthMeters(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
                placeholder="6.10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Largura (m) *</label>
              <input
                type="number"
                step="0.01"
                value={widthMeters}
                onChange={e => setWidthMeters(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
                placeholder="2.44"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Altura (m) *</label>
              <input
                type="number"
                step="0.01"
                value={heightMeters}
                onChange={e => setHeightMeters(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
                placeholder="2.59"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Formato *</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as typeof format)}
              className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
              required
            >
              <option value="Retangular">Retangular</option>
              <option value="Quadrado">Quadrado</option>
              <option value="Tubular">Tubular</option>
            </select>
          </div>

           <div className="mt-4 p-4 bg-neutral-950 border border-neutral-700 rounded">
             <p className="text-sm text-neutral-400 mb-2">Preview:</p>
             {/* Create temporary cargo object for consistent scaling */}
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

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Cor</label>
            <select
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
              required
            >
              <option value="#000000">Preto</option>
              <option value="#FFFFFF">Branco</option>
              <option value="#FF0000">Vermelho</option>
              <option value="#00FF00">Verde</option>
              <option value="#0000FF">Azul</option>
              <option value="#FFFF00">Amarelo</option>
              <option value="#00FFFF">Ciano</option>
              <option value="#FF00FF">Magenta</option>
              <option value="#FFA500">Laranja</option>
              <option value="#800080">Roxo</option>
              <option value="#FFC0CB">Rosa</option>
              <option value="#A52A2A">Marrom</option>
              <option value="#808080">Cinza</option>
              <option value="#000080">Azul Escuro</option>
              <option value="#008000">Verde Escuro</option>
              <option value="#800000">Vermelho Escuro</option>
              <option value="#FFFF80">Amarelo Claro</option>
              <option value="#80FFFF">Ciano Claro</option>
              <option value="#FF80FF">Magenta Claro</option>
              <option value="#C0C0C0">Cinza Claro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Observações</label>
            <input
              type="text"
              value={observations}
              onChange={e => setObservations(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500"
              placeholder="Ex: Carga perigosa"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRemovable}
                onChange={e => setIsRemovable(e.target.checked)}
                className="w-4 h-4 bg-neutral-950 border border-neutral-700 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-neutral-400">Carga removível durante operação</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Adicionar Carga
          </button>
        </form>
      </div>
    </div>
  );
}