import { useState, useCallback, useRef } from 'react';
import {
  extractManifestoJSON,
  validateManifestoData,
  applyCorrectionFromChat,
  transformToCargoObjects,
  calculateStabilityBalance,
  countCargas,
  type ManifestoJSON,
  type ValidationResult,
} from '@/services/manifestExtractor';
import { routeTask } from '@/services/llmRouter';
import { saveExtractionLog } from '@/services/auditLog';
import { useCargoStore } from '@/features/cargoStore';
import { useNotificationStore } from '@/features/notificationStore';
import { reportException } from '@/features/errorReporter';

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
  content: 'Olá! Sou seu assistente de importação inteligente.\n\nCole o conteúdo do manifesto de carga ou faça upload de um arquivo PDF. Vou extrair, validar e estruturar todos os dados automaticamente.\n\n**Suporte a multi-rota:** Detectarei automaticamente mudanças de Origem/Destino no documento.',
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

  const buildSummaryMessage = useCallback((json: ManifestoJSON, validation: ValidationResult): string => {
    const total = countCargas(json);
    let responseText = `**Manifesto processado com sucesso!**\n\n`;
    responseText += `🚢 **Navio:** ${json.naveData?.nome || 'N/D'}\n`;

    // Resumo por seções (novo schema) ou rota legada
    if (json.sections && json.sections.length > 0) {
      json.sections.forEach(section => {
        responseText += `📍 **${section.origin} → ${section.destination}:** ${section.items.length} carga(s)\n`;
      });
    } else {
      responseText += `📍 **Rota:** ${json.rotaData?.origem} → ${json.rotaData?.destino}\n`;
      if (json.rotaData?.mudancasSequenciais?.length) {
        responseText += `🔀 **Mudanças de rota detectadas:** ${json.rotaData.mudancasSequenciais.length}\n`;
      }
    }

    responseText += `📦 **Total de cargas:** ${total}\n`;

    const confianca = json.metadadosExtracao?.confiancaScore;
    if (confianca !== undefined) {
      responseText += `🎯 **Confiança da extração:** ${(confianca * 100).toFixed(0)}%\n`;
    }

    if (validation.alertas.length > 0) {
      responseText += `\n⚠️ **Alertas de validação (Nemotron RCA):**\n`;
      validation.alertas.forEach(a => { responseText += `• ${a}\n`; });
      responseText += `\nPosso importar mesmo assim, ou deseja corrigir algum item via chat?`;
    } else {
      responseText += `\n✅ Todos os dados foram validados com sucesso.\n\nDeseja importar as ${total} cargas para o inventário?`;
    }

    return responseText;
  }, []);

  const runExtractAndValidate = useCallback(async (rawText: string) => {
    setState(prev => ({ ...prev, isProcessing: true, phase: 'extracting' }));
    const loadingId = addMessage('assistant', '...', true);
    setBanner('MiniMax M2.5 extraindo dados do manifesto...', 25);

    try {
      const json = await extractManifestoJSON(rawText);
      const total = countCargas(json);
      updateMessage(loadingId, `Extração concluída. Encontrei **${total} carga(s)**.\n\nNemotron analisando integridade dos dados...`);

      setState(prev => ({ ...prev, phase: 'validating', extractedJSON: json }));
      setBanner('Validando integridade dos dados...', 70);

      const validation = await validateManifestoData(json);
      hideBanner();

      const responseText = buildSummaryMessage(json, validation);
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
      updateMessage(loadingId, `❌ Erro na extração: ${msg}\n\nVerifique se a chave VITE_OPENCODE_ZEN_KEY está configurada e tente novamente.`);
      reportException(err, {
        title: 'Falha na extração de manifesto via IA',
        category: 'network',
        severity: 'error',
        source: 'manifest-llm-extraction',
        suggestion: 'Verifique conexão de internet e a configuração da chave OpenCode Zen no .env. Como alternativa, use o Editor em Grade (Excel) para importar manualmente.',
      });
      setState(prev => ({ ...prev, phase: 'idle', isProcessing: false }));
    }
  }, [addMessage, updateMessage, setBanner, hideBanner, buildSummaryMessage]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || state.isProcessing) return;

    addMessage('user', text);

    if (state.phase === 'idle') {
      await runExtractAndValidate(text);
      return;
    }

    if (state.phase === 'awaiting_confirmation') {
      const lower = text.toLowerCase().trim();
      const isConfirm = /^(sim|s|yes|y|ok|confirmar|importar|pode|prosseguir|vamos|confirma)/.test(lower);
      const isCancel  = /^(n[aã]o|no|cancelar|abort|sair)/.test(lower);

      if (isConfirm) { await confirmImport(); return; }
      if (isCancel) {
        addMessage('assistant', 'Importação cancelada. Quando quiser, cole um novo manifesto ou faça upload de um PDF.');
        setState(prev => ({ ...prev, phase: 'idle', extractedJSON: null }));
        return;
      }

      // Tratado como correção
      setState(prev => ({ ...prev, isProcessing: true }));
      const loadingId = addMessage('assistant', '...', true);

      try {
        const updated = await applyCorrectionFromChat(state.extractedJSON!, text);
        const validation = await validateManifestoData(updated);

        conversationHistory.current.push(
          { role: 'user', parts: [{ text }] },
          { role: 'model', parts: [{ text: 'Correção aplicada.' }] }
        );

        const total = countCargas(updated);
        let responseText = `✅ Correção aplicada. JSON atualizado com **${total} cargas**.`;
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
      return;
    }

    // Chat livre em qualquer outra fase
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
  }, [state, addMessage, updateMessage, runExtractAndValidate]);

  const uploadFile = useCallback(async (file: File) => {
    if (state.isProcessing) return;

    addMessage('user', `📎 Arquivo: ${file.name}`);
    setState(prev => ({ ...prev, isProcessing: true }));
    const loadingId = addMessage('assistant', '...', true);
    setBanner('Carregando e processando PDF...', 10);

    try {
      const { PDFExtractor } = await import('@/services/pdfExtractor');
      const fileValidation = PDFExtractor.validateFile(file);
      if (!fileValidation.valid) throw new Error(fileValidation.error.message);

      updateMessage(loadingId, 'PDF carregado. Extraindo texto via OCR...');
      setBanner('Extraindo texto do PDF...', 40);

      const result = await PDFExtractor.extract(file, (p) => {
        setBanner('Processando PDF...', 40 + Math.round(p * 0.3));
      });

      if (!result.success || !result.data?.items?.length) {
        updateMessage(loadingId, 'Não foi possível extrair texto do PDF. Tente colar o texto do manifesto diretamente no chat.');
        hideBanner();
        setState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      const items = result.data.items;
      const rawText = items.map(i =>
        `${i.identifier} | ${i.description} | ${i.weight}t | ${i.length ?? 0}x${i.width ?? 0}x${i.height ?? 0}m`
      ).join('\n');

      updateMessage(loadingId, `Texto extraído — ${items.length} itens detectados via OCR. Enviando para MiniMax M2.5...`);
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

      // Auditoria (spec seção 14 — logs para auditoria)
      saveExtractionLog(state.extractedJSON, cargoes.length);

      // Cálculo de estabilidade (spec seção 11)
      const stability = calculateStabilityBalance(cargoes);

      hideBanner();
      notify(`${cargoes.length} carga(s) importadas com sucesso!`, 'success');

      if (!stability.isBalanced && stability.alertMessage) {
        // Pequeno delay para não sobrepor o toast de sucesso
        setTimeout(() => notify(stability.alertMessage!, 'warning'), 1500);
      }

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
