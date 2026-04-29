import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Paperclip, Bot, User, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { useManifestoExtraction, type ChatMessage } from '@/hooks/useManifestoExtraction';
import { flattenManifestoJSON, countCargas, type ManifestoJSON } from '@/services/manifestExtractor';
import { cn } from '@/lib/utils';

interface Props { isOpen: boolean; onClose: () => void }

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  if (msg.isLoading) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
          <Bot size={14} className="text-brand-primary" />
        </div>
        <div className="bg-sidebar border border-subtle rounded-2xl rounded-tl-none px-5 py-4 max-w-[80%]">
          <div className="flex gap-1.5 items-center h-5">
            <span className="w-2 h-2 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex items-start gap-3 flex-row-reverse">
        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center shrink-0">
          <User size={14} className="text-white" />
        </div>
        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-2xl rounded-tr-none px-5 py-3 max-w-[80%]">
          <p className="text-sm font-medium text-primary leading-relaxed">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-brand-primary" />
      </div>
      <div className="bg-sidebar border border-subtle rounded-2xl rounded-tl-none px-5 py-3 max-w-[85%]">
        <p
          className="text-sm text-primary leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
        />
      </div>
    </div>
  );
}

function PreviewTable({ json }: { json: ManifestoJSON }) {
  const alertas = json.metadadosExtracao?.revisoesSugeridas ?? [];
  const allItems = flattenManifestoJSON(json);
  const total = countCargas(json);
  const hasSections = json.sections && json.sections.length > 0;

  return (
    <div className="border-t border-subtle bg-sidebar/50 p-4 shrink-0 max-h-72 overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-2 mb-3">
        <Package size={14} className="text-brand-primary" />
        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
          Pré-visualização — {total} cargas
        </span>
        {hasSections ? (
          <span className="ml-auto text-[9px] font-black text-brand-primary uppercase bg-brand-primary/10 px-2 py-0.5 rounded-lg">
            {json.sections!.length} seção(ões)
          </span>
        ) : (
          <span className="ml-auto text-[9px] font-black text-muted uppercase">
            {json.rotaData?.origem} → {json.rotaData?.destino}
          </span>
        )}
      </div>

      {alertas.length > 0 && (
        <div className="flex items-start gap-2 bg-status-warning/10 border border-status-warning/30 rounded-xl px-4 py-2 mb-3">
          <AlertTriangle size={12} className="text-status-warning shrink-0 mt-0.5" />
          <p className="text-[10px] text-status-warning font-bold">{alertas.join(' · ')}</p>
        </div>
      )}

      {/* Resumo por seções quando disponível */}
      {hasSections && (
        <div className="flex flex-wrap gap-2 mb-3">
          {json.sections!.map((s, i) => (
            <span key={i} className="text-[9px] font-black px-2 py-1 bg-main border border-subtle rounded-lg text-secondary">
              {s.origin} → {s.destination}: <strong className="text-primary">{s.items.length}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-subtle">
              <th className="text-left pb-2 pr-3 text-muted font-black uppercase tracking-widest">Nº</th>
              <th className="text-left pb-2 pr-3 text-muted font-black uppercase tracking-widest">ID</th>
              <th className="text-left pb-2 pr-3 text-muted font-black uppercase tracking-widest min-w-[120px]">Descrição</th>
              <th className="text-right pb-2 pr-3 text-muted font-black uppercase tracking-widest">Peso (t)</th>
              <th className="text-left pb-2 pr-3 text-muted font-black uppercase tracking-widest">Dim. CxLxA</th>
              <th className="text-left pb-2 text-muted font-black uppercase tracking-widest">Destino</th>
            </tr>
          </thead>
          <tbody>
            {allItems.slice(0, 50).map((c, i) => (
              <tr key={i} className="border-b border-subtle/30 hover:bg-main/50 transition-colors">
                <td className="py-1.5 pr-3 text-muted">{c.numero}</td>
                <td className="py-1.5 pr-3 text-brand-primary font-bold">{c.codigoID}</td>
                <td className="py-1.5 pr-3 text-primary truncate max-w-[160px]">{c.descricao}</td>
                <td className="py-1.5 pr-3 text-right text-primary font-bold">{Number(c.peso_ton).toFixed(2)}</td>
                <td className="py-1.5 pr-3 text-secondary">{c.dimensoes?.c}×{c.dimensoes?.l}×{c.dimensoes?.a}</td>
                <td className="py-1.5 text-secondary">{c.destinoFinal}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 50 && (
          <p className="text-center text-[9px] text-muted mt-2 font-bold uppercase tracking-widest">
            +{total - 50} cargas adicionais
          </p>
        )}
      </div>
    </div>
  );
}

export function ManifestoChatModal({ isOpen, onClose }: Props) {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    extractedJSON,
    phase,
    isProcessing,
    sendMessage,
    uploadFile,
    confirmImport,
    reset,
  } = useManifestoExtraction(onClose);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
      e.target.value = '';
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const canImport = phase === 'awaiting_confirmation' && extractedJSON && !isProcessing;
  const cargoCount = extractedJSON ? countCargas(extractedJSON) : 0;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div className="bg-main border-2 border-subtle rounded-[2.5rem] w-full max-w-3xl shadow-high relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary z-50" />

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-subtle shrink-0 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Bot size={20} className="text-brand-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-black text-primary tracking-tighter uppercase leading-none">Assistente de Importação</h2>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80">Extração Inteligente de Manifestos</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {phase === 'awaiting_confirmation' && extractedJSON && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-status-success/10 border border-status-success/30 rounded-xl">
                <CheckCircle2 size={12} className="text-status-success" />
                <span className="text-[10px] font-black text-status-success uppercase tracking-widest">{cargoCount} cargas prontas</span>
              </div>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-sidebar rounded-xl text-muted hover:text-primary transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Preview Table */}
        {extractedJSON && phase === 'awaiting_confirmation' && (
          <PreviewTable json={extractedJSON} />
        )}

        {/* Input Area */}
        <div className={cn(
          "px-6 py-5 border-t border-subtle bg-sidebar shrink-0",
          canImport ? "pb-4" : "pb-5"
        )}>
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                placeholder={
                  phase === 'idle'
                    ? 'Cole aqui o texto do manifesto ou faça upload de um PDF...'
                    : phase === 'awaiting_confirmation'
                    ? 'Confirme a importação ou indique uma correção...'
                    : 'Aguardando processamento...'
                }
                rows={3}
                className="w-full bg-main border-2 border-strong/30 rounded-2xl px-5 py-3 text-sm text-primary outline-none focus:border-brand-primary resize-none no-scrollbar placeholder:text-muted/50 transition-all shadow-inner disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                title="Fazer upload de PDF"
                className="w-11 h-11 rounded-2xl bg-main border-2 border-subtle hover:border-brand-primary text-muted hover:text-brand-primary transition-all flex items-center justify-center disabled:opacity-40"
              >
                <Paperclip size={18} />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="w-11 h-11 rounded-2xl bg-brand-primary hover:brightness-110 text-white transition-all flex items-center justify-center disabled:opacity-40 active:scale-95 shadow-md shadow-brand-primary/20"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {canImport && (
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-primary bg-main border-2 border-subtle hover:bg-sidebar transition-all active:scale-95 uppercase tracking-widest"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmImport}
                className="flex-1 bg-status-success hover:brightness-110 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md shadow-status-success/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={14} />
                IMPORTAR {cargoCount} CARGA{cargoCount !== 1 ? 'S' : ''}
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>,
    document.body
  );
}
