import { useState, useRef, useEffect, useId, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Sparkles, User, Bot, BookOpen, Boxes } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { routeTask } from '@/services/llmRouter';
import { getDocCatalog, searchDocs, excerptDoc, listDocSources } from '@/services/docIndex';
import type { Cargo } from '@/domain/Cargo';
import { cn } from '@/lib/utils';

type AssistantMode = 'cargas' | 'faq';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCargos: Cargo[];
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

const QUICK_PROMPTS_CARGAS = [
  'Como otimizar o espaço deste lote?',
  'Quais cargas exigem peação especial?',
  'Sugestão de agrupamento por peso',
  'Calcule o centro de gravidade aproximado',
  'Sugira ordem de embarque (LIFO/FIFO)',
];

const QUICK_PROMPTS_FAQ = [
  'Como movimentar cargas em grupo?',
  'O que é o módulo de geração modal?',
  'Como evitar erros de build no Vercel?',
  'Como funciona a extração de manifesto?',
  'Padrões de UI/UX do projeto',
];

const SYSTEM_INTRO_CARGAS = 'Olá! Sou seu **Assistente de Logística Offshore**.\n\nPosso ajudar com otimização de espaço, sugestões de peação, cálculos básicos de centro de gravidade e ordem de embarque (LIFO/FIFO).\n\nSelecione cargas no grid e me pergunte sobre elas, ou use uma das **sugestões rápidas** abaixo.';

const SYSTEM_INTRO_FAQ = 'Modo **FAQ** ativado.\n\nRespondo perguntas sobre o CargoDeck Pro consultando a documentação do projeto (`docs/` + `LESSONS_LEARNED.md`).\n\nUse uma das **sugestões rápidas** ou pergunte qualquer coisa sobre módulos, fluxos e regras de build.';

function mkId() { return Math.random().toString(36).slice(2, 9); }

function renderMd(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-main rounded text-[10px] font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
}

function buildContextPrompt(userText: string, cargos: Cargo[]): string {
  if (cargos.length === 0) return userText;

  const summary = cargos.slice(0, 30).map(c => {
    const dim = `${c.lengthMeters?.toFixed(2) ?? '?'}×${c.widthMeters?.toFixed(2) ?? '?'}×${(c.heightMeters ?? 1).toFixed(2)}m`;
    return `- ${c.identifier} | ${c.category} | ${dim} | ${c.weightTonnes.toFixed(2)}t${c.priority ? ` | prioridade: ${c.priority}` : ''}${c.destinoCarga ? ` | destino: ${c.destinoCarga}` : ''}`;
  }).join('\n');

  const overflow = cargos.length > 30 ? `\n... (+${cargos.length - 30} cargas adicionais não listadas)` : '';

  return `Contexto: o usuário tem ${cargos.length} carga(s) selecionada(s) no Grid de Geração Modal de Transporte.

Cargas selecionadas:
${summary}${overflow}

Pergunta do usuário:
${userText}

Responda como Especialista em Logística Offshore. Seja técnico, direto e cite IDs específicos quando relevante. Use formatação Markdown leve (**negrito** para destacar).`;
}

function buildFaqPrompt(userText: string): string {
  const matches = searchDocs(userText, 3);
  const catalog = getDocCatalog();

  const excerpts = matches.length > 0
    ? matches.map((d) => `### ${d.title}\nFonte: ${d.path}\n\n${excerptDoc(d, userText, 1500)}`).join('\n\n---\n\n')
    : '(Nenhum trecho específico encontrado — responda usando o catálogo acima ou diga claramente que não há cobertura.)';

  return `CATÁLOGO DE DOCUMENTAÇÃO DISPONÍVEL:
${catalog}

DOCUMENTAÇÃO RELEVANTE PARA A PERGUNTA:
${excerpts}

Pergunta do usuário:
${userText}`;
}

export function CargoAssistant({ isOpen, onClose, selectedCargos }: Props) {
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });

  const [mode, setMode] = useState<AssistantMode>('cargas');
  const [messages, setMessages] = useState<Msg[]>([
    { id: 'welcome', role: 'assistant', content: SYSTEM_INTRO_CARGAS },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const switchMode = (next: AssistantMode) => {
    if (next === mode || busy) return;
    setMode(next);
    setMessages([
      {
        id: 'welcome-' + next,
        role: 'assistant',
        content: next === 'cargas' ? SYSTEM_INTRO_CARGAS : SYSTEM_INTRO_FAQ,
      },
    ]);
    setInput('');
  };

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { id: mkId(), role: 'user', content: text };
    const loadingId = mkId();
    const loading: Msg = { id: loadingId, role: 'assistant', content: '...', isLoading: true };
    setMessages(prev => [...prev, userMsg, loading]);
    setInput('');
    setBusy(true);

    try {
      const isFaq = mode === 'faq';
      const prompt = isFaq ? buildFaqPrompt(text) : buildContextPrompt(text, selectedCargos);
      const res = await routeTask(isFaq ? 'FAQ' : 'CHAT', prompt);
      setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, content: res.content, isLoading: false } : m));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, content: `❌ Não consegui processar: ${msg}`, isLoading: false } : m));
    } finally {
      setBusy(false);
    }
  };

  const docCount = listDocSources().length;

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input.trim());
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[1000] w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-3rem)] flex flex-col font-sans animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-brand-primary/30 rounded-3xl shadow-high overflow-hidden flex flex-col h-full backdrop-blur-md"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-subtle bg-gradient-to-br from-brand-primary/10 to-indigo-500/10 shrink-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-indigo-600 flex items-center justify-center shadow-md">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id={titleId} className="text-sm font-montserrat font-black text-primary tracking-tight uppercase leading-none">Assistente de Carga</h2>
            <p className="text-[9px] font-black text-secondary uppercase tracking-[0.3em] opacity-80 mt-1">
              IA · {mode === 'faq'
                ? `FAQ · ${docCount} doc(s)`
                : selectedCargos.length > 0 ? `${selectedCargos.length} selecionada(s)` : 'Logística Offshore'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-primary hover:bg-sidebar transition-all"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs Cargas / FAQ */}
        <div className="px-4 pt-3 pb-2 border-b border-subtle/40 shrink-0 flex items-center gap-2 bg-main">
          <button
            onClick={() => switchMode('cargas')}
            disabled={busy}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all min-h-[36px] disabled:opacity-40',
              mode === 'cargas'
                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-sm'
                : 'border-transparent text-secondary hover:text-primary hover:bg-sidebar'
            )}
            aria-pressed={mode === 'cargas'}
          >
            <Boxes size={12} /> Cargas
          </button>
          <button
            onClick={() => switchMode('faq')}
            disabled={busy}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all min-h-[36px] disabled:opacity-40',
              mode === 'faq'
                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary shadow-sm'
                : 'border-transparent text-secondary hover:text-primary hover:bg-sidebar'
            )}
            aria-pressed={mode === 'faq'}
          >
            <BookOpen size={12} /> FAQ
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {messages.map(msg => (
            <div key={msg.id} className={cn('flex items-start gap-2', msg.role === 'user' && 'flex-row-reverse')}>
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                  msg.role === 'user' ? 'bg-brand-primary' : 'bg-brand-primary/10 border border-brand-primary/20'
                )}
              >
                {msg.role === 'user'
                  ? <User size={12} className="text-white" />
                  : <Bot size={12} className="text-brand-primary" />
                }
              </div>
              <div
                className={cn(
                  'px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed max-w-[80%]',
                  msg.role === 'user'
                    ? 'bg-brand-primary/10 border border-brand-primary/20 text-primary rounded-tr-none font-medium'
                    : 'bg-sidebar border border-subtle text-primary rounded-tl-none'
                )}
              >
                {msg.isLoading ? (
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts (só aparecem se for a 1ª mensagem) */}
        {messages.length === 1 && (
          <div className="px-4 py-3 border-t border-subtle/40 shrink-0">
            <p className="text-[9px] font-black text-muted uppercase tracking-widest mb-2">Sugestões rápidas</p>
            <div className="flex flex-wrap gap-1.5">
              {(mode === 'faq' ? QUICK_PROMPTS_FAQ : QUICK_PROMPTS_CARGAS).map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-secondary bg-sidebar border border-subtle hover:border-brand-primary/40 hover:text-brand-primary transition-all disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-subtle bg-sidebar shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={busy}
              placeholder={
                busy
                  ? 'Aguardando resposta…'
                  : mode === 'faq'
                    ? 'Pergunte sobre o CargoDeck (módulos, fluxos, build)…'
                    : 'Pergunte sobre as cargas selecionadas…'
              }
              rows={2}
              className="flex-1 bg-main border-2 border-subtle rounded-xl px-3 py-2 text-xs text-primary outline-none focus:border-brand-primary resize-none no-scrollbar placeholder:text-muted/50 disabled:opacity-50"
            />
            <button
              onClick={() => send(input.trim())}
              disabled={!input.trim() || busy}
              className="w-11 h-11 rounded-xl bg-brand-primary text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center active:scale-95 shadow-md shadow-brand-primary/20 shrink-0"
              title="Enviar"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
