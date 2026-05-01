import type { CargoLocation } from '@/domain/Location';
import type { Cargo } from '@/domain/Cargo';
import type { Container, ContainerItem } from '@/domain/Container';
import { CONTAINER_TYPE_LABELS } from '@/domain/Container';
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
    // jsPDF é importado dinamicamente para que ~80 KB gz não pesem no LCP
    // de quem nunca exporta PDF.
    const { default: jsPDF } = await import('jspdf');
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
      doc.text(`UNIDADE: ${shipName.toUpperCase()}`, pageWidth / 2, 21, { align: 'center' });
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

  // ─────────────────────────────────────────────────────────────────────────
  // CONTAINERS DANFE — Relatório estruturado em árvore
  // (Container → Itens). Layout independente do plano de cargas offshore.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gera Blob do PDF consolidado de containers DANFE. Cada container ocupa
   * uma seção com cabeçalho destacado e tabela compacta das 15 colunas.
   * Page break automático quando próximo do fim da página.
   */
  static async generateContainersBlob(
    containers: Container[],
    itemsByContainer: Map<string, ContainerItem[]>
  ): Promise<Blob> {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    // Ordena containers por nome em ordem alfabética pt-BR. Sumário e
    // páginas seguem a mesma ordem para a navegação ser previsível.
    const sortedContainers = [...containers].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );

    // ── Capa ────────────────────────────────────────────────────────────────
    const HEADER_H = 28;
    doc.setFillColor(15, 23, 42); // navy escuro #0F172A
    doc.rect(0, 0, pageWidth, HEADER_H, 'F');

    const settings = useReportSettings.getState();
    if (settings.logoBase64) {
      try {
        const img = new Image();
        img.src = settings.logoBase64;
        const ratio = img.naturalWidth && img.naturalHeight
          ? img.naturalWidth / img.naturalHeight
          : 2;
        const maxLogoH = HEADER_H - 6;
        const maxLogoW = 50;
        let logoW = maxLogoH * ratio;
        let logoH = maxLogoH;
        if (logoW > maxLogoW) {
          logoW = maxLogoW;
          logoH = maxLogoW / ratio;
        }
        doc.addImage(settings.logoBase64, 'PNG', margin, (HEADER_H - logoH) / 2, logoW, logoH);
      } catch {
        /* segue sem logo */
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('RELATÓRIO DE CONTAINERS', pageWidth / 2, 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 220, 255); // cyan claro
    doc.text(`${sortedContainers.length} unidade(s) - ${this.countTotalItems(itemsByContainer)} item(ns) totais`,
      pageWidth / 2, 18, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      pageWidth - margin, 21, { align: 'right' });

    let y = HEADER_H + 6;
    doc.setTextColor(0, 0, 0);

    // ── Resumo executivo (3 KPIs) ───────────────────────────────────────────
    // Calcula agregados uma única vez — alimenta tanto o resumo quanto o
    // total geral no rodapé do sumário, evitando duplo loop.
    const totalsByContainer = new Map<string, number>();
    let grandTotal = 0;
    let totalItems = 0;
    for (const c of sortedContainers) {
      const items = itemsByContainer.get(c.id) ?? [];
      const totalC = items.reduce((s, it) => s + it.vlTotal, 0);
      totalsByContainer.set(c.id, totalC);
      grandTotal += totalC;
      totalItems += items.length;
    }

    const KPI_H = 22;
    const KPI_GAP = 4;
    const KPI_W = (contentWidth - KPI_GAP * 2) / 3;
    const kpis: { label: string; value: string }[] = [
      { label: 'TOTAL DE UNIDADES', value: String(sortedContainers.length) },
      { label: 'TOTAL DE ITENS', value: String(totalItems) },
      {
        label: 'VALOR TOTAL',
        value: `R$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    ];

    for (let i = 0; i < kpis.length; i++) {
      const kx = margin + i * (KPI_W + KPI_GAP);
      doc.setFillColor(230, 235, 255);
      doc.roundedRect(kx, y, KPI_W, KPI_H, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(80, 90, 110);
      doc.text(kpis[i].label, kx + KPI_W / 2, y + 7, { align: 'center' });

      doc.setFontSize(13);
      doc.setTextColor(20, 30, 60);
      doc.text(kpis[i].value, kx + KPI_W / 2, y + 16, { align: 'center' });
    }
    y += KPI_H + 6;

    // ── Sumário ─────────────────────────────────────────────────────────────
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(230, 235, 255);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SUMÁRIO', margin + 3, y + 5.5);
    y += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    for (const c of sortedContainers) {
      const items = itemsByContainer.get(c.id) ?? [];
      const totalC = totalsByContainer.get(c.id) ?? 0;
      if (y > pageHeight - 20) { doc.addPage(); y = 15; }
      // ASCII-only — emoji 📦 e middle-dot · viram mojibake na fonte default
      // do jsPDF (Helvetica não tem suporte UTF-8 multi-byte).
      const label = `${c.name}  -  ${CONTAINER_TYPE_LABELS[c.type]}  -  ${items.length} item(ns)`;
      doc.text(label, margin + 3, y);
      doc.text(`R$ ${totalC.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pageWidth - margin - 3, y, { align: 'right' });
      y += 5;
    }

    // Total geral
    if (y > pageHeight - 15) { doc.addPage(); y = 15; }
    y += 3;
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL GERAL', margin + 3, y);
    doc.setTextColor(20, 120, 80);
    doc.text(`R$ ${grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 3, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // ── Por container ───────────────────────────────────────────────────────
    for (const c of sortedContainers) {
      doc.addPage();
      y = 15;
      this.renderContainerSection(doc, c, itemsByContainer.get(c.id) ?? [], pageWidth, pageHeight, margin, contentWidth);
    }

    // ── Rodapé com assinatura ───────────────────────────────────────────────
    const lastPageY = pageHeight - 18;
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    const sigCenterX = pageWidth / 2;
    const sigLineHalf = 45;
    doc.line(sigCenterX - sigLineHalf, lastPageY, sigCenterX + sigLineHalf, lastPageY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const signatoryName = settings.signatoryName.trim();
    const signatoryRole = settings.signatoryRole.trim();
    if (signatoryName || signatoryRole) {
      const sigLabel = signatoryName && signatoryRole
        ? `${signatoryName} — ${signatoryRole}`
        : signatoryName || signatoryRole;
      doc.text(sigLabel, sigCenterX, lastPageY + 5, { align: 'center' });
    } else {
      doc.setTextColor(140, 140, 140);
      doc.text('Responsável (configure em "Configurar Relatório")',
        sigCenterX, lastPageY + 5, { align: 'center' });
    }

    // ── Rodapé numerado em todas as páginas ─────────────────────────────────
    // jsPDF não numera automático — pintamos depois que todas as páginas
    // existem para conhecer o total. Coordena Y=pageHeight-6 fica abaixo
    // da assinatura (pageHeight-18) sem conflitar.
    const totalPages = doc.getNumberOfPages();
    const emittedAt = new Date().toLocaleString('pt-BR');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.text(`Emitido em ${emittedAt}`, margin, pageHeight - 6);
      doc.text(`Pág ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }

    return doc.output('blob');
  }

  /** Soma a contagem de itens em todos os containers. */
  private static countTotalItems(itemsByContainer: Map<string, ContainerItem[]>): number {
    let total = 0;
    for (const items of itemsByContainer.values()) total += items.length;
    return total;
  }

  /**
   * Desenha a seção de um container individual no PDF: cabeçalho destacado +
   * tabela compacta das 15 colunas + rodapé totalizador.
   */
  private static renderContainerSection(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc: any,
    container: Container,
    items: ContainerItem[],
    pageWidth: number,
    pageHeight: number,
    margin: number,
    contentWidth: number
  ): void {
    let y = 15;

    // Cabeçalho do container (estilo "pasta")
    doc.setFillColor(30, 60, 120); // navy mais claro
    doc.rect(margin, y, contentWidth, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(container.name, margin + 4, y + 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 220, 255);
    const meta = `${CONTAINER_TYPE_LABELS[container.type]} - ${container.status} - ${items.length} item(ns)`;
    doc.text(meta, pageWidth - margin - 4, y + 7, { align: 'right' });
    y += 14;
    doc.setTextColor(0, 0, 0);

    if (items.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('(Container vazio — sem itens cadastrados.)', margin + 4, y + 4);
      doc.setTextColor(0, 0, 0);
      return;
    }

    // Header da tabela — 15 colunas compactas + cód
    const cols: { label: string; w: number; align?: 'right' | 'left' }[] = [
      { label: 'COD.PROD',  w: 22 },
      { label: 'DESCRIÇÃO', w: 70 },
      { label: 'NCM',       w: 14 },
      { label: 'CST',       w: 8 },
      { label: 'CFOP',      w: 10 },
      { label: 'UND',       w: 8 },
      { label: 'QTDE',      w: 12, align: 'right' },
      { label: 'VL.UNIT',   w: 16, align: 'right' },
      { label: 'VL.TOTAL',  w: 18, align: 'right' },
      { label: 'DESC',      w: 12, align: 'right' },
      { label: 'BC.ICMS',   w: 14, align: 'right' },
      { label: 'VL.ICMS',   w: 14, align: 'right' },
      { label: 'V.IPI',     w: 12, align: 'right' },
      { label: 'AL.IC',     w: 9,  align: 'right' },
      { label: 'AL.IP',     w: 9,  align: 'right' },
    ];

    // Cabeçalho de colunas
    doc.setFillColor(26, 40, 71);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    let x = margin + 1;
    for (const col of cols) {
      const tx = col.align === 'right' ? x + col.w - 1 : x + 1;
      doc.text(col.label, tx, y + 4, { align: col.align ?? 'left' });
      x += col.w;
    }
    y += 7;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Linhas
    let subQtde = 0;
    let subTotal = 0;
    let subIcms = 0;
    let subIpi = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      // Page break se necessário
      if (y > pageHeight - 25) {
        doc.addPage();
        y = 15;
        // Re-renderiza cabeçalho da tabela na nova página
        doc.setFillColor(26, 40, 71);
        doc.rect(margin, y, contentWidth, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        let xh = margin + 1;
        for (const col of cols) {
          const tx = col.align === 'right' ? xh + col.w - 1 : xh + 1;
          doc.text(col.label, tx, y + 4, { align: col.align ?? 'left' });
          xh += col.w;
        }
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
      }

      // Zebra striping
      if (i % 2 === 0) {
        doc.setFillColor(245, 247, 252);
        doc.rect(margin, y, contentWidth, 5, 'F');
      }

      doc.setFontSize(6);
      let cx = margin + 1;
      const cells = [
        it.codProd,
        (it.descricao ?? '').slice(0, 90),
        it.ncmSh,
        it.cst,
        it.cfop,
        it.unid,
        it.qtde.toLocaleString('pt-BR', { maximumFractionDigits: 4 }),
        it.vlUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
        it.vlTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        it.vlDesconto > 0 ? it.vlDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
        it.bcIcms.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        it.vlIcms.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        it.vlIpi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        it.aliqIcms.toFixed(2),
        it.aliqIpi.toFixed(2),
      ];
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c];
        const tx = col.align === 'right' ? cx + col.w - 1 : cx + 1;
        doc.text(String(cells[c] ?? ''), tx, y + 3.5, { align: col.align ?? 'left' });
        cx += col.w;
      }
      y += 5;

      subQtde += it.qtde;
      subTotal += it.vlTotal;
      subIcms += it.vlIcms;
      subIpi += it.vlIpi;
    }

    // Rodapé totalizador da tabela
    if (y > pageHeight - 12) { doc.addPage(); y = 15; }
    y += 1;
    doc.setFillColor(220, 230, 255);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`SUBTOTAL - ${items.length} item(ns)`, margin + 2, y + 4);
    const totalLabel = `Qtde: ${subQtde.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} - `
      + `Total: R$ ${subTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - `
      + `ICMS: R$ ${subIcms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - `
      + `IPI: R$ ${subIpi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    doc.text(totalLabel, pageWidth - margin - 2, y + 4, { align: 'right' });
  }

  /**
   * Executa o download do relatório de containers. Filename pt-BR formatado.
   */
  static async executeContainersExport(
    containers: Container[],
    itemsByContainer: Map<string, ContainerItem[]>
  ): Promise<void> {
    const blob = await this.generateContainersBlob(containers, itemsByContainer);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const filename = `Containers_${dd}${mm}${yyyy}_${hh}${min}.pdf`;

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