import type { CargoLocation } from '@/domain/Location';
import { useReportSettings } from '@/features/reportSettingsStore';

export class CsvGeneratorService {
    static generateCsv(
        locations: CargoLocation[],
        shipName: string | null,
        atendimento: string | null
    ): Blob {
        const headers = [
            'Unidade',
            'Atendimento',
            'Local',
            'Bay',
            'Posição (BB/BE)',
            'Identificador',
            'Descrição',
            'Categoria',
            'Origem',
            'Destino',
            'Peso (t)',
            'Quantidade',
            'Comprimento (m)',
            'Largura (m)',
            'Altura (m)',
            'Área (m²)',
            'Rotação',
            'Status'
        ];

        const rows: string[][] = [];

        // Adicionar cabeçalhos
        rows.push(headers);

        const safeStr = (str: string | number | boolean | null | undefined) => {
            if (!str && str !== 0) return '';
            // Escape double quotes by doubling them
            const sanitized = String(str).replace(/"/g, '""');
            // Se contiver vírgula, ponto e vírgula, quebra de linha ou aspas, colocar entre aspas
            if (sanitized.includes(',') || sanitized.includes(';') || sanitized.includes('\n') || sanitized.includes('"')) {
                return `"${sanitized}"`;
            }
            return sanitized;
        };

        const safeNum = (num: number | undefined) => {
            if (num === undefined || isNaN(num)) return '';
            // Formatar número com vírgula para o Excel pt-BR
            return num.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
        };

        const ship = safeStr(shipName || '');
        const atend = safeStr(atendimento || '');

        locations.forEach(location => {
            const locName = safeStr(location.name);

            location.bays.forEach((bay, bayIndex) => {
                const bayName = safeStr(`Bay ${bayIndex + 1}`);

                bay.allocatedCargoes.forEach(cargo => {
                    const area = (cargo.widthMeters * cargo.lengthMeters) * cargo.quantity;
                    const position = cargo.positionInBay === 'port' ? 'Bombordo (BB)' : (cargo.positionInBay === 'starboard' ? 'Estibordo (BE)' : '');

                    rows.push([
                        ship,
                        atend,
                        locName,
                        bayName,
                        safeStr(position),
                        safeStr(cargo.identifier),
                        safeStr(cargo.description),
                        safeStr(cargo.category),
                        safeStr(cargo.origemCarga),
                        safeStr(cargo.destinoCarga),
                        safeNum(cargo.weightTonnes),
                        safeStr(cargo.quantity),
                        safeNum(cargo.lengthMeters),
                        safeNum(cargo.widthMeters),
                        safeNum(cargo.heightMeters),
                        safeNum(area),
                        safeStr(cargo.isRotated ? 'Sim' : 'Não'),
                        safeStr(cargo.status)
                    ]);
                });
            });
        });

        // Rodapé com assinatura única configurável (substitui Imediato + Comandante)
        const settings = useReportSettings.getState();
        const sigName = settings.signatoryName.trim();
        const sigRole = settings.signatoryRole.trim();
        if (sigName || sigRole) {
          rows.push([]); // linha em branco
          rows.push([]);
          const sigLabel = sigName && sigRole
            ? `Assinatura: ${sigName} — ${sigRole}`
            : `Assinatura: ${sigName || sigRole}`;
          rows.push([sigLabel]);
        }

        // Adicionar BOM (Byte Order Mark) para o Excel reconhecer os caracteres UTF-8 corretamente
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);

        // Juntar colunas com ponto e vírgula (padrão Excel pt-BR) e linhas com CRLF
        const csvContent = rows.map(row => row.join(';')).join('\r\n');

        return new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    }

    static executeExport(
        locations: CargoLocation[],
        filename: string,
        shipName: string | null,
        atendimento: string | null
    ) {
        if (!filename.toLowerCase().endsWith('.csv')) {
            filename += '.csv';
        }
        
        const blob = this.generateCsv(locations, shipName, atendimento);
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }
}
