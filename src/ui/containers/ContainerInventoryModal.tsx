import { useState, useEffect, useMemo, useId, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Trash2, Save, FileSpreadsheet, FileText, AlertCircle, Package, Loader2,
} from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useContainerStore } from '@/features/containerStore';
import { useNotificationStore } from '@/features/notificationStore';
import { reportException } from '@/features/errorReporter';
import {
  parseDecimalBR, parseExcelToMatrix, parseCsvToMatrix,
} from '@/lib/spreadsheetParser';
import { extractDanfeFromPdf } from '@/services/danfeExtractor';
import { computeVlTotal, type Container, type ContainerItem } from '@/domain/Container';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  container: Container | null;
  onClose: () => void;
  /** Disparado pelo botão "Exportar PDF". Wiring real é Fase 8. */
  onExportPdf?: (container: Container) => void;
}

// ─── Tipos internos ──────────────────────────────────────────────────────────

type EditableField =
  | 'codProd' | 'descricao' | 'ncmSh' | 'cst' | 'cfop' | 'unid'
  | 'qtde' | 'vlUnitario' | 'vlDesconto'
  | 'bcIcms' | 'vlIcms' | 'vlIpi' | 'aliqIcms' | 'aliqIpi';

interface EditorRow {
  /** ID local para tracking. Se vier do banco, é o UUID; se for novo, mkId(). */
  id: string;
  /** ID original do banco (undefined para linhas novas). */
  persistedId?: string;
  codProd: string;
  descricao: string;
  ncmSh: string;
  cst: string;
  cfop: string;
  unid: string;
  qtde: string;        // armazenado como string para preservar input do user
  vlUnitario: string;
  vlDesconto: string;
  bcIcms: string;
  vlIcms: string;
  vlIpi: string;
  aliqIcms: string;
  aliqIpi: string;
  errors: Partial<Record<EditableField, string>>;
  selected: boolean;
  dirty: boolean;
}

function mkId() { return Math.random().toString(36).slice(2, 9); }

function emptyRow(): EditorRow {
  return {
    id: mkId(),
    codProd: '', descricao: '', ncmSh: '', cst: '', cfop: '', unid: 'UN',
    qtde: '', vlUnitario: '', vlDesconto: '0',
    bcIcms: '0', vlIcms: '0', vlIpi: '0', aliqIcms: '0', aliqIpi: '0',
    errors: {}, selected: false, dirty: true,
  };
}

function rowFromItem(item: ContainerItem): EditorRow {
  return {
    id: item.id,
    persistedId: item.id,
    codProd: item.codProd,
    descricao: item.descricao,
    ncmSh: item.ncmSh,
    cst: item.cst,
    cfop: item.cfop,
    unid: item.unid,
    qtde: String(item.qtde).replace('.', ','),
    vlUnitario: String(item.vlUnitario).replace('.', ','),
    vlDesconto: String(item.vlDesconto).replace('.', ','),
    bcIcms: String(item.bcIcms).replace('.', ','),
    vlIcms: String(item.vlIcms).replace('.', ','),
    vlIpi: String(item.vlIpi).replace('.', ','),
    aliqIcms: String(item.aliqIcms).replace('.', ','),
    aliqIpi: String(item.aliqIpi).replace('.', ','),
    errors: {},
    selected: false,
    dirty: false,
  };
}

// ─── Validação ───────────────────────────────────────────────────────────────

function validateRow(row: EditorRow): EditorRow {
  const errors: Partial<Record<EditableField, string>> = {};

  if (!row.codProd.trim()) errors.codProd = 'Obrigatório';
  else if (row.codProd.length > 20) errors.codProd = 'Máx. 20 caracteres';

  if (!row.descricao.trim()) errors.descricao = 'Obrigatório';
  else if (row.descricao.length > 500) errors.descricao = 'Máx. 500 caracteres';

  if (row.ncmSh && !/^\d{8}$/.test(row.ncmSh)) errors.ncmSh = 'NCM/SH deve ter 8 dígitos';
  if (row.cst && !/^\d{3}$/.test(row.cst)) errors.cst = 'CST deve ter 3 dígitos';
  if (row.cfop && !/^\d{4}$/.test(row.cfop)) errors.cfop = 'CFOP deve ter 4 dígitos';
  if (row.unid && row.unid.length > 6) errors.unid = 'Máx. 6 caracteres';

  const qtde = parseDecimalBR(row.qtde);
  const vlUnitario = parseDecimalBR(row.vlUnitario);
  const vlDesconto = parseDecimalBR(row.vlDesconto);
  if (qtde < 0) errors.qtde = 'Não pode ser negativo';
  if (vlUnitario < 0) errors.vlUnitario = 'Não pode ser negativo';
  if (vlDesconto < 0) errors.vlDesconto = 'Não pode ser negativo';

  const aliqIcms = parseDecimalBR(row.aliqIcms);
  const aliqIpi = parseDecimalBR(row.aliqIpi);
  if (aliqIcms < 0 || aliqIcms > 100) errors.aliqIcms = '0 a 100';
  if (aliqIpi < 0 || aliqIpi > 100) errors.aliqIpi = '0 a 100';

  return { ...row, errors };
}

// ─── Mapeamento de import Excel/CSV ──────────────────────────────────────────
// Aceita variações de cabeçalhos em pt-BR e PT/EN.

const HEADER_ALIASES: Record<string, EditableField | 'skip'> = {
  'COD.PROD.': 'codProd', 'COD PROD': 'codProd', 'CODIGO': 'codProd', 'CÓDIGO': 'codProd', 'CODPROD': 'codProd', 'CODPRD': 'codProd',
  'DESCRIÇÃO': 'descricao', 'DESCRICAO': 'descricao', 'DESCRIÇÃO DO PRODUTO': 'descricao', 'DESCRIÇÃO DO PRODUTO / SERVIÇO': 'descricao',
  'NCM': 'ncmSh', 'NCM/SH': 'ncmSh', 'NCMSH': 'ncmSh',
  'CST': 'cst',
  'CFOP': 'cfop',
  'UNID': 'unid', 'UNIDADE': 'unid',
  'QTDE': 'qtde', 'QUANTIDADE': 'qtde', 'QTD': 'qtde',
  'VL.UNITÁRIO': 'vlUnitario', 'VL UNITARIO': 'vlUnitario', 'VL UNITÁRIO': 'vlUnitario', 'VL.UNIT': 'vlUnitario', 'VL UNIT': 'vlUnitario', 'VLUNITARIO': 'vlUnitario',
  'VL.TOTAL': 'skip', 'VL TOTAL': 'skip', // calculado
  'VL.DESCONTO': 'vlDesconto', 'VL DESCONTO': 'vlDesconto', 'DESCONTO': 'vlDesconto',
  'BC.ICMS': 'bcIcms', 'BC ICMS': 'bcIcms', 'BCICMS': 'bcIcms',
  'VL.ICMS': 'vlIcms', 'VL ICMS': 'vlIcms', 'VLICMS': 'vlIcms',
  'V.IPI': 'vlIpi', 'V IPI': 'vlIpi', 'VL.IPI': 'vlIpi', 'VL IPI': 'vlIpi',
  'ALÍQ.ICMS': 'aliqIcms', 'ALIQ.ICMS': 'aliqIcms', 'ALIQ ICMS': 'aliqIcms', 'ALIQICMS': 'aliqIcms',
  'ALÍQ.IPI': 'aliqIpi', 'ALIQ.IPI': 'aliqIpi', 'ALIQ IPI': 'aliqIpi', 'ALIQIPI': 'aliqIpi',
};

function normalizeHeader(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ').replace(/\s*\.\s*/g, '.');
}

function matrixToRows(data: string[][]): EditorRow[] {
  if (data.length < 2) return [];
  const headers = data[0].map(normalizeHeader);
  const fieldByCol: (EditableField | 'skip' | null)[] = headers.map(h => HEADER_ALIASES[h] ?? null);

  const rows: EditorRow[] = [];
  for (let r = 1; r < data.length; r++) {
    const cells = data[r];
    if (!cells.some(c => c.trim())) continue;
    const row = emptyRow();
    for (let c = 0; c < cells.length; c++) {
      const field = fieldByCol[c];
      if (!field || field === 'skip') continue;
      row[field] = String(cells[c] ?? '').trim();
    }
    rows.push(validateRow(row));
  }
  return rows;
}

// ─── Componente principal ────────────────────────────────────────────────────

const COL_HEADERS: { key: EditableField | 'vlTotal'; label: string; width: string; numeric?: boolean }[] = [
  { key: 'codProd',    label: 'COD.PROD.',  width: '110px' },
  { key: 'descricao',  label: 'DESCRIÇÃO',  width: '300px' },
  { key: 'ncmSh',      label: 'NCM/SH',     width: '90px' },
  { key: 'cst',        label: 'CST',        width: '60px' },
  { key: 'cfop',       label: 'CFOP',       width: '70px' },
  { key: 'unid',       label: 'UNID',       width: '60px' },
  { key: 'qtde',       label: 'QTDE',       width: '80px',  numeric: true },
  { key: 'vlUnitario', label: 'VL. UNIT.',  width: '100px', numeric: true },
  { key: 'vlTotal',    label: 'VL. TOTAL',  width: '100px', numeric: true },
  { key: 'vlDesconto', label: 'VL. DESC.',  width: '90px',  numeric: true },
  { key: 'bcIcms',     label: 'BC. ICMS',   width: '90px',  numeric: true },
  { key: 'vlIcms',     label: 'VL. ICMS',   width: '90px',  numeric: true },
  { key: 'vlIpi',      label: 'V. IPI',     width: '80px',  numeric: true },
  { key: 'aliqIcms',   label: 'AL. ICMS',   width: '70px',  numeric: true },
  { key: 'aliqIpi',    label: 'AL. IPI',    width: '70px',  numeric: true },
];

export function ContainerInventoryModal({
  isOpen,
  container,
  onClose,
  onExportPdf,
}: Props) {
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const { items, addItems, removeItems, updateItem } = useContainerStore();
  const { notify, ask } = useNotificationStore();

  const [rows, setRows] = useState<EditorRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);

  // Carrega rows ao abrir / trocar de container
  useEffect(() => {
    if (!isOpen || !container) return;
    const existing = items.filter(it => it.containerId === container.id).map(rowFromItem);
    setRows(existing);
  }, [isOpen, container, items]);

  const updateField = useCallback((rowId: string, field: EditableField, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const next = { ...r, [field]: value, dirty: true };
      return validateRow(next);
    }));
  }, []);

  const toggleRowSelected = (rowId: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, selected: !r.selected } : r));
  };

  const toggleAllSelected = () => {
    const allSel = rows.length > 0 && rows.every(r => r.selected);
    setRows(prev => prev.map(r => ({ ...r, selected: !allSel })));
  };

  const addEmptyRow = () => {
    setRows(prev => [...prev, emptyRow()]);
  };

  const removeRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  const handleDeleteSelected = async () => {
    const selectedRows = rows.filter(r => r.selected);
    if (selectedRows.length === 0) {
      notify('Selecione ao menos 1 linha.', 'warning');
      return;
    }
    const ok = await ask(
      'Excluir itens',
      `Excluir ${selectedRows.length} item(ns) deste container? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;

    const persistedIds = selectedRows.map(r => r.persistedId).filter((x): x is string => !!x);
    if (persistedIds.length > 0) await removeItems(persistedIds);
    setRows(prev => prev.filter(r => !r.selected));
    notify(`${selectedRows.length} item(ns) excluído(s).`, 'success');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset para permitir reimportar mesmo arquivo
    try {
      let matrix: string[][];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        matrix = parseCsvToMatrix(text);
      } else {
        const buffer = await file.arrayBuffer();
        matrix = await parseExcelToMatrix(buffer);
      }
      const imported = matrixToRows(matrix);
      if (imported.length === 0) {
        notify('Nenhuma linha válida encontrada no arquivo.', 'warning');
        return;
      }
      setRows(prev => [...prev, ...imported]);
      notify(`${imported.length} linha(s) importada(s). Revise antes de salvar.`, 'info');
    } catch (err) {
      reportException(err, {
        title: 'Falha ao importar arquivo',
        category: 'import',
        source: 'container-inventory-import',
        suggestion: 'Confirme que o arquivo é XLSX ou CSV válido com cabeçalhos compatíveis (COD.PROD., DESCRIÇÃO, NCM/SH...).',
      });
      notify('Não foi possível ler o arquivo. Veja a bandeja de erros.', 'error');
    }
  };

  const handleImportPdfDanfe = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      notify('Selecione um arquivo PDF.', 'warning');
      return;
    }

    setExtractingPdf(true);
    try {
      const result = await extractDanfeFromPdf(file);
      if (result.items.length === 0) {
        notify('Nenhum item DANFE encontrado no PDF.', 'warning');
        return;
      }
      // Converte ContainerItemImport[] em EditorRow[] já validados
      const imported: EditorRow[] = result.items.map(it => validateRow({
        id: mkId(),
        codProd: it.codProd ?? '',
        descricao: it.descricao ?? '',
        ncmSh: it.ncmSh ?? '',
        cst: it.cst ?? '',
        cfop: it.cfop ?? '',
        unid: it.unid ?? 'UN',
        qtde: String(it.qtde ?? 0).replace('.', ','),
        vlUnitario: String(it.vlUnitario ?? 0).replace('.', ','),
        vlDesconto: String(it.vlDesconto ?? 0).replace('.', ','),
        bcIcms: String(it.bcIcms ?? 0).replace('.', ','),
        vlIcms: String(it.vlIcms ?? 0).replace('.', ','),
        vlIpi: String(it.vlIpi ?? 0).replace('.', ','),
        aliqIcms: String(it.aliqIcms ?? 0).replace('.', ','),
        aliqIpi: String(it.aliqIpi ?? 0).replace('.', ','),
        errors: {},
        selected: false,
        dirty: true,
      }));

      setRows(prev => [...prev, ...imported]);

      const headerInfo = result.header?.numero
        ? ` (NF-e ${result.header.numero}${result.header.serie ? ` série ${result.header.serie}` : ''})`
        : '';
      const warnSuffix = result.validationWarning ? ' — revise as células destacadas em vermelho' : '';
      const sourceLabel = result.strategy === 'parser'
        ? 'via leitor PDF'
        : `via IA${result.modelUsed ? ` (${result.modelUsed})` : ''}`;
      notify(
        `${imported.length} item(ns) extraído(s) ${sourceLabel}${headerInfo}${warnSuffix}.`,
        result.validationWarning ? 'warning' : 'success'
      );
    } catch (err) {
      reportException(err, {
        title: 'Falha ao extrair DANFE',
        category: 'import',
        source: 'container-inventory-pdf-danfe',
        suggestion: 'Confirme que o PDF é uma NF-e digital (não escaneada) e que sua chave OpenCode Zen está válida.',
      });
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      notify(`Não foi possível extrair o DANFE: ${msg}`, 'error');
    } finally {
      setExtractingPdf(false);
    }
  };

  const handleSaveAll = async () => {
    if (!container) return;
    const dirtyRows = rows.filter(r => r.dirty);
    if (dirtyRows.length === 0) {
      notify('Nenhuma alteração para salvar.', 'info');
      return;
    }

    // Bloqueia se alguma linha tem erro
    const withErrors = dirtyRows.filter(r => Object.keys(r.errors).length > 0);
    if (withErrors.length > 0) {
      notify(`Corrija os ${withErrors.length} erro(s) antes de salvar.`, 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<ContainerItem>[] = dirtyRows.map(r => ({
        id: r.persistedId,
        codProd: r.codProd.trim(),
        descricao: r.descricao.trim(),
        ncmSh: r.ncmSh.trim(),
        cst: r.cst.trim(),
        cfop: r.cfop.trim(),
        unid: r.unid.trim(),
        qtde: parseDecimalBR(r.qtde),
        vlUnitario: parseDecimalBR(r.vlUnitario),
        vlDesconto: parseDecimalBR(r.vlDesconto),
        bcIcms: parseDecimalBR(r.bcIcms),
        vlIcms: parseDecimalBR(r.vlIcms),
        vlIpi: parseDecimalBR(r.vlIpi),
        aliqIcms: parseDecimalBR(r.aliqIcms),
        aliqIpi: parseDecimalBR(r.aliqIpi),
      }));

      // Separa updates de inserts: updateItem para os com persistedId, addItems para o resto
      const inserts = payload.filter(p => !p.id);
      const updates = payload.filter(p => p.id);

      if (inserts.length > 0) await addItems(container.id, inserts);
      for (const u of updates) {
        if (u.id) await updateItem(u.id, u);
      }

      notify(`${dirtyRows.length} alteração(ões) salva(s).`, 'success');
      // Reload local rows from store happens via useEffect when items change
    } catch (err) {
      reportException(err, {
        title: 'Falha ao salvar itens',
        category: 'storage',
        source: 'container-inventory-save',
      });
      notify('Não foi possível salvar. Veja a bandeja de erros.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    let qtde = 0, vlTotal = 0, vlIcms = 0, vlIpi = 0;
    for (const r of rows) {
      const q = parseDecimalBR(r.qtde);
      const vu = parseDecimalBR(r.vlUnitario);
      const vd = parseDecimalBR(r.vlDesconto);
      qtde += q;
      vlTotal += computeVlTotal(q, vu, vd);
      vlIcms += parseDecimalBR(r.vlIcms);
      vlIpi += parseDecimalBR(r.vlIpi);
    }
    return { qtde, vlTotal, vlIcms, vlIpi };
  }, [rows]);

  const errorCount = useMemo(
    () => rows.reduce((sum, r) => sum + Object.keys(r.errors).length, 0),
    [rows]
  );

  const selectedCount = rows.filter(r => r.selected).length;
  const allSelected = rows.length > 0 && rows.every(r => r.selected);

  if (!isOpen || !container) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-subtle rounded-[1.5rem] w-full max-w-[1400px] shadow-high relative flex flex-col h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-status-success to-brand-primary z-50" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-subtle shrink-0 flex items-center gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Package size={18} className="text-brand-primary" />
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-montserrat font-black text-primary tracking-tighter uppercase leading-none truncate">
              {container.name}
            </h2>
            <p className="text-[9px] font-mono text-secondary mt-1 truncate">
              {rows.length} item(ns) · {totals.qtde.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} qtde · R$ {totals.vlTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={addEmptyRow}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white hover:brightness-110 transition-all min-h-[36px] shadow-sm"
            >
              <Plus size={11} /> Linha
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-brand-primary/40 text-secondary hover:text-brand-primary transition-all min-h-[36px]"
            >
              <FileSpreadsheet size={11} /> Excel
            </button>
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={extractingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-brand-primary/40 text-secondary hover:text-brand-primary transition-all min-h-[36px] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Importar PDF DANFE (NF-e) via IA"
            >
              {extractingPdf ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
              {extractingPdf ? 'Extraindo…' : 'DANFE'}
            </button>
            {selectedCount > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-status-error/10 border-2 border-status-error/30 text-status-error hover:bg-status-error/15 transition-all min-h-[36px]"
              >
                <Trash2 size={11} /> Excluir ({selectedCount})
              </button>
            )}
            {onExportPdf && (
              <button
                onClick={() => onExportPdf(container)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-main border-2 border-subtle hover:border-brand-primary/40 text-secondary hover:text-brand-primary transition-all min-h-[36px]"
              >
                <FileText size={11} /> Exportar PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-muted hover:text-primary hover:bg-sidebar transition-all min-h-[36px]"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleImportPdfDanfe}
            className="hidden"
          />
        </div>

        {/* Error banner */}
        {errorCount > 0 && (
          <div className="px-6 py-2 bg-status-error/10 border-b border-status-error/30 shrink-0 flex items-center gap-2">
            <AlertCircle size={14} className="text-status-error" />
            <span className="text-[10px] font-black uppercase tracking-widest text-status-error">
              {errorCount} erro(s) — corrija antes de salvar
            </span>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-8">
              <div className="w-16 h-16 rounded-full bg-sidebar border-2 border-subtle flex items-center justify-center mb-3">
                <Package size={26} className="text-muted opacity-50" />
              </div>
              <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-2">Container vazio</h3>
              <p className="text-[11px] text-secondary leading-relaxed mb-4">
                Adicione linhas manualmente, importe um Excel/CSV ou extraia um DANFE em PDF.
              </p>
              <button
                onClick={addEmptyRow}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white hover:brightness-110 transition-all"
              >
                <Plus size={12} /> Adicionar Primeira Linha
              </button>
            </div>
          ) : (
            <table className="text-[11px] w-full">
              <thead className="sticky top-0 z-10 bg-sidebar">
                <tr className="border-b-2 border-subtle">
                  <th className="px-2 py-2 text-left">
                    <button onClick={toggleAllSelected} className="text-muted hover:text-primary transition-colors" aria-label="Selecionar todos">
                      <input type="checkbox" checked={allSelected} readOnly className="cursor-pointer" />
                    </button>
                  </th>
                  {COL_HEADERS.map(h => (
                    <th
                      key={h.key}
                      className={cn(
                        'px-2 py-2 text-[9px] font-black uppercase tracking-widest text-secondary',
                        h.numeric ? 'text-right' : 'text-left'
                      )}
                      style={{ minWidth: h.width }}
                    >
                      {h.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const qtde = parseDecimalBR(row.qtde);
                  const vu = parseDecimalBR(row.vlUnitario);
                  const vd = parseDecimalBR(row.vlDesconto);
                  const vlTotal = computeVlTotal(qtde, vu, vd);
                  const hasErr = Object.keys(row.errors).length > 0;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-subtle/40 transition-colors',
                        hasErr && 'bg-status-error/5',
                        row.selected && 'bg-brand-primary/5',
                        !hasErr && !row.selected && idx % 2 === 0 && 'bg-sidebar/20'
                      )}
                    >
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRowSelected(row.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      {COL_HEADERS.map(h => {
                        if (h.key === 'vlTotal') {
                          return (
                            <td key={h.key} className="px-2 py-1 text-right font-mono text-status-success font-bold">
                              {vlTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          );
                        }
                        const field = h.key as EditableField;
                        const value = row[field];
                        const err = row.errors[field];
                        return (
                          <td key={h.key} className="px-1 py-0.5">
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateField(row.id, field, e.target.value)}
                              title={err}
                              className={cn(
                                'w-full px-2 py-1.5 rounded text-[11px] outline-none transition-all',
                                'bg-transparent border',
                                h.numeric && 'text-right font-mono',
                                err ? 'border-status-error bg-status-error/5 text-status-error' : 'border-transparent hover:border-subtle focus:border-brand-primary focus:bg-main',
                              )}
                            />
                          </td>
                        );
                      })}
                      <td className="px-1 py-1">
                        <button
                          onClick={() => removeRow(row.id)}
                          className="p-1.5 rounded text-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
                          aria-label="Remover linha"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="text-muted">Qtde: <span className="font-black text-primary">{totals.qtde.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</span></span>
            <span className="text-muted">Total: <span className="font-black text-status-success">R$ {totals.vlTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
            <span className="text-muted hidden md:inline">ICMS: <span className="font-black text-primary">R$ {totals.vlIcms.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
            <span className="text-muted hidden md:inline">IPI: <span className="font-black text-primary">R$ {totals.vlIpi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted hover:text-primary hover:bg-main transition-all min-h-[40px]"
            >
              Fechar
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || errorCount > 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-status-success text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[40px] shadow-md"
            >
              <Save size={12} />
              {saving ? 'Salvando…' : 'Salvar Tudo'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
