import { useState, useCallback, useRef } from 'react';
import {
  extractManifestoJSON,
  validateManifestoData,
  applyCorrectionFromChat,
  transformToCargoObjects,
  type ManifestoJSON,
  type ValidationResult,
} from '@/services/manifestExtractor';
import { routeTask } from '@/services/llmRouter';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';

export type ExtractionPhase = 'idle' | 'extracting' | 'validating' | 'awaiting_confirmation' | 'importing' | 'done';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  timestamp: Date;
}

interface ExtractionState {
  messages: ChatMessage[];
  extractedJSON: ManifestoJSON | null;
  validationResult: ValidationResult | null;
  phase: ExtractionPhase;
  isProcessing: boolean;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Olá! Sou seu assistente de importação inteligente.\n\nCole o conteúdo do manifesto de carga ou faça upload de um arquivo PDF. Vou extrair, validar e estruturar todos os dados automaticamente.',
  timestamp: new Date(),
};

function mkId() { return Math.random().toString(36).slice(2); }

export function useManifestoExtraction(onClose: () => void) {
  const { setExtractedCargoes } = useCargoStore();
  const { notify, setBanner, hideBanner } = useNotificationStore();

  const [state, setState] = useState<ExtractionState>({
    messages: [WELCOME_MESSAGE],
    extractedJSON: null,
    validationResult: null,
    phase: 'idle',
    isProcessing: false,
  });

  const conversationHistory = useRef<Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>>([]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, isLoading = false): string => {
    const id = mkId();
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { id, role, content, isLoading, timestamp: new Date() }],
    }));
    return id;
  }, []);

  const updateMessage = useCallback((id: string, content: string) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(m => m.id === id ? { ...m, content, isLoading: false } : m),
    }));
  }, []);

  const runExtractAndValidate = useCallback(async (rawText: string) => {
    setState(prev => ({ ...prev, isProcessing: true, phase: 'extracting' }));
    const loadingId = addMessage('assistant', '...', true);
    setBanner('Extraindo dados do manifesto via IA...', 30);

    try {
      const json = await extractManifestoJSON(rawText);
      updateMessage(loadingId, `Extração concluída. Encontrei **${json.cargasArray.length} carga(s)**.\n\nValidando dados...`);

      setState(prev => ({ ...prev, phase: 'validating', extractedJSON: json }));
      setBanner('Validando integridade dos dados...', 70);

      const validation = await validateManifestoData(json);
      hideBanner();

      let responseText = `**Manifesto processado com sucesso!**\n\n`;
      responseText += `🚢 **Navio:** ${json.naveData.nome || 'N/D'}\n`;
      responseText += `📍 **Rota:** ${json.rotaData.origem} → ${json.rotaData.destino}\n`;
      responseText += `📦 **Total de cargas:** ${json.cargasArray.length}\n`;

      if (json.rotaData.mudancasSequenciais && json.rotaData.mudancasSequenciais.length > 0) {
        responseText += `🔀 **Mudanças de rota detectadas:** ${json.rotaData.mudancasSequenciais.length}\n`;
      }

      if (validation.alertas.length > 0) {
        responseText += `\n⚠️ **Alertas de validação:**\n`;
        validation.alertas.forEach(a => { responseText += `• ${a}\n`; });
        responseText += `\nPosso importar mesmo assim, ou deseja corrigir algum item?`;
      } else {
        responseText += `\n✅ Todos os dados foram validados com sucesso.\n\nDeseja importar as ${json.cargasArray.length} cargas para o inventário?`;
      }

      updateMessage(loadingId, responseText);

      conversationHistory.current.push(
        { role: 'user', parts: [{ text: rawText.slice(0, 500) }] },
        { role: 'model', parts: [{ text: responseText }] }
      );

      setState(prev => ({
        ...prev,
        phase: 'awaiting_confirmation',
        isProcessing: false,
        validationResult: validation,
        extractedJSON: json,
      }));
    } catch (err) {
      hideBanner();
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      updateMessage(loadingId, `❌ Erro na extração: ${msg}\n\nVerifique se a chave VITE_GEMINI_API_KEY está configurada e tente novamente.`);
      setState(prev => ({ ...prev, phase: 'idle', isProcessing: false }));
    }
  }, [addMessage, updateMessage, setBanner, hideBanner]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || state.isProcessing) return;

    addMessage('user', text);

    if (state.phase === 'idle') {
      await runExtractAndValidate(text);
      return;
    }

    if (state.phase === 'awaiting_confirmation') {
      const lower = text.toLowerCase();
      const isConfirm = /^(sim|s|yes|y|ok|confirmar|importar|pode|prosseguir|vamos)/.test(lower);
      const isCancel = /^(n[aã]o|no|cancelar|abort)/.test(lower);

      if (isConfirm) {
        await confirmImport();
        return;
      }

      if (isCancel) {
        addMessage('assistant', 'Importação cancelada. Quando quiser, cole um novo manifesto.');
        setState(prev => ({ ...prev, phase: 'idle', extractedJSON: null }));
        return;
      }

      // Treat as correction
      setState(prev => ({ ...prev, isProcessing: true }));
      const loadingId = addMessage('assistant', '...', true);

      try {
        const updated = await applyCorrectionFromChat(state.extractedJSON!, text);
        const validation = await validateManifestoData(updated);

        conversationHistory.current.push(
          { role: 'user', parts: [{ text }] },
          { role: 'model', parts: [{ text: 'Correção aplicada.' }] }
        );

        let responseText = `✅ Correção aplicada. JSON atualizado com **${updated.cargasArray.length} cargas**.`;
        if (validation.alertas.length > 0) {
          responseText += `\n\n⚠️ Ainda há alertas:\n` + validation.alertas.map(a => `• ${a}`).join('\n');
          responseText += '\n\nDeseja importar mesmo assim?';
        } else {
          responseText += '\n\nTudo validado! Deseja importar agora?';
        }

        updateMessage(loadingId, responseText);
        setState(prev => ({ ...prev, isProcessing: false, extractedJSON: updated, validationResult: validation }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro';
        updateMessage(loadingId, `❌ Erro ao aplicar correção: ${msg}`);
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    } else {
      // General chat mode
      setState(prev => ({ ...prev, isProcessing: true }));
      const loadingId = addMessage('assistant', '...', true);
      try {
        const res = await routeTask('CHAT', text, conversationHistory.current);
        updateMessage(loadingId, res.content);
        conversationHistory.current.push(
          { role: 'user', parts: [{ text }] },
          { role: 'model', parts: [{ text: res.content }] }
        );
      } catch {
        updateMessage(loadingId, 'Não consegui processar sua mensagem. Tente novamente.');
      } finally {
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    }
  }, [state, addMessage, updateMessage, runExtractAndValidate]);

  const uploadFile = useCallback(async (file: File) => {
    if (state.isProcessing) return;

    addMessage('user', `📎 Arquivo: ${file.name}`);

    setState(prev => ({ ...prev, isProcessing: true }));
    const loadingId = addMessage('assistant', '...', true);
    setBanner('Carregando e processando PDF...', 10);

    try {
      // Dynamically import pdfExtractor to avoid circular deps
      const { PDFExtractor } = await import('@/services/pdfExtractor');
      const validation = PDFExtractor.validateFile(file);
      if (!validation.valid) throw new Error(validation.error.message);

      updateMessage(loadingId, 'PDF carregado. Extraindo texto...');
      setBanner('Extraindo texto do PDF...', 40);

      const result = await PDFExtractor.extract(file, (p) => {
        setBanner('Processando PDF...', 40 + Math.round(p * 0.3));
      });

      if (!result.success || !result.data?.items?.length) {
        updateMessage(loadingId, 'Não foi possível extrair texto do PDF. Tente colar o texto do manifesto diretamente.');
        hideBanner();
        setState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      const items = result.data.items;
      // Build raw text from extracted items for LLM parsing
      const rawText = items.map(i =>
        `${i.identifier} | ${i.description} | ${i.weight}t | ${i.length ?? 0}x${i.width ?? 0}x${i.height ?? 0}m`
      ).join('\n');

      updateMessage(loadingId, `Texto extraído (${items.length} itens detectados via OCR). Enviando para análise IA...`);
      hideBanner();
      setState(prev => ({ ...prev, isProcessing: false }));

      await runExtractAndValidate(rawText);
    } catch (err) {
      hideBanner();
      const msg = err instanceof Error ? err.message : 'Erro';
      updateMessage(loadingId, `❌ Erro ao processar PDF: ${msg}`);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [state.isProcessing, addMessage, updateMessage, setBanner, hideBanner, runExtractAndValidate]);

  const confirmImport = useCallback(async () => {
    if (!state.extractedJSON) return;
    setState(prev => ({ ...prev, isProcessing: true, phase: 'importing' }));
    setBanner('Importando cargas para o inventário...', 90);

    try {
      const cargoes = await transformToCargoObjects(state.extractedJSON);
      setExtractedCargoes(cargoes);
      hideBanner();
      notify(`${cargoes.length} carga(s) importadas com sucesso!`, 'success');
      setState(prev => ({ ...prev, phase: 'done', isProcessing: false }));
      onClose();
    } catch (err) {
      hideBanner();
      const msg = err instanceof Error ? err.message : 'Erro';
      addMessage('assistant', `❌ Erro ao importar: ${msg}`);
      setState(prev => ({ ...prev, isProcessing: false, phase: 'awaiting_confirmation' }));
    }
  }, [state.extractedJSON, setExtractedCargoes, notify, setBanner, hideBanner, onClose, addMessage]);

  const reset = useCallback(() => {
    conversationHistory.current = [];
    setState({
      messages: [WELCOME_MESSAGE],
      extractedJSON: null,
      validationResult: null,
      phase: 'idle',
      isProcessing: false,
    });
  }, []);

  return {
    messages: state.messages,
    extractedJSON: state.extractedJSON,
    validationResult: state.validationResult,
    phase: state.phase,
    isProcessing: state.isProcessing,
    sendMessage,
    uploadFile,
    confirmImport,
    reset,
  };
}
