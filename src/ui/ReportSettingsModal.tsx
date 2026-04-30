import { useState, useId, useRef, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, FileSignature, Trash2, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useReportSettings } from '@/features/reportSettingsStore';
import { useNotificationStore } from '@/features/notificationStore';
import { cn } from '@/lib/utils';

interface Props { isOpen: boolean; onClose: () => void }

const MAX_LOGO_SIZE_KB = 500; // 500 KB — suficiente para logo PNG otimizada

export function ReportSettingsModal({ isOpen, onClose }: Props) {
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });
  const { logoBase64, signatoryName, signatoryRole, setLogoBase64, setSignatoryName, setSignatoryRole } = useReportSettings();
  const { notify } = useNotificationStore();

  const [localName, setLocalName] = useState(signatoryName);
  const [localRole, setLocalRole] = useState(signatoryRole);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // permite re-upload do mesmo arquivo

    // Valida formato — APENAS .png para evitar conflito com cor de cabeçalho
    if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
      setError('Formato inválido. Use APENAS arquivos .png (idealmente sem fundo / com transparência).');
      return;
    }
    // Valida tamanho
    if (file.size > MAX_LOGO_SIZE_KB * 1024) {
      setError(`Arquivo muito grande (${Math.round(file.size / 1024)} KB). Máximo: ${MAX_LOGO_SIZE_KB} KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) {
        setError('Falha ao ler o arquivo.');
        return;
      }
      setLogoBase64(dataUrl);
      notify('Logo salva com sucesso!', 'success');
    };
    reader.onerror = () => setError('Falha ao ler o arquivo.');
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64(null);
    notify('Logo removida.', 'info');
  };

  const handleSave = () => {
    setSignatoryName(localName.trim());
    setSignatoryRole(localRole.trim());
    notify('Configurações de relatório salvas.', 'success');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-subtle rounded-[2rem] w-full max-w-2xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary" />

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-subtle flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Settings size={20} className="text-brand-primary" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-montserrat font-black text-primary tracking-tighter uppercase leading-none">Configurar Relatório</h2>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-1">Logo & Assinatura · PDF e CSV</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 hover:bg-sidebar rounded-xl text-muted hover:text-primary transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
          {/* Logo */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest">
              <ImageIcon size={13} className="text-brand-primary" /> Logo do Cabeçalho
            </label>
            <p className="text-[11px] text-secondary leading-relaxed">
              Arquivo <strong className="text-primary">.png exclusivamente</strong>, idealmente <strong className="text-primary">sem fundo</strong> (transparência) para harmonizar com o cabeçalho azul-marinho do relatório. A imagem é redimensionada automaticamente para caber no canto superior esquerdo.
            </p>

            <div className="flex items-stretch gap-4">
              {/* Preview */}
              <div className="w-44 h-28 bg-slate-900 rounded-xl border-2 border-subtle flex items-center justify-center shrink-0 overflow-hidden p-3">
                {logoBase64 ? (
                  <img src={logoBase64} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <ImageIcon size={28} className="text-muted opacity-30 mx-auto mb-1" />
                    <p className="text-[8px] font-black text-muted uppercase tracking-widest opacity-60">Sem logo</p>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex-1 flex flex-col justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-brand-primary text-white hover:brightness-110 active:scale-95 transition-all shadow-md"
                >
                  <ImageIcon size={13} />
                  {logoBase64 ? 'Trocar Logo' : 'Carregar Logo (.png)'}
                </button>
                {logoBase64 && (
                  <button
                    onClick={handleRemoveLogo}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-status-error hover:bg-status-error/10 border-2 border-status-error/30 hover:border-status-error/50 transition-all"
                  >
                    <Trash2 size={12} /> Remover Logo
                  </button>
                )}
                <p className="text-[9px] font-bold text-muted uppercase tracking-widest">
                  Tamanho máx.: {MAX_LOGO_SIZE_KB} KB · Formato: PNG
                </p>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept=".png,image/png" className="hidden" onChange={handleLogoUpload} />

            {error && (
              <div className="flex items-start gap-2 p-3 bg-status-error/10 border border-status-error/30 rounded-xl">
                <AlertCircle size={13} className="text-status-error shrink-0 mt-0.5" />
                <p className="text-[11px] text-status-error font-bold leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          {/* Assinatura */}
          <div className="space-y-3 border-t border-subtle pt-6">
            <label className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest">
              <FileSignature size={13} className="text-brand-primary" /> Assinatura Única do Relatório
            </label>
            <p className="text-[11px] text-secondary leading-relaxed">
              Substitui as duas linhas legadas (Imediato / Comandante). Será impressa no rodapé do PDF e adicionada como linha final no CSV.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest">Nome do Signatário</label>
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="Ex.: João da Silva"
                  className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all min-h-[40px] placeholder:text-muted/50"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted uppercase tracking-widest">Função / Cargo</label>
                <input
                  type="text"
                  value={localRole}
                  onChange={(e) => setLocalRole(e.target.value)}
                  placeholder="Ex.: Supervisor de Carga"
                  className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all min-h-[40px] placeholder:text-muted/50"
                />
              </div>
            </div>

            {/* Preview da linha de assinatura */}
            {(localName || localRole) && (
              <div className="bg-sidebar/30 border border-subtle rounded-xl p-4">
                <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-2">Preview no rodapé</p>
                <div className="border-t border-strong/40 pt-2 text-center">
                  <span className="text-[12px] font-bold text-primary">
                    {localName.trim() && localRole.trim()
                      ? `${localName.trim()} — ${localRole.trim()}`
                      : (localName.trim() || localRole.trim())}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-subtle bg-sidebar/40 shrink-0 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-muted hover:text-primary hover:bg-main uppercase tracking-widest transition-all min-h-[40px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all min-h-[40px] shadow-md active:scale-95',
              'bg-brand-primary hover:brightness-110 shadow-brand-primary/20'
            )}
          >
            <CheckCircle2 size={14} />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
