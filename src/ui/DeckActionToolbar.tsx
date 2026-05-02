import { useState, useEffect, lazy, Suspense } from 'react';
import { Trash2, Download, CloudUpload, Plus, Settings as SettingsIcon } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { reportException } from '@/features/errorReporter';
import { PdfGeneratorService } from '@/infrastructure/PdfGeneratorService';
import { CsvGeneratorService } from '@/infrastructure/CsvGeneratorService';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/infrastructure/DatabaseService';
import { AuthModal } from './AuthModal';
import type { User } from '@supabase/supabase-js';

// Lazy: ReportSettingsModal só é necessário quando o usuário acessa o
// botão de configuração de relatório — fora do bundle inicial.
const ReportSettingsModal = lazy(() =>
  import('./ReportSettingsModal').then(m => ({ default: m.ReportSettingsModal }))
);

/**
 * Barra de ações operacionais do convés:
 * - Trash: zerar plano de carga (com confirmação)
 * - CSV / PDF: exportação do plano
 * - SALVAR: sincronização com Supabase
 *
 * Componente extraído do Header para ser posicionado no cabeçalho do DeckArea.
 * Mantém estado local de modal de exportação e autenticação.
 */
export function DeckActionToolbar() {
  const { locations, manifestsLoaded, manifestAtendimento, manifestShipName } = useCargoStore();
  const { notify, ask, showAlert } = useNotificationStore();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isReportSettingsOpen, setIsReportSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exportFilename, setExportFilename] = useState('Plano_de_Carga_Consolidado.pdf');
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleExportPdf = () => {
    setExportFormat('pdf');
    setExportFilename('Plano_de_Carga_Consolidado.pdf');
    setExportModalOpen(true);
  };

  const handleExportCsv = () => {
    setExportFormat('csv');
    setExportFilename('Plano_de_Carga_Consolidado.csv');
    setExportModalOpen(true);
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setSaving(true);
    try {
      await DatabaseService.saveStowagePlan();
      notify('Plano de carregamento salvo com sucesso.', 'success');
    } catch (err: unknown) {
      notify('Erro ao salvar: ' + String(err), 'error');
      reportException(err, {
        title: 'Falha ao salvar plano na nuvem',
        category: 'storage',
        severity: 'error',
        source: 'cloud-save',
        suggestion: 'Verifique sua conexão e se você está autenticado. Os dados estão salvos localmente — o app vai tentar sincronizar quando a conexão voltar.',
        action: { label: 'Tentar novamente', onClick: () => { void handleSaveToCloud(); } },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    const ok = await ask({
      title: 'Limpar Plano de Carga',
      message: 'ATENÇÃO: Isso deletará todas as cargas de todas as abas de cargas de uma só vez. Você tem certeza que deseja fazer isso?',
      variant: 'warning',
      confirmLabel: 'Sim, limpar tudo',
      cancelLabel: 'Cancelar',
    });
    if (ok) useCargoStore.getState().clearAllCargoes();
  };

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="text-muted hover:text-[#ef4444] hover:bg-red-500/10 rounded-xl transition-all active:scale-95 hover:rotate-12 group h-12 w-12 flex items-center justify-center border-2 border-transparent hover:border-red-500/30"
          onClick={handleClearAll}
          title="Zerar Plano de Carga"
        >
          <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
        </button>

        <div className="hidden md:flex items-center gap-1.5 p-1 bg-sidebar/20 border border-subtle rounded-xl h-12">
          <button
            onClick={handleExportCsv}
            disabled={!manifestsLoaded}
            className="flex items-center gap-1.5 bg-sidebar/50 border border-subtle text-primary hover:bg-main hover:border-brand-primary/30 transition-all px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-sm hover:shadow-md active:scale-95 disabled:opacity-40"
            title="Exportar CSV"
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={handleExportPdf}
            disabled={!manifestsLoaded}
            className="flex items-center gap-1.5 bg-sidebar/50 border border-subtle text-primary hover:bg-main hover:border-brand-primary/30 transition-all px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-sm hover:shadow-md active:scale-95 disabled:opacity-40"
            title="Exportar PDF"
          >
            <Download size={12} /> PDF
          </button>
          <div className="w-px h-6 bg-border-subtle/40 mx-0.5" />
          <button
            onClick={() => setIsReportSettingsOpen(true)}
            title="Configurar Relatório (logo + assinatura)"
            className="flex items-center justify-center bg-sidebar/50 border border-subtle text-secondary hover:text-brand-primary hover:bg-main hover:border-brand-primary/30 transition-all w-9 h-9 rounded-lg shadow-sm hover:shadow-md active:scale-95"
          >
            <SettingsIcon size={13} />
          </button>
        </div>

        {/* Versão compacta para telas menores: ícone-só */}
        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={handleExportCsv}
            disabled={!manifestsLoaded}
            className="h-12 w-12 flex items-center justify-center bg-sidebar/50 border-2 border-subtle text-primary hover:bg-main hover:border-brand-primary/30 transition-all rounded-xl active:scale-95 disabled:opacity-40"
            title="Exportar CSV"
          >
            <Download size={14} />
          </button>
        </div>

        <button
          onClick={handleSaveToCloud}
          disabled={saving}
          title="Sincronizar (SALVAR no servidor)"
          className="flex items-center gap-2 bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:brightness-110 disabled:opacity-40 px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.15em] shadow-md hover:shadow-lg shadow-status-success/30 active:scale-95 transition-all h-12"
        >
          <CloudUpload size={16} />
          <span className="tracking-widest hidden sm:inline">{saving ? 'PROCESSANDO...' : 'SALVAR'}</span>
        </button>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      {isReportSettingsOpen && (
        <Suspense fallback={null}>
          <ReportSettingsModal isOpen={isReportSettingsOpen} onClose={() => setIsReportSettingsOpen(false)} />
        </Suspense>
      )}

      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0f172a] border-2 border-subtle p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary to-status-success" />
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 bg-brand-primary/10 rounded-3xl mb-4">
                <Download className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="text-xl font-black text-primary">Exportar Manifesto</h3>
              <p className="text-sm text-muted mt-1 font-medium">Configure o nome do arquivo para salvamento.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Nome do Arquivo</label>
                <input
                  type="text"
                  value={exportFilename}
                  onChange={(e) => setExportFilename(e.target.value)}
                  className="w-full px-5 py-4 bg-main border-2 border-subtle text-primary rounded-2xl focus:border-brand-primary outline-none transition-all font-bold"
                  placeholder={`ex: Plano_Consolidado.${exportFormat}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={async () => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const showDirectoryPicker = (window as any).showDirectoryPicker;
                    if (showDirectoryPicker) {
                      try { setDirHandle(await showDirectoryPicker()); } catch { /* user cancelled */ }
                    } else {
                      await showAlert({ title: 'Recurso Indisponível', message: 'Seu navegador não suporta seleção de pasta local. Use o Chrome ou Edge mais recentes.', variant: 'warning' });
                    }
                  }}
                  className="px-6 py-4 bg-sidebar border border-subtle text-primary rounded-2xl text-xs font-black hover:bg-main transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> PASTA
                </button>
                <button
                  onClick={async () => {
                    let blob: Blob;
                    if (exportFormat === 'pdf') {
                      blob = await PdfGeneratorService.generateBlob(locations, manifestShipName, manifestAtendimento);
                    } else {
                      blob = CsvGeneratorService.generateCsv(locations, manifestShipName, manifestAtendimento);
                    }

                    if (dirHandle) {
                      try {
                        const fileHandle = await dirHandle.getFileHandle(exportFilename, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        notify('Arquivo salvo com sucesso!', 'success');
                      } catch (e) { notify('Erro: ' + (e as Error).message, 'error'); }
                    } else {
                      if (exportFormat === 'pdf') PdfGeneratorService.executeExport(locations, exportFilename, manifestShipName, manifestAtendimento);
                      else CsvGeneratorService.executeExport(locations, exportFilename, manifestShipName, manifestAtendimento);
                    }
                    setExportModalOpen(false); setDirHandle(null);
                  }}
                  className="px-6 py-4 bg-brand-primary text-white rounded-2xl text-xs font-black shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  EXPORTAR
                </button>
              </div>

              <button
                onClick={() => { setExportModalOpen(false); setDirHandle(null); }}
                className="w-full py-4 text-xs font-black text-primary hover:bg-main border-2 border-transparent hover:border-subtle rounded-2xl transition-all text-center uppercase tracking-[0.25em]"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
