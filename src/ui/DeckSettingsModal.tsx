import { useState, useEffect } from 'react';
/* eslint-disable react-hooks/set-state-in-effect */
import { useCargoStore } from '@/features/cargoStore';
import { X } from 'lucide-react';

export function DeckSettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { locations, activeLocationId, updateActiveLocationConfig } = useCargoStore();
  const activeLocation = locations.find(l => l.id === activeLocationId);

  const [length, setLength] = useState<number | string>(0);
  const [width, setWidth] = useState<number | string>(0);
  const [baysCount, setBaysCount] = useState<number | string>(0);
  const [bayLength, setBayLength] = useState<number | string>(0);
  const [elevationMeters, setElevationMeters] = useState<number | string>(30);
  const [portWidth, setPortWidth] = useState<number | string>(5);
  const [centerWidth, setCenterWidth] = useState<number | string>(5);
  const [starboardWidth, setStarboardWidth] = useState<number | string>(5);

  useEffect(() => {
    if (activeLocation) {
      setLength(activeLocation.config.lengthMeters);
      setWidth(activeLocation.config.widthMeters || 15);
      setBaysCount(activeLocation.config.numberOfBays);
      
      const defaultLength = activeLocation.config.lengthMeters / (activeLocation.config.numberOfBays || 1);
      setBayLength(activeLocation.config.bayLengthMeters !== undefined ? activeLocation.config.bayLengthMeters : defaultLength);

      setElevationMeters(activeLocation.config.elevationMeters !== undefined ? activeLocation.config.elevationMeters : 30);
      setPortWidth(activeLocation.config.portWidthMeters || 5);
      setCenterWidth(activeLocation.config.centerWidthMeters || 5);
      setStarboardWidth(activeLocation.config.starboardWidthMeters || 5);
    }
  }, [activeLocation, isOpen]);

  if (!isOpen || !activeLocation) return null;

  const handleSave = () => {
    const tL = Number(length);
    const tW = Number(width);
    const sumW = Number(portWidth) + Number(centerWidth) + Number(starboardWidth);
    const sumL = Number(bayLength) * Number(baysCount);

    if (sumW > tW) {
      alert(`Erro dimensional: A soma das larguras das posições (${sumW}m) excede a Largura Total do deck (${tW}m).`);
      return;
    }

    if (sumL > tL) {
      alert(`Erro dimensional: O comprimento das ${baysCount} baias somadas (${sumL}m) excede o Comprimento Total do deck (${tL}m).`);
      return;
    }

    // Step 4b: confirm before destructive bay count change
    const newBaysCount = Number(baysCount);
    if (newBaysCount !== activeLocation.config.numberOfBays) {
      const totalAllocated = activeLocation.bays.reduce(
        (acc, bay) => acc + bay.allocatedCargoes.length, 0
      );
      if (totalAllocated > 0) {
        const confirmed = window.confirm(
          `Atenção: Alterar o número de baias irá mover ${totalAllocated} carga(s) alocada(s) de volta para a lista de não alocadas.\n\nDeseja continuar?`
        );
        if (!confirmed) return;
      }
    }

    updateActiveLocationConfig({
      lengthMeters: tL,
      widthMeters: tW,
      numberOfBays: newBaysCount,
      bayLengthMeters: Number(bayLength),
      elevationMeters: Number(elevationMeters),
      portWidthMeters: Number(portWidth),
      centerWidthMeters: Number(centerWidth),
      starboardWidthMeters: Number(starboardWidth)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-6">Configurar {activeLocation.name}</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-neutral-400 mb-1">Comprimento Total (m)</label>
               <input type="number" value={length} onChange={e => setLength(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500" />
               <p className="text-xs text-neutral-500 mt-1">Ref. Eixo Y (Proa/Popa)</p>
             </div>
             <div>
               <label className="block text-sm font-medium text-neutral-400 mb-1">Largura Total (m)</label>
               <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500" />
               <p className="text-xs text-neutral-500 mt-1">Ref. Eixo X (BB/BE)</p>
             </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Elevação do Piso Z-Index (m)</label>
            <input type="number" step="0.1" value={elevationMeters} onChange={e => setElevationMeters(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500" />
            <p className="text-xs text-neutral-500 mt-1">Ex: 30.0 (A/B Plan)</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Largura Bombordo</label>
            <input type="number" step="0.1" value={portWidth} onChange={e => setPortWidth(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Largura Central</label>
            <input type="number" step="0.1" value={centerWidth} onChange={e => setCenterWidth(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Largura Boreste</label>
            <input type="number" step="0.1" value={starboardWidth} onChange={e => setStarboardWidth(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500 text-sm" />
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Qtd Baias Transversais</label>
              <input type="number" value={baysCount} onChange={e => setBaysCount(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Comprimento da Baia (m)</label>
              <input type="number" value={bayLength} onChange={e => setBayLength(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded p-2 outline-none focus:border-indigo-500" />
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-1">A área das baias não deve ultrapassar a Área Total disponível do local.</p>
        </div>

        <button onClick={handleSave} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors">
          Aplicar Novas Dimensões
        </button>
      </div>
    </div>
  )
}
