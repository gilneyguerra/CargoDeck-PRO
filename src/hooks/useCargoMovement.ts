// src/hooks/useCargoMovement.ts
import { useState, useCallback } from 'react';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';

export type TargetSide = 'port' | 'center' | 'starboard' | 'distribute-sides';

export interface MovementOptions {
    cargoIds: string[];
    targetLocationId: string;
    targetBayId: string | 'distribute';
    targetSide: TargetSide;
}

export interface CargoMovementResult {
    execute: (opts: MovementOptions) => Promise<boolean>;
    loading: boolean;
    movedCount: number;
}

// Quando targetSide === 'distribute-sides', faz round-robin balanceado entre os 3 bordos.
// A ordem [port, starboard, center] minimiza o desequilíbrio inicial em listas pequenas
// (1ª carga vai p/ bombordo, 2ª p/ boreste compensando, 3ª p/ centro).
const SIDE_ROTATION: Array<'port' | 'center' | 'starboard'> = ['port', 'starboard', 'center'];

export function useCargoMovement(): CargoMovementResult {
    const [loading, setLoading] = useState(false);
    const [movedCount, setMovedCount] = useState(0);

    const moveCargoToBay = useCargoStore(s => s.moveCargoToBay);
    const notify = useNotificationStore(s => s.notify);

    const execute = useCallback(async ({ cargoIds, targetLocationId, targetBayId, targetSide }: MovementOptions): Promise<boolean> => {
        setLoading(true);
        try {
            // Lê locations diretamente do estado atual (evita closure stale)
            const { locations } = useCargoStore.getState();
            const targetLocation = locations.find(l => l.id === targetLocationId);

            if (!targetLocation) {
                notify('Localização de destino não encontrada.', 'error');
                return false;
            }
            if (targetLocation.bays.length === 0) {
                notify('A localização de destino não possui baias configuradas.', 'error');
                return false;
            }

            const bays = targetLocation.bays;
            let bayIndex = 0;
            let sideIndex = 0;
            let moved = 0;

            for (const cargoId of cargoIds) {
                const resolvedBayId = targetBayId === 'distribute'
                    ? bays[bayIndex % bays.length].id
                    : targetBayId;

                const resolvedSide = targetSide === 'distribute-sides'
                    ? SIDE_ROTATION[sideIndex % SIDE_ROTATION.length]
                    : targetSide;

                moveCargoToBay(cargoId, resolvedBayId, resolvedSide);
                bayIndex++;
                sideIndex++;
                moved++;
            }

            setMovedCount(moved);
            const sideNote = targetSide === 'distribute-sides' ? ' (distribuição balanceada por bordo)' : '';
            notify(`${moved} carga(s) movida(s) com sucesso para ${targetLocation.name}${sideNote}.`, 'success');
            return true;
        } catch {
            notify('Erro ao mover cargas. Tente novamente.', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    }, [moveCargoToBay, notify]);

    return { execute, loading, movedCount };
}
