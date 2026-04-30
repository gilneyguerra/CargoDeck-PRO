import { useState, useEffect } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { cn } from '@/lib/utils';

interface VesselIdentificationButtonProps {
  /** Variante visual: 'header' = pill compacta para topo; 'deck' = bloco maior para o cabeçalho do convés. */
  variant?: 'header' | 'deck';
}

/**
 * Botão de identificação da embarcação (Vessel ID).
 * Extraído do Header para poder ser reposicionado no cabeçalho do DeckArea.
 */
export function VesselIdentificationButton({ variant = 'deck' }: VesselIdentificationButtonProps) {
  const { manifestShipName, setShipName } = useCargoStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(manifestShipName || '');

  useEffect(() => {
    setTempName(manifestShipName || '');
  }, [manifestShipName]);

  const sizeClasses = variant === 'header'
    ? 'px-4 py-2 gap-3 h-12'
    : 'px-4 py-2 gap-3 h-12';

  const inputSize = 'py-2 text-sm h-12';

  if (isEditing) {
    return (
      <input
        autoFocus
        type="text"
        value={tempName}
        onChange={(e) => setTempName(e.target.value)}
        onBlur={() => {
          setShipName(tempName);
          setIsEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setShipName(tempName);
            setIsEditing(false);
          } else if (e.key === 'Escape') {
            setTempName(manifestShipName || '');
            setIsEditing(false);
          }
        }}
        className={cn(
          'bg-main border-2 border-brand-primary rounded-2xl px-4 text-sm font-bold text-primary outline-none w-56 shadow-lg shadow-brand-primary/10',
          inputSize
        )}
        placeholder="Identificar Navio..."
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      title="Identificar Embarcação: Clique para editar o nome do navio ou unidade offshore."
      className={cn(
        'flex items-center rounded-xl bg-sidebar/50 hover:bg-main hover:border-brand-primary/30 transition-all border-2 border-subtle group/btn shadow-sm hover:shadow-md shrink-0',
        sizeClasses
      )}
    >
      <div className="flex flex-col items-start">
        <span className="text-[9px] font-black text-muted uppercase tracking-wider leading-none mb-0.5">Vessel</span>
        <span className={cn(
          'text-[13px] font-extrabold transition-colors leading-tight',
          manifestShipName ? 'text-primary' : 'text-muted italic'
        )}>
          {manifestShipName || 'M/V DISCOVERY...'}
        </span>
      </div>
      <div className="w-2 h-2 rounded-full bg-status-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
    </button>
  );
}
