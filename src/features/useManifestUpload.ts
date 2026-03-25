import { useState } from 'react';
import { useShipOperationCode } from '@/lib/storeUtils';
import { useCargoStore } from './cargoStore';
import { PdfParserService } from '@/infrastructure/PdfParserService';
import type { Cargo } from '@/domain/Cargo';

export function useManifestUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const { setExtractedCargoes, setManifestDetails } = useCargoStore();
  const shipCode = useShipOperationCode();

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF válido.');
      return;
    }
    
    setIsProcessing(true);
    setProgressText('Inicializando leitor visual...');
    setProgressPercent(0);
    setError(null);

    try {
      
      const onProgress = (msg: string, pct: number) => {
         setProgressText(msg);
         setProgressPercent(pct);
      };

      const { cargoes: extractedCargos, shipName, voyage } = await PdfParserService.extractCargoFromPdf(file, shipCode, onProgress);
      
      const store = useCargoStore.getState();
      const existingIds = new Set<string>();
      
      store.unallocatedCargoes.forEach(c => existingIds.add(c.identifier));
      store.locations.forEach(loc => {
         loc.bays.forEach(bay => {
            bay.allocatedCargoes.forEach(c => existingIds.add(c.identifier));
         });
      });

      const newCargos: Cargo[] = [];
      for (const c of extractedCargos) {
         if (!existingIds.has(c.identifier)) {
             existingIds.add(c.identifier);
             newCargos.push(c);
         }
      }
      
      const duplicatesCount = extractedCargos.length - newCargos.length;

      if (newCargos.length === 0) {
        if (duplicatesCount > 0) {
           setError(`O manifesto possui ${duplicatesCount} cargas destinadas ao "${shipCode}", mas TODAS já foram importadas ou já estão a bordo (duplicadas).`);
        } else {
           setError(`A leitura concluiu 100%, mas não detectou cargas inéditas para o Navio "${shipCode}".`);
        }
      } else {
        if (duplicatesCount > 0) {
           setError(`Aviso: ${duplicatesCount} cargas foram ignoradas pois já constam a bordo ou na lista.`);
        }
        setManifestDetails(shipName, voyage);
        setExtractedCargoes([...store.unallocatedCargoes, ...newCargos]);
      }
    } catch (err) {
      console.error('Erro ao ler manifesto:', err);
      setError(`ERRO: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return { isProcessing, progressText, progressPercent, error, handleFileUpload };
}
