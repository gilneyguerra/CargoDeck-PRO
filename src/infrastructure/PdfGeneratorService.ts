import jsPDF from 'jspdf';
import type { CargoLocation } from '@/domain/Location';

export class PdfGeneratorService {
  static async generateBlob(locations: CargoLocation[], shipName = "Ocean Explorer", voyage = "V-402"): Promise<Blob> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('Plano de Carga Consolidado', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Navio: ${shipName}`, 20, 40);
    doc.text(`Atendimento: ${voyage}`, 20, 48);
    doc.text(`Data de Geração: ${new Date().toLocaleString()}`, 20, 56);
    
    doc.setLineWidth(0.5);
    doc.line(20, 63, 190, 63);
    
    let y = 73;
    
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
             const bayTotalWeight = bay.allocatedCargoes.reduce((sum, cargo) => sum + (cargo.weightTonnes * cargo.quantity), 0);
             doc.setFontSize(11);
             doc.text(`Ocupação: ${bayTotalWeight.toFixed(1)}t / ${bay.maxWeightTonnes}t`, 140, y);
            y += 8;
            
            // Add counts per side
            const portCount = bay.allocatedCargoes.filter(c => c.positionInBay === 'port').length;
            const centerCount = bay.allocatedCargoes.filter(c => c.positionInBay === 'center' || !c.positionInBay).length;
            const starboardCount = bay.allocatedCargoes.filter(c => c.positionInBay === 'starboard').length;
            
            doc.setFontSize(10);
            doc.text(`Bombordo: ${portCount} cargas`, 25, y);
            doc.text(`Centro: ${centerCount} cargas`, 80, y);
            doc.text(`Boreste: ${starboardCount} cargas`, 130, y);
            y += 8;
            
            doc.setFontSize(10);
             for (const cargo of bay.allocatedCargoes) {
                const fullDesc = `- ${cargo.description}`;
                const truncatedDesc = fullDesc.length > 70 ? fullDesc.substring(0, 67) + '...' : fullDesc;
                const totalWeight = cargo.weightTonnes * cargo.quantity;
                
                doc.text(truncatedDesc, 25, y);
                doc.text(`${totalWeight.toFixed(1)} t (${cargo.quantity}x ${cargo.weightTonnes.toFixed(1)}t)`, 145, y);
                doc.text(`${cargo.category}`, 165, y);
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

    return doc.output('blob');
  }

  static async executeExport(locations: CargoLocation[], shipName = "Ocean Explorer", voyage = "V-402", filename = 'Plano_de_Carga_Consolidado.pdf') {
    const blob = await this.generateBlob(locations, shipName, voyage);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}