// src/hooks/useStabilityCalculation.ts
import { useMemo } from 'react';
import { useCargoStore } from '@/features/cargoStore';

/**
 * Status de estabilidade — APENAS INDICATIVO (não bloqueia movimentação).
 * 'OK' / 'WARNING' refletem o desequilíbrio para o operador, mas o app
 * NUNCA impede a operação por critério automático. Decisão fica com o
 * usuário que opera o plano de carga.
 */
export type StabilityStatus = 'OK' | 'WARNING';

export interface StabilityResult {
    pesoBombordo: number;
    pesoBoreste: number;
    pesoSelecionado: number;
    diffPercent: number;
    status: StabilityStatus;
}

/**
 * Calcula o equilíbrio transversal (Bombordo vs Boreste) simulando a movimentação
 * das cargas selecionadas para o bordo alvo.
 *
 * Fórmulas:
 *   Diff     = |pesoBombordo - pesoBoreste|
 *   Desq%    = (Diff / (pesoBombordo + pesoBoreste)) × 100
 *   OK       ≤ 10% | WARNING > 10%
 *   (Status é APENAS visual; nunca bloqueia confirmação.)
 */
export function useStabilityCalculation(
    selectedCargoIds: string[],
    targetSide: 'port' | 'center' | 'starboard' | 'distribute-sides'
): StabilityResult {
    const locations = useCargoStore(s => s.locations);
    const unallocatedCargoes = useCargoStore(s => s.unallocatedCargoes);

    return useMemo(() => {
        const selectedSet = new Set(selectedCargoIds);

        // Soma peso de todas as cargas alocadas, EXCLUINDO as que serão movidas
        let pesoBombordo = 0;
        let pesoBoreste = 0;

        for (const loc of locations) {
            for (const bay of loc.bays) {
                for (const cargo of bay.allocatedCargoes) {
                    if (selectedSet.has(cargo.id)) continue;
                    const w = cargo.weightTonnes * cargo.quantity;
                    if (cargo.positionInBay === 'port') pesoBombordo += w;
                    else if (cargo.positionInBay === 'starboard') pesoBoreste += w;
                }
            }
        }

        // Peso total das cargas selecionadas (de qualquer origem)
        const allCargoes = [
            ...unallocatedCargoes,
            ...locations.flatMap(loc => loc.bays.flatMap(bay => bay.allocatedCargoes))
        ];
        let pesoSelecionado = 0;
        for (const cargo of allCargoes) {
            if (selectedSet.has(cargo.id)) {
                pesoSelecionado += cargo.weightTonnes * cargo.quantity;
            }
        }

        // Adiciona o peso selecionado ao bordo alvo
        if (targetSide === 'port') pesoBombordo += pesoSelecionado;
        else if (targetSide === 'starboard') pesoBoreste += pesoSelecionado;
        else if (targetSide === 'distribute-sides') {
            // Distribuição balanceada: 1/3 bombordo, 1/3 boreste, 1/3 centro (este último não impacta)
            pesoBombordo += pesoSelecionado / 3;
            pesoBoreste += pesoSelecionado / 3;
        }
        // 'center' não afeta o balanço transversal

        const total = pesoBombordo + pesoBoreste;
        const diff = Math.abs(pesoBombordo - pesoBoreste);
        const diffPercent = total > 0 ? (diff / total) * 100 : 0;

        // Status apenas informativo — sem categoria 'CRITICAL' bloqueante
        const status: StabilityStatus = diffPercent <= 10 ? 'OK' : 'WARNING';

        return { pesoBombordo, pesoBoreste, pesoSelecionado, diffPercent, status };
    }, [selectedCargoIds, targetSide, locations, unallocatedCargoes]);
}
