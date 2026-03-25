import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import type { Cargo } from '@/domain/Cargo';

export interface ParseResult {
  cargoes: Cargo[];
  shipName: string;
  voyage: string;
}

if (typeof window !== 'undefined') {
   pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

// We'll work with the union type from pdfjs-dist and extract the properties we need

export class PdfParserService {
  static debugRawText = '';

  static async extractCargoFromPdf(
      file: File, 
      shipCode: string, 
      onProgress?: (msg: string, percent: number) => void
  ): Promise<ParseResult> {
    PdfParserService.debugRawText = '';
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const extractedCargos: Cargo[] = [];
    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        onProgress?.(`Analisando página ${pageNum} de ${pdf.numPages}...`, 10);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        if (textContent.items.length > 5) {
              // Text is present natively
                const items = textContent.items
                  .filter((item): item is any => {
                      // Basic filter to reduce false positives
                      return (
                          typeof item === 'object' &&
                          item !== null &&
                          'str' in item &&
                          typeof (item as any).str === 'string' &&
                          'transform' in item &&
                          Array.isArray((item as any).transform) &&
                          (item as any).transform.length >= 6
                      );
                  })
                  .map((item) => ({
                      str: (item as any).str,
                      x: (item as any).transform[4],
                      y: (item as any).transform[5]
                  }));

            items.sort((a, b) => {
              if (Math.abs(a.y - b.y) > 8) { 
                return b.y - a.y;
              }
              return a.x - b.x;
            });

            const lines: string[] = [];
            let currentLine = '';
            let lastY = items[0]?.y;

            for (const item of items) {
              if (Math.abs(lastY - item.y) > 8) {
                 lines.push(currentLine.trim());
                 currentLine = '';
                 lastY = item.y;
              }
              currentLine += item.str + (item.str.endsWith(' ') ? '' : ' ');
            }
            if (currentLine) lines.push(currentLine.trim());
            allLines.push(...lines);
        } else {
            // No native text, start OCR pipeline
            onProgress?.(`Imagem Detectada na pág ${pageNum}. Formatando scanner...`, 20);
            
            const viewport = page.getViewport({ scale: 2.5 }); // High res for OCR
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                  await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                  } as any).promise;
                const dataUrl = canvas.toDataURL('image/png');

                onProgress?.(`Extraindo letras da imagem (Motor IA)...`, 30);
                const result = await Tesseract.recognize(dataUrl, 'por', {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            onProgress?.(`Motor OCR Lendo Pág ${pageNum}...`, Math.round(30 + (m.progress * 60)));
                        } else if (m.status === 'loading tesseract core') {
                            onProgress?.(`Baixando Rede Neural (1ª vez)...`, 25);
                        }
                    }
                });

                const lines = result.data.text.split('\n').map(l => l.trim()).filter(l => l);
                allLines.push(...lines);
            }
        }
    }

    onProgress?.(`Filtrando e estruturando dados...`, 95);

    const hasSeenShipCode = allLines.some(l => l.includes(shipCode));
    if (!hasSeenShipCode) {
        throw new Error(`A embarcação "${shipCode}" não consta no roteiro de carga deste manifesto.`);
    }

    let currentOrigin = '';
    let currentDest = '';
    
    let manifestShipName = "Desconhecido";
    let manifestVoyage = "Desc";

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      PdfParserService.debugRawText += line + ' || ';

      if (line.includes(shipCode) && !line.includes('CxLxA') && !line.includes('Roteiro')) {
         const charIndex = line.indexOf(shipCode);
         if (charIndex !== -1) {
            if (charIndex < line.length / 2) {
               currentOrigin = shipCode;
               currentDest = 'OTHER';
            } else {
               currentOrigin = 'OTHER';
               currentDest = shipCode;
            }
         }
      }

      // Metadata extractions (Header)
      if (line.includes('EQUIPAMENTO') && manifestShipName === "Desconhecido") {
          const parts = line.split(/\s{2,}/);
          if (parts.length >= 3) {
             manifestShipName = parts[1].match(/^\d+/) ? parts[2] : parts[1];
          } else {
             const nextLine = allLines[i + 1];
             if (nextLine) manifestShipName = nextLine.replace(/\d+/g, '').trim() || nextLine;
          }
      }
      
      const atdMatch = line.match(/ATENDIMENTO:\s*(\d+)/i);
      if (atdMatch) manifestVoyage = atdMatch[1];

      // Cargo fallback matching Type, Description, Dimensions, Weight
      const cargoRegex = /(CONTAINER|SKID|TANQUE|CAIXA:?|BOMBA|CESTA|RACK|M-M|PALETE|TUBOS|BOBINA)[\s:]+(.*?)\s+((?:\d+[,.]\d{1,4}\s*[xX*×]\s*\d+[,.]\d{1,4}\s*[xX*×]\s*\d+[,.]\d{1,4})|-)\s+([\d.,]+)/i;
      const match = line.match(cargoRegex);

      if (match) {
         const [, type, restOfDesc, dimensions, peso] = match;
         
         const isLoad = currentDest === shipCode || (currentDest === '' && currentOrigin === '');
         const isBackload = currentOrigin === shipCode;

         if (isLoad || isBackload) {
            let lengthMeters = 0, widthMeters = 0, heightMeters = 0;
            if (dimensions && dimensions !== '-') {
               const dims = dimensions.split(/[xX*×]/).map(d => parseFloat(d.trim().replace(',', '.')));
               if (dims.length >= 2) {
                  lengthMeters = dims[0];
                  widthMeters = dims[1];
               }
               if (dims.length >= 3) {
                  heightMeters = dims[2];
               }
            }

            const numericPesoStr = peso.replace(/\./g, '').replace(',', '.');
            const weightTonnes = parseFloat(numericPesoStr) / 1000;
            const quantity = 1; 

            let identifier = restOfDesc;
            if (restOfDesc.includes(' ESL')) {
                identifier = restOfDesc.split(' ESL')[0].trim();
            } else if (restOfDesc.includes(' ESL.')) {
                identifier = restOfDesc.split(' ESL.')[0].trim();
            }
            // Fallback identifier if still too big
            if (identifier.length > 25) identifier = identifier.substring(0, 25);

            let category: any = 'GENERAL';
            const typeUpper = type.toUpperCase();
            if (typeUpper.includes('CONTAINER') || typeUpper.includes('CESTA')) category = 'CONTAINER';
            else if (typeUpper.includes('SKID') || typeUpper.includes('TANQUE') || weightTonnes > 20) category = 'HEAVY';

            const fullDescription = `${type} ${restOfDesc}`.trim();

            extractedCargos.push({
              id: crypto.randomUUID(),
              description: fullDescription,
              identifier: identifier, 
              weightTonnes: Number(weightTonnes.toFixed(2)),
              widthMeters: Number(widthMeters.toFixed(2)),
              lengthMeters: Number(lengthMeters.toFixed(2)),
              heightMeters: Number(heightMeters.toFixed(2)),
              quantity,
              category,
              status: 'UNALLOCATED',
              observations: isBackload ? 'BACKLOAD' : 'EMBARQUE'
            });
         }
      }
    }

    onProgress?.(`Concluído!`, 100);
    return { cargoes: extractedCargos, shipName: manifestShipName, voyage: manifestVoyage };
  }
}
