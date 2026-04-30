import jsPDF from 'jspdf';
import type { CargoLocation } from '@/domain/Location';
import type { Cargo } from '@/domain/Cargo';
import { useReportSettings } from '@/features/reportSettingsStore';

/**
 * Gera o relatório PDF do Plano de Carga Consolidado.
 * Inclui todos os dados do manifesto: embarcação, atendimento, roteiro,
 * origem/destino, dimensões e peso das cargas alocadas.
 */
export class PdfGeneratorService {

  /**
   * Coleta todas as cargas alocadas de todas as localidades para sumário.
   */
  private static getAllAllocatedCargoes(locations: CargoLocation[]): Cargo[] {
    const all: Cargo[] = [];
    for (const loc of locations) {
      for (const bay of loc.bays) {
        all.push(...bay.allocatedCargoes);
      }
    }
    return all;
  }

  /**
   * Gera Blob do PDF.
   * @param locations Lista de localidades com baias e cargas
   * @param shipName Nome da embarcação (do manifesto ou operacional)
   * @param atendimento Número de atendimento completo (ex: "509442339")
   */
  static async generateBlob(
    locations: CargoLocation[],
    shipName?: string | null,
    atendimento?: string | null
  ): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // ── Cabeçalho ────────────────────────────────────────────────────────────
    const HEADER_H = 28;
    doc.setFillColor(30, 30, 50);
    doc.rect(0, 0, pageWidth, HEADER_H, 'F');

    // Logo customizada (PNG sem fundo) — canto superior esquerdo dimensionada
    // automaticamente para caber dentro do header (margem vertical 3mm)
    const settings = useReportSettings.getState();
    if (settings.logoBase64) {
      try {
        // Calcula dimensões para caber no header com aspect ratio preservado
        const maxLogoH = HEADER_H - 6; // 22mm de altura útil
        const maxLogoW = 50; // limite horizontal seguro
        // Carrega imagem dinamicamente para descobrir aspect ratio
        const img = new Image();
        img.src = settings.logoBase64;
        // Síncronamente: assume já carregada no setLogoBase64. Se não tiver dimensões,
        // jsPDF aceita largura/altura proporcional (passa só altura, jsPDF mantém aspect)
        const ratio = img.naturalWidth && img.naturalHeight
          ? img.naturalWidth / img.naturalHeight
          : 2; // fallback para retangular horizontal
        let logoW = maxLogoH * ratio;
        let logoH = maxLogoH;
        if (logoW > maxLogoW) {
          logoW = maxLogoW;
          logoH = maxLogoW / ratio;
        }
        doc.addImage(settings.logoBase64, 'PNG', margin, (HEADER_H - logoH) / 2, logoW, logoH);
      } catch {
        /* Falha ao adicionar logo — segue sem ela. Usuário será notificado em outro fluxo. */
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PLANO DE CARGA CONSOLIDADO', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const atendimentoText = atendimento ? `Atendimento: ${atendimento}` : '';
    if (atendimentoText) {
      doc.text(atendimentoText, margin, 21);
    }

    if (shipName) {
      doc.setFontSize(11);
      doc.setTextColor(180, 200, 255);
      doc.text(`NAVIO: ${shipName.toUpperCase()}`, pageWidth / 2, 21, { align: 'center' });
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 21, { align: 'right' });


    // ── Linha separadora ─────────────────────────────────────────────────────
    doc.setTextColor(0, 0, 0);
    let y = 36;

    // ── Sumário Geral ─────────────────────────────────────────────────────────
    const allCargoes = this.getAllAllocatedCargoes(locations);
    const totalWeight = allCargoes.reduce((s, c) => s + c.weightTonnes * c.quantity, 0);
    const totalItems = allCargoes.length;

    doc.setFillColor(230, 235, 255);
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`RESUMO: ${totalItems} cargo(s) alocada(s) | Peso total: ${totalWeight.toFixed(2)} t`, margin + 3, y + 7);
    y += 15;

    // ── Conteúdo por Localidade ───────────────────────────────────────────────
    for (const loc of locations) {
      const occupiedBays = loc.bays.filter(b => b.allocatedCargoes.length > 0);
      if (occupiedBays.length === 0) continue;

      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      // Cabeçalho da localidade
      doc.setFillColor(50, 60, 100);
      doc.rect(margin, y, contentWidth, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(loc.name.toUpperCase(), margin + 3, y + 6.5);

      const locTotalWeight = occupiedBays
        .flatMap(b => b.allocatedCargoes)
        .reduce((s, c) => s + c.weightTonnes * c.quantity, 0);
      doc.text(`${locTotalWeight.toFixed(1)} t`, pageWidth - margin, y + 6.5, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      y += 12;

      for (const bay of occupiedBays) {
        if (y > pageHeight - 25) {
          doc.addPage();
          y = 20;
        }

        // Cabeçalho da baia
        doc.setFillColor(210, 215, 240);
        doc.rect(margin + 3, y, contentWidth - 3, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Baia ${String(bay.number).padStart(2, '0')}`, margin + 6, y + 5);

        const bayTotalWeight = bay.allocatedCargoes.reduce((s, c) => s + c.weightTonnes * c.quantity, 0);
        doc.text(
          `${bayTotalWeight.toFixed(1)} t / ${bay.maxWeightTonnes} t  |  ${bay.allocatedCargoes.length} carga(s)`,
          pageWidth - margin - 3, y + 5, { align: 'right' }
        );
        y += 8;
        doc.setFont('helvetica', 'normal');

        // Cabeçalho das colunas
        doc.setFillColor(240, 240, 250);
        doc.rect(margin + 3, y, contentWidth - 3, 5.5, 'F');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 100);
        doc.text('ID / CÓDIGO',            margin + 5,   y + 4);
        doc.text('DESCRIÇÃO',              margin + 50,  y + 4);
        doc.text('DIM (CxL m)',            margin + 175, y + 4);
        doc.text('PESO',                   margin + 210, y + 4);
        doc.text('CAT',                    pageWidth - margin - 3, y + 4, { align: 'right' });
        y += 6;
        doc.setTextColor(0, 0, 0);

        // Linhas das cargas
        for (const cargo of bay.allocatedCargoes) {
          if (y > pageHeight - 15) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');

          // Cor de fundo alternada e por backload
          if (cargo.isBackload) {
            doc.setFillColor(255, 240, 210);
          } else if (bay.allocatedCargoes.indexOf(cargo) % 2 === 0) {
            doc.setFillColor(250, 250, 255);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(margin + 3, y - 1, contentWidth - 3, 7, 'F');

          // Identificador
          const idText = cargo.identifier ? cargo.identifier.substring(0, 20) : cargo.id.substring(0, 8);
          doc.setFont('helvetica', 'bold');
          doc.text(idText, margin + 5, y + 4);

          // Descrição (com limite estendido)
          doc.setFont('helvetica', 'normal');
          const desc = (cargo.description || '').substring(0, 75);
          doc.text(desc, margin + 50, y + 4);

          // Dimensões
          const dims = (cargo.lengthMeters && cargo.widthMeters)
            ? `${cargo.lengthMeters.toFixed(1)}x${cargo.widthMeters.toFixed(1)}`
            : '-';
          doc.text(dims, margin + 175, y + 4);

          // Peso
          const weight = `${(cargo.weightTonnes * cargo.quantity).toFixed(2)} t`;
          doc.text(weight, margin + 210, y + 4);

          // Categoria
          doc.setFont('helvetica', 'bold');
          const catColor = this.getCategoryColor(cargo.category);
          doc.setTextColor(catColor[0], catColor[1], catColor[2]);
          doc.text(cargo.category, pageWidth - margin - 3, y + 4, { align: 'right' });
          doc.setTextColor(0, 0, 0);

          // Indicador BACKLOAD
          if (cargo.isBackload) {
            doc.setFontSize(6);
            doc.setTextColor(200, 100, 0);
            doc.text('BACKLOAD', margin + 5, y + 0);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(7.5);
          }

          y += 7;
        }
        y += 4;
      }
      y += 4;
    }

    // ── Rodapé com dados do manifesto ────────────────────────────────────────
    if (y > pageHeight - 30) {
      doc.addPage();
      y = pageHeight - 30;
    } else {
      y = pageHeight - 25;
    }

    doc.setLineWidth(0.3);
    doc.setDrawColor(100, 100, 150);
    doc.line(margin, y - 5, pageWidth - margin, y - 5);

    // Dados do atendimento no rodapé
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    if (atendimento) {
      doc.text(`Nº Atendimento: ${atendimento}`, margin, y);
    }

    // Assinatura única configurável (substitui Imediato + Comandante)
    y += 8;
    doc.setLineWidth(0.5);
    const sigCenterX = pageWidth / 2;
    const sigLineHalf = 45;
    doc.line(sigCenterX - sigLineHalf, y, sigCenterX + sigLineHalf, y);
    y += 5;
    doc.setFontSize(9);
    const signatoryName = settings.signatoryName.trim();
    const signatoryRole = settings.signatoryRole.trim();
    if (signatoryName || signatoryRole) {
      const sigLabel = signatoryName && signatoryRole
        ? `${signatoryName} — ${signatoryRole}`
        : signatoryName || signatoryRole;
      doc.text(sigLabel, sigCenterX, y, { align: 'center' });
    } else {
      doc.setTextColor(140, 140, 140);
      doc.text('Responsável (configure em "Configurar Relatório")', sigCenterX, y, { align: 'center' });
      doc.setTextColor(80, 80, 80);
    }

    return doc.output('blob');
  }

  /** Retorna cor RGB para categoria */
  private static getCategoryColor(category: string): [number, number, number] {
    switch (category) {
      case 'CONTAINER':  return [230, 100,  20];
      case 'HAZARDOUS':  return [200,  20,  20];
      case 'HEAVY':      return [140,  40, 200];
      case 'BASKET':     return [ 30, 150,  30];
      case 'TUBULAR':    return [100,  40, 180];
      case 'EQUIPMENT':  return [180, 140,  10];
      case 'FRAGILE':    return [150,  80, 200];
      default:           return [ 50,  80, 200]; // GENERAL - azul
    }
  }

  /**
   * Executa a exportação direta (download no navegador).
   */
  static async executeExport(
    locations: CargoLocation[],
    filename = 'Plano_de_Carga_Consolidado.pdf',
    shipName?: string | null,
    atendimento?: string | null
  ): Promise<void> {
    const blob = await this.generateBlob(locations, shipName, atendimento);
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