import jsPDF from 'jspdf';
import type { CargoLocation } from '@/domain/Location';

export class PdfGeneratorService {
  static async executeExport(locations: CargoLocation[], shipName = "Ocean Explorer", voyage = "V-402") {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('Plano de Carga Consolidado', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Navio: ${shipName}`, 20, 40);
    doc.text(`Atendimento: ${voyage}`, 20, 48);
    
    let totalBaysUsed = 0;
    let totalBays = 0;
    let totalWeight = 0;

    locations.forEach(loc => {
       totalBays += loc.bays.length;
       totalBaysUsed += loc.bays.filter(b => b.allocatedCargoes.length > 0).length;
       totalWeight += loc.bays.reduce((acc, b) => acc + b.currentWeightTonnes, 0);
    });

    doc.text(`Baias Utilizadas: ${totalBaysUsed} de ${totalBays}`, 140, 40);
    doc.text(`Peso Total de Carga: ${totalWeight.toFixed(2)} t`, 140, 48);

    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);
    
    let y = 65;
    
    for (const loc of locations) {
       const occupiedBays = loc.bays.filter(b => b.allocatedCargoes.length > 0);
       if (occupiedBays.length === 0) continue;

       if (y > 250) {
         doc.addPage();
         y = 20;
       }

       doc.setFontSize(16);
       doc.setFont("helvetica", "bold");
       doc.text(loc.name.toUpperCase(), 20, y);
       y += 10;
       doc.setFont("helvetica", "normal");
       
       for (const bay of occupiedBays) {
           if (y > 270) {
             doc.addPage();
             y = 20;
           }
           
           doc.setFontSize(14);
           doc.text(`Baia ${String(bay.number).padStart(2, '0')}`, 20, y);
           doc.setFontSize(11);
           doc.text(`Ocupação: ${bay.currentWeightTonnes.toFixed(1)}t / ${bay.maxWeightTonnes}t`, 140, y);
           y += 8;
           
           doc.setFontSize(10);
            for (const cargo of bay.allocatedCargoes) {
               const fullDesc = `- ${cargo.description}`;
               const truncatedDesc = fullDesc.length > 70 ? fullDesc.substring(0, 67) + '...' : fullDesc;
               
               doc.text(truncatedDesc, 25, y);
               doc.text(`${cargo.weightTonnes.toFixed(1)} t`, 145, y); // Empurrado de 120 para 145
               doc.text(`${cargo.category}`, 165, y); // Empurrado de 150 para 165
               y += 6;
            }
           y += 6;
       }
       y += 4;
    }

    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    y += 20;
    doc.setLineWidth(0.5);
    doc.line(40, y, 100, y);
    doc.line(110, y, 170, y);
    
    y += 5;
    doc.setFontSize(10);
    doc.text('Imediato (Chief Officer)', 70, y, { align: 'center' });
    doc.text('Comandante (Master)', 140, y, { align: 'center' });

    doc.save('Plano_de_Carga_Consolidado.pdf');
  }
}
