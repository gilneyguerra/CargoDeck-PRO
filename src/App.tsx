// src/App.tsx
/**
 * @file Componente raiz da aplicação CargoDeck-PRO.
 * Envolve a aplicação com o ErrorBoundary para capturar erros de UI
 * e demonstra a integração do PDFUploader.
 */
import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PDFUploader } from './components/PDFUploader';
import { useCargoStore } from './features/cargoStore';
import { Layout } from './ui/Layout';
import { DeckArea } from './ui/DeckArea';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { useAuthAndHydration } from './hooks/useAuthAndHydration';
import { useAutoSave } from './hooks/useAutoSave';
import { CargoPreview } from './ui/CargoPreview';
import { Edit, Trash2 } from 'lucide-react';
import { getCargoFontSize, getCargoIconSize } from './lib/scaling';
import { cn } from './lib/utils';
import { logger } from './utils/logger';

function AppContent() {
    const cargas = useCargoStore(state => state.unallocatedCargoes); // Using unallocatedCargoes for demo
    const totalWeight = useCargoStore(state => state.unallocatedCargoes.reduce((sum, c) => sum + c.weightTonnes, 0));
    const totalVolume = useCargoStore(state => state.unallocatedCargoes.reduce((sum, c) => sum + (c.widthMeters * c.lengthMeters * (c.heightMeters || 1)), 0));

    // Exemplo de uso do logger
    React.useEffect(() => {
        logger.info('AppContent montado.');
        logger.debug('Cargas iniciais:', { cargas });
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col items-center p-8">
            <h1 className="text-4xl font-extrabold text-blue-800 mb-8">CargoDeck-PRO</h1>
            <p className="text-lg text-gray-700 mb-10 text-center max-w-2xl">
                Otimize o planejamento de carga da sua embarcação. Faça upload do manifesto PDF para começar.
            </p>
            
            <div className="w-full max-w-3xl mb-12">
                <PDFUploader />
            </div>
            
            {cargas.length > 0 && (
                <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-blue-700 mb-4">Cargas Extraídas ({cargas.length})</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6 text-gray-700">
                        <div>
                            <span className="font-semibold">Peso Total:</span> {totalWeight.toFixed(2)} t
                        </div>
                        <div>
                            <span className="font-semibold">Volume Total:</span> {totalVolume.toFixed(2)} m³
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peso (t)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume (m³)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baia</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {cargas.map((carga) => (
                                    <tr key={carga.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{carga.id.split('-')[1]}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{carga.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{carga.weightTonnes.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{((carga.widthMeters || 1) * (carga.lengthMeters) * (carga.heightMeters || 1)).toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{carga.category}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Aqui você adicionaria o componente de visualização do convés e outras funcionalidades */}
        </div>
    );
}

function App() {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
}

export default App;