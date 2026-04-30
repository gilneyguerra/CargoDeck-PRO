import {
  Plus, Upload, Zap, MessageSquare, Table2, LayoutGrid,
  Package, Anchor, Box, Flame, Truck, Layers, Flag, ArrowRight
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import type { CargoCategory } from '@/domain/Cargo';
import { usePDFUpload } from '../hooks/usePDFUpload';
import { useRef, useState, useMemo, type ChangeEvent } from 'react';
import { useNotificationStore } from '@/features/notificationStore';
import { cn } from '@/lib/utils';
import { ManualCargoModal } from './ManualCargoModal';
import { ManifestoChatModal } from './ManifestoChatModal';
import { CargoEditorModal } from './CargoEditorModal';

export default function Sidebar() {
  const {
    unallocatedCargoes, setExtractedCargoes, setViewMode, locations
  } = useCargoStore();

  const { upload, loading: isProcessing } = usePDFUpload();
  const { notify, setBanner, hideBanner } = useNotificationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);

  // ─── Resumo Estatístico ────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = unallocatedCargoes.length;
    const totalWeight = unallocatedCargoes.reduce((s, c) => s + (c.weightTonnes || 0), 0);
    const byCategory = unallocatedCargoes.reduce((acc, c) => {
      const key = c.category || 'GENERAL';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const containers = unallocatedCargoes.filter(c => c.category === 'CONTAINER').length;
    const loose = total - containers;
    const urgent = unallocatedCargoes.filter(c => c.priority === 'urgent').length;
    const high = unallocatedCargoes.filter(c => c.priority === 'high').length;

    // Cargas alocadas (todas as bays de todas as locations)
    const allocated = locations.reduce((sum, loc) =>
      sum + loc.bays.reduce((bs, b) => bs + b.allocatedCargoes.length, 0), 0);

    return { total, totalWeight, byCategory, containers, loose, urgent, high, allocated };
  }, [unallocatedCargoes, locations]);

  // ─── PDF Upload Handler ────────────────────────────────────────────────────

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBanner('Iniciando processamento cirúrgico do manifesto...', 0);
    try {
      setBanner('Lendo dados do PDF...', 30);
      const items = await upload(file);
      setBanner('Validando cargas extraídas...', 70);

      if (items && items.length > 0) {
        const domainCargoes = items.map(item => ({
          id: item.id,
          identifier: item.identifier,
          description: item.description,
          weightTonnes: item.weight,
          widthMeters: item.width || 0,
          lengthMeters: item.length || 0,
          heightMeters: item.height || 2,
          quantity: 1,
          category: (item.tipoDetectado as CargoCategory | undefined) || 'GENERAL',
          status: 'UNALLOCATED' as const,
          isBackload: item.isBackload,
          nomeEmbarcacao: item.nomeEmbarcacao,
          numeroAtendimento: item.numeroAtendimento,
          origemCarga: item.origemCarga,
          destinoCarga: item.destinoCarga,
          roteiroPrevisto: item.roteiroPrevisto,
          dataExtracao: item.dataExtracao,
          tamanhoFisico: item.tamanhoFisico,
          color: item.isBackload ? '#fca311' : '#3b82f6',
          format: 'Retangular' as const,
        }));
        setBanner('Finalizando integração...', 90);
        setExtractedCargoes(domainCargoes);
        notify(`Manifesto processado! ${items.length} cargas carregadas.`, 'success');
      } else {
        notify('Nenhuma carga válida identificada no manifesto.', 'warning');
      }
    } catch {
      notify('Falha crítica no processamento do manifesto.', 'error');
    } finally {
      hideBanner();
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className="w-[360px] border-r-[3px] border-brand-primary bg-sidebar flex flex-col shrink-0 h-full shadow-high z-20 font-sans">
      {/* Manifest Import Section */}
      <div className="p-0 border-b border-subtle bg-header/20">
        <div className="grid grid-cols-3 gap-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            title="Importar Manifesto PDF"
            className={cn(
              'border-r border-subtle p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300',
              isProcessing
                ? 'bg-brand-primary/5 cursor-not-allowed'
                : 'bg-main/30 hover:bg-main cursor-pointer group'
            )}
          >
            <div className="p-2.5 bg-brand-primary/10 rounded-2xl text-brand-primary group-hover:scale-110 transition-transform">
              {isProcessing ? <Zap className="w-4 h-4 animate-pulse" /> : <Upload className="w-4 h-4" />}
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.08em]">
                {isProcessing ? 'PROCESSANDO...' : 'PDF'}
              </span>
              <span className="text-[8px] font-bold text-muted">OCR</span>
            </div>
          </button>

          <button
            onClick={() => setShowChatModal(true)}
            disabled={isProcessing}
            title="Importar via Chat IA"
            className="border-r border-subtle p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 bg-main/30 hover:bg-brand-primary/5 cursor-pointer group disabled:opacity-40"
          >
            <div className="p-2.5 bg-brand-primary/10 rounded-2xl text-brand-primary group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.08em]">VIA IA</span>
              <span className="text-[8px] font-bold text-muted">Chat</span>
            </div>
          </button>

          <button
            onClick={() => setShowEditorModal(true)}
            disabled={isProcessing}
            title="Editor de Cargas em Grade"
            className="p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 bg-main/30 hover:bg-brand-primary/5 cursor-pointer group disabled:opacity-40"
          >
            <div className="p-2.5 bg-brand-primary/10 rounded-2xl text-brand-primary group-hover:scale-110 transition-transform">
              <Table2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.08em]">GRADE</span>
              <span className="text-[8px] font-bold text-muted">Excel/CSV</span>
            </div>
          </button>
        </div>

        {/* Botão de navegação principal: Módulo de Geração Modal de Transporte */}
        <button
          onClick={() => setViewMode('modal-generation')}
          disabled={isProcessing}
          title="Abrir Módulo de Geração Modal de Transporte"
          className="w-full px-4 py-3 flex items-center justify-center gap-2 border-t-2 border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/15 transition-all duration-300 group disabled:opacity-40 cursor-pointer"
        >
          <LayoutGrid className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.15em]">GERAÇÃO MODAL</span>
          <ArrowRight className="w-3 h-3 text-brand-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>

        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
      </div>

      {/* Resumo Estatístico — substitui a lista vertical conforme spec */}
      <div className="p-5 border-b border-subtle flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
              <Package size={16} className="text-brand-primary" />
            </div>
            <div>
              <h3 className="text-[11px] font-black text-primary uppercase tracking-widest leading-none">Resumo de Carga</h3>
              <p className="text-[9px] font-bold text-secondary opacity-70 mt-0.5">Inventário ativo</p>
            </div>
          </div>
          <button
            onClick={() => setIsManualModalOpen(true)}
            title="Nova Carga Manual"
            className="p-2 text-secondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all border border-transparent hover:border-brand-primary/20"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Cards de números principais */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-main border border-subtle rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-muted uppercase tracking-widest mb-1.5">
              <Box size={10} /> Não Alocadas
            </div>
            <p className="text-xl font-mono font-black text-brand-primary leading-none">{stats.total}</p>
            <p className="text-[10px] font-mono font-black text-secondary mt-1">{stats.totalWeight.toFixed(1)} t</p>
          </div>
          <div className="bg-main border border-subtle rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-muted uppercase tracking-widest mb-1.5">
              <Anchor size={10} /> Alocadas
            </div>
            <p className="text-xl font-mono font-black text-status-success leading-none">{stats.allocated}</p>
            <p className="text-[10px] font-mono font-black text-secondary mt-1">a bordo</p>
          </div>
        </div>

        {/* Breakdown soltas/contentores */}
        <div className="bg-main border border-subtle rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              <Layers size={10} className="text-muted" />
              <span className="font-black text-secondary uppercase tracking-widest">Soltas</span>
            </div>
            <span className="font-mono font-black text-primary">{stats.loose}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              <Package size={10} className="text-muted" />
              <span className="font-black text-secondary uppercase tracking-widest">Contentores</span>
            </div>
            <span className="font-mono font-black text-primary">{stats.containers}</span>
          </div>
        </div>

        {/* Prioridade — só aparece se houver */}
        {(stats.urgent > 0 || stats.high > 0) && (
          <div className="bg-status-warning/5 border border-status-warning/30 rounded-xl p-3 space-y-2">
            {stats.urgent > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Flame size={10} className="text-status-error" />
                  <span className="font-black text-status-error uppercase tracking-widest">Urgentes</span>
                </div>
                <span className="font-mono font-black text-status-error">{stats.urgent}</span>
              </div>
            )}
            {stats.high > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <Flag size={10} className="text-status-warning" />
                  <span className="font-black text-status-warning uppercase tracking-widest">Alta Prioridade</span>
                </div>
                <span className="font-mono font-black text-status-warning">{stats.high}</span>
              </div>
            )}
          </div>
        )}

        {/* Breakdown por categoria — top 3 */}
        {Object.keys(stats.byCategory).length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] font-black text-muted uppercase tracking-widest">Top categorias</p>
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between text-[10px] bg-main/40 rounded-lg px-2 py-1.5 border border-subtle/50">
                  <span className="font-black text-secondary uppercase tracking-widest truncate">{cat}</span>
                  <span className="font-mono font-black text-primary">{count}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Mensagem informativa — substitui os CTAs antigos (movidos para a toolbar da página dedicada) */}
      <div className="flex-1 p-5 flex flex-col items-center justify-center text-center overflow-y-auto no-scrollbar">
        <div className="w-14 h-14 rounded-full bg-main border-2 border-subtle flex items-center justify-center mb-3 opacity-50">
          <Truck size={20} className="text-secondary" />
        </div>
        <p className="text-[10px] text-muted leading-relaxed max-w-[240px]">
          As ações de gerenciamento e movimentação em grupo agora vivem na página dedicada de
          <span className="text-brand-primary font-black"> Geração Modal de Transporte</span>.
        </p>
      </div>

      <ManualCargoModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />
      <ManifestoChatModal isOpen={showChatModal} onClose={() => setShowChatModal(false)} />
      <CargoEditorModal isOpen={showEditorModal} onClose={() => setShowEditorModal(false)} />
    </aside>
  );
}
