import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { Layout } from '@/ui/Layout';
import { DeckArea } from '@/ui/DeckArea';
import { ModalGenerationPage } from '@/ui/ModalGenerationPage';
import { useCargoStore } from '@/features/cargoStore';
import { useState, lazy, Suspense } from 'react';
import type { Cargo } from '@/domain/Cargo';
import { useAuthAndHydration } from '@/hooks/useAuthAndHydration';
import { useAutoSave } from '@/hooks/useAutoSave';
import { CargoPreview } from '@/ui/CargoPreview';
import { Edit, Trash2 } from 'lucide-react';
import { getCargoFontSize, getCargoIconSize } from '@/lib/scaling';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './ui/ToastContainer';
import { ErrorReportTray } from '@/ui/ErrorReportTray';
import { LandingPage } from '@/ui/LandingPage';

// Lazy-loaded para reduzir o bundle inicial — só baixa quando o usuário
// realmente abre o modal de edição (editingCargo != null).
const EditCargoModal = lazy(() =>
  import('@/ui/EditCargoModal').then(m => ({ default: m.EditCargoModal }))
);

function AppWithProviders() {
  const {
    moveCargoToBay, unallocatedCargoes, locations,
    activeLocationId, setActiveLocation,
    deleteCargo,
    setEditingCargo,
    editingCargo,
    viewMode
  } = useCargoStore();

  const [activeCargo, setActiveCargo] = useState<Cargo | null>(null);

  useAuthAndHydration();
  useAutoSave();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    
    let cargo = unallocatedCargoes.find(c => c.id === id);
    if (!cargo) {
      for (const loc of locations) {
        for (const bay of loc.bays) {
           const found = bay.allocatedCargoes.find(c => c.id === id);
           if (found) { cargo = found; break; }
        }
      }
    }
    setActiveCargo(cargo || null);
  };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCargo(null);
      
      if (over && over.id) {
        const fullId = String(over.id);
        // Extract the bay ID and side from format "{bayId}-{side}" where side is port/center/starboard
        if (fullId.endsWith('-port') || fullId.endsWith('-center') || fullId.endsWith('-starboard')) {
          const lastHyphenIndex = fullId.lastIndexOf('-');
          if (lastHyphenIndex > 0) {
            const bayId = fullId.substring(0, lastHyphenIndex);
            const side = fullId.substring(lastHyphenIndex + 1) as 'port' | 'center' | 'starboard';
            moveCargoToBay(String(active.id), bayId, side);
          }
        }
      }
    };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && String(over.id).startsWith('tab-')) {
      const targetLocId = String(over.id).replace('tab-', '');
      if (activeLocationId !== targetLocId) {
        setActiveLocation(targetLocId);
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <Layout>
        {viewMode === 'modal-generation' ? <ModalGenerationPage /> : <DeckArea />}
      </Layout>
      <DragOverlay>
        {activeCargo ? (
          <div 
            className={cn(
              "group relative border border-neutral-400 dark:border-neutral-700 rounded p-2 flex flex-col gap-1 transition-colors cursor-grab select-none bg-neutral-100 dark:bg-neutral-900",
              "hover:border-indigo-500/50 active:cursor-grabbing"
            )}
          >
            {/* Tooltip com identificador - aparece no hover */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 dark:bg-neutral-700 text-white dark:text-neutral-100 text-xs font-mono rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              {activeCargo.identifier}
            </div>
            <CargoPreview 
              format={activeCargo.format || 'Retangular'} 
              length={activeCargo.lengthMeters} 
              width={activeCargo.widthMeters} 
              height={activeCargo.heightMeters || 1} 
              color={activeCargo.color || '#3b82f6'} 
              quantity={activeCargo.quantity} 
              weightTonnes={activeCargo.weightTonnes}
              cargo={activeCargo}
            />
            <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 text-center" style={{ fontSize: `${getCargoFontSize(activeCargo) * 0.8}px` }}>
              {activeCargo.quantity} x {activeCargo.weightTonnes.toFixed(1)} t
            </div>
            <div className="flex items-start justify-between">
              <div className="flex flex-col items-start gap-1.5">
                <span className="font-medium text-gray-800 dark:text-neutral-200 leading-tight pr-2" style={{ fontSize: `${getCargoFontSize(activeCargo)}px` }}>
                  {activeCargo.description}
                </span>
              </div>
              <div className="flex items-end gap-1 shrink-0 mt-1">
                <button 
                  onClick={() => setEditingCargo(activeCargo)}
                  className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors p-1 rounded hover:bg-blue-900/20"
                  title="Editar carga"
                  style={{ width: `${getCargoIconSize(activeCargo)}px`, height: `${getCargoIconSize(activeCargo)}px` }}
                >
                  <Edit style={{ width: `${getCargoIconSize(activeCargo) * 0.8}px`, height: `${getCargoIconSize(activeCargo) * 0.8}px` }} />
                </button>
                <button 
                  onClick={async () => {
                    await deleteCargo(activeCargo!.id);
                    setActiveCargo(null);
                  }}
                  className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 transition-colors p-1 rounded hover:bg-red-900/20"
                  title="Excluir carga"
                  style={{ width: `${getCargoIconSize(activeCargo)}px`, height: `${getCargoIconSize(activeCargo)}px` }}
                >
                  <Trash2 style={{ width: `${getCargoIconSize(activeCargo) * 0.8}px`, height: `${getCargoIconSize(activeCargo) * 0.8}px` }} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400 mt-1" style={{ fontSize: `${getCargoFontSize(activeCargo) * 0.8}px` }}>
              <span className="bg-neutral-300 dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-400 dark:border-neutral-800">{activeCargo.weightTonnes.toFixed(1)} t</span>
              <span className="bg-neutral-300 dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-400 dark:border-neutral-800">{activeCargo.lengthMeters}x{activeCargo.widthMeters} m</span>
              <span className="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-300 dark:border-indigo-500/20">{activeCargo.category}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
      <ToastContainer />
      <ErrorReportTray />
      {/* Modal global de edição — só monta (e portanto só baixa o chunk) quando uma carga
          é selecionada para edição. Suspense mantém UI viva durante o carregamento. */}
      {editingCargo !== null && (
        <Suspense fallback={null}>
          <EditCargoModal
            isOpen={true}
            cargo={editingCargo}
            onClose={() => setEditingCargo(null)}
          />
        </Suspense>
      )}
    </DndContext>
  )
}

function AppContent() {
  const [view, setView] = useState<'landing' | 'app'>('landing');

  if (view === 'landing') {
    return <LandingPage onEnterApp={() => setView('app')} />;
  }

  return <AppWithProviders />;
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App
