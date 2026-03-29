import { useDraggable } from '@dnd-kit/core';
import { useCargoStore } from '@/features/cargoStore';
import { cn } from '@/lib/utils';
import type { Cargo } from '@/domain/Cargo';
import { getCargoFontSize, getCargoIconSize } from '@/lib/scaling';
import { CargoPreview } from './CargoPreview';
import { Edit, Trash2 } from 'lucide-react';
import { useDragStore } from '@/features/dragStore';
import { useDragRotation } from '@/hooks/useDragRotation';
import { useEffect } from 'react';

function DraggableCargo({ cargo, isHighlight, onEdit }: { cargo: Cargo, isHighlight?: boolean, onEdit: (cargo: Cargo) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cargo.id,
  });
  const { deleteCargo } = useCargoStore();
  const { isDragging: dragStoreIsDragging } = useDragStore();
  const [isRotated, setIsRotated] = useState(cargo.isRotated ?? false);

  // Update the cargo store's isRotated when the rotation state changes during drag
  useEffect(() => {
    if (dragStoreIsDragging) {
      const { updateCargo } = useCargoStore();
      updateCargo(cargo.id, { isRotated });
    }
  }, [isRotated, dragStoreIsDragging]);

  // Initialize the rotation state from the cargo
  useEffect(() => {
    setIsRotated(cargo.isRotated ?? false);
  }, [cargo.isRotated]);

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleDelete = async () => {
    await deleteCargo(cargo.id);
  };

  const fontSize = getCargoFontSize(cargo);
  const buttonSize = getCargoIconSize(cargo);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "border border-neutral-700 rounded p-2 flex flex-col gap-1 transition-colors cursor-grab select-none",
        isDragging ? "opacity-50" : "hover:border-indigo-500/50 active:cursor-grabbing",
        isHighlight ? "bg-yellow-900/50 border-yellow-400" : ""
      )}
    >
      {/* We rotate the cargo preview if isRotated is true */}
      <div style={{ display: 'inline-block', transform: `rotate(${isRotated ? 90 : 0}deg)` }}>
        <CargoPreview format={cargo.format || 'Retangular'} length={cargo.lengthMeters} width={cargo.widthMeters} height={cargo.heightMeters || 1} color={cargo.color || '#3b82f6'} quantity={cargo.quantity} weightTonnes={cargo.weightTonnes} cargo={cargo} />
      </div>
      <div className="text-xs text-neutral-400 mt-1 text-center" style={{ fontSize: `${fontSize * 0.8}px` }}>{cargo.quantity} x {cargo.weightTonnes.toFixed(1)} t</div>
      <div className="flex items-start justify-between">
        <div className="flex flex-col items-start gap-1.5">
          <span className="font-medium text-neutral-200 leading-tight pr-2" style={{ fontSize: `${fontSize}px` }}>{cargo.description}</span>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 mt-1">
          {cargo.observations === 'BACKLOAD' && (
            <span className="bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded uppercase font-bold tracking-wider" style={{ fontSize: `${fontSize * 0.6}px` }}>Backload</span>
          )}
        </div>
        <div className="flex items-end gap-1 shrink-0 mt-1">
          <button
            onClick={() => onEdit(cargo)}
            className="text-blue-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-blue-900/20"
            title="Editar carga"
            style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
          >
            <Edit style={{ width: `${buttonSize * 0.8}px`, height: `${buttonSize * 0.8}px` }} />
          </button>
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-900/20"
            title="Excluir carga"
            style={{ width: `${buttonSize}px`, height: `${buttonSize}px` }}
          >
            <Trash2 style={{ width: `${buttonSize * 0.8}px`, height: `${buttonSize * 0.8}px` }} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-neutral-400 mt-1" style={{ fontSize: `${fontSize * 0.8}px` }}>
        <span className="bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">{cargo.weightTonnes.toFixed(1)} t</span>
        <span className="bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">{cargo.lengthMeters}x{cargo.widthMeters} m</span>
        <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">{cargo.category}</span>
      </div>
    </div>
  );
}

export default DraggableCargo;