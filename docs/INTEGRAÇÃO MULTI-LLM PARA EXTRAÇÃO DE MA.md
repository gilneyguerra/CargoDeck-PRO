INTEGRAÇÃO MULTI-LLM PARA EXTRAÇÃO DE MANIFESTOS
Migração de OCR Estático para Chat Interativo via OpenCode Zen
29 de abril de 2026

1. Briefing Executivo
Este documento detalha a substituição do motor de extração OCR tradicional, que apresenta inconsistências em documentos escaneados, por uma arquitetura de Chat Interativo baseada em modelos de linguagem de larga escala (LLMs) do ecossistema OpenCode Zen. O objetivo é permitir que o usuário envie manifestos em PDF e interaja com um agente inteligente capaz de interpretar contextos complexos, como mudanças de origem/destino no meio do arquivo, e realizar a extração de dados com precisão superior a 98%. A solução utiliza os modelos MiniMax M2.5 para extração estruturada, BigPickle para lógica de interface e Nemotron 3 Super para raciocínio analítico e validação de regras de negócio marítimas.
2. Arquitetura Multi-Modelo com Router Automático
A implementação utiliza um padrão de Router Inteligente para otimizar custos e latência, direcionando cada subtarefa ao modelo mais apto:
●	MiniMax M2.5 (Data Extractor): Especializado em transformar texto não estruturado e tabelas complexas em JSON puro. É o motor primário de extração.
●	BigPickle (UX & Orchestrator): Gerencia o fluxo da conversa, mantém a memória de curto prazo e formata as respostas para o usuário final.
●	Nemotron 3 Super (Reasoning & RCA): Acionado apenas em casos de inconsistência (ex: pesos divergentes ou códigos de carga ambíguos) para realizar análise de causa raiz e validação lógica.
3. Análise do PDF Manifesto (Campos a Extrair)
O agente deve identificar e extrair obrigatoriamente os seguintes blocos de dados contidos no manifesto:
●	Cabeçalho Global: Nome do navio, número da viagem e data do manifesto.
●	Seções Dinâmicas: Identificação de ORIGEM (ex: PACU, BMAC) e DESTINO (ex: NS44, NS32). O agente deve detectar quando esses campos mudam entre as páginas.
●	Lista de Cargas:Código Identificador: String alfanumérica única (ex: ABC 1234). Ignorar números após "ESL." ou "ESLINGA".
●	Descrição: Texto completo da carga.
●	Dimensões: Comprimento, Largura e Altura em metros.
●	Peso: Valor original em KG, convertido obrigatoriamente para Toneladas (TON) na saída final.
4. Fluxo de Chat Interativo (Passo-a-Passo)
1.	Upload: O usuário anexa o PDF no chat.
2.	Análise Inicial: O sistema identifica se o PDF é texto ou imagem e aplica o pré-processamento necessário.
3.	Extração Silenciosa: O MiniMax M2.5 processa o arquivo e gera um rascunho JSON.
4.	Interação de Confirmação: O BigPickle apresenta um resumo: "Identifiquei 15 cargas para o destino NS44 e 10 para NS32. Posso prosseguir com a importação?".
5.	Refinamento: O usuário pode corrigir dados via chat: "A carga 0045 na verdade pesa 2 toneladas".
6.	Commit: Após aprovação, os dados são injetados no estado global do CargoDeck Plan.
5. Componente React ChatManifestoImporter
import React, { useState, useEffect, useRef } from 'react'; import { useCargoStore } from '@/store/useCargoStore'; import { openCodeZenAPI } from '@/services/openCodeZen';  const ChatManifestoImporter = () => {   const [messages, setMessages] = useState([]);   const [isProcessing, setIsProcessing] = useState(false);   const { addCargosToDeck } = useCargoStore();   const scrollRef = useRef(null);    const handleFileUpload = async (event) => {     const file = event.target.files[0];     if (!file) return;      setIsProcessing(true);     // Adiciona mensagem do usuário     setMessages(prev => [...prev, { role: 'user', content: `Enviando arquivo: ${file.name}` }]);      try {       // Chamada ao Router OpenCode Zen       const response = await openCodeZenAPI.processManifesto(file);              setMessages(prev => [...prev, {          role: 'assistant', <br/>         content: response.summary,<br/>         data: response.extractedData        }]);     } catch (error) {       setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao processar PDF. Tente novamente.' }]);     } finally {       setIsProcessing(false);     }   };    const confirmImport = (data) => {     addCargosToDeck(data);     setMessages(prev => [...prev, { role: 'assistant', content: 'Cargas importadas com sucesso para o deck!' }]);   };    return (     <div className="flex flex-col h-full bg-gray-900 text-white p-4 rounded-lg border border-cyan-500/30">       <div className="flex-1 overflow-y-auto space-y-4 mb-4" ref={scrollRef}>         {messages.map((msg, i) => (           <div key={i} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 ml-auto' : 'bg-gray-800 mr-auto'} max-w-[80%]`}>             <p className="text-sm">{msg.content}</p>             {msg.data && (               <button                  onClick={() => confirmImport(msg.data)}                 className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-xs py-1 px-3 rounded"               >                 Confirmar Importação de {msg.data.length} itens               </button>             )}           </div>         ))}       </div>       <input type="file" onChange={handleFileUpload} disabled={isProcessing} className="block w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600" />     </div>   ); };  export default ChatManifestoImporter;
6. System Prompts Especializados
6.1. Prompt MiniMax M2.5 (Extractor)
"Você é um extrator de dados marítimos de alta precisão. Sua tarefa é ler o manifesto anexo e retornar APENAS um JSON estruturado. Identifique mudanças de ORIGEM e DESTINO. Para cada carga, extraia: código único (remova espaços), descrição, C, L, A e Peso. Converta o peso de KG para TON dividindo por 1000. Se encontrar 'ESL.' ou 'ESLINGA', ignore o número subsequente como identificador de carga."
6.2. Prompt BigPickle (UX)
"Você é o assistente virtual do CargoDeck Pro. Seja cordial e técnico. Ao receber dados do extrator, resuma as seções encontradas (Origem/Destino) e a quantidade de cargas. Pergunte se o usuário deseja revisar ou importar. Se o usuário solicitar uma correção, atualize o JSON interno."
7. Integração de APIs OpenCode Zen
// services/openCodeZen.js export const openCodeZenAPI = {   async processManifesto(file) {     const formData = new FormData();     formData.append('file', file);     formData.append('model', 'minimax-m2.5'); // Router inicial      const response = await fetch(process.env.NEXT_PUBLIC_OPENCODE_ZEN_ENDPOINT, {       method: 'POST',<br/>       headers: {<br/>         'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENCODE_ZEN_KEY}`       },       body: formData     });      return response.json();   } };
8. Configuração de Environment Variables no Vercel
As seguintes chaves devem ser configuradas no painel da Vercel para garantir a conectividade:
●	NEXT_PUBLIC_OPENCODE_ZEN_KEY: Chave de API mestra do OpenCode Zen.
●	NEXT_PUBLIC_OPENCODE_ZEN_ENDPOINT: URL do gateway de inferência.
●	MANIFESTO_STORAGE_BUCKET: Nome do bucket S3/Vercel Blob para armazenamento temporário de PDFs.
9. JSON Schema Estruturado de Saída
{   "manifest_id": "uuid-v4",<br/>   "vessel_name": "string",<br/>   "sections": [     {       "origin": "string",<br/>       "destination": "string",<br/>       "items": [         {           "id": "string",<br/>           "description": "string",<br/>           "dimensions": { "length": 0.0, "width": 0.0, "height": 0.0 },<br/>           "weight_ton": 0.0,<br/>           "original_weight_kg": 0.0,<br/>           "hash": "sha256-string"         }       ]     }   ] }
10. Tratamento de Erros e Fallbacks
Caso o modelo MiniMax M2.5 retorne um JSON inválido ou falhe na extração de campos críticos, o sistema deve:
7.	Retry Automático: Tentar uma segunda vez com temperatura 0.
8.	Escalonamento: Se a falha persistir, enviar o fragmento de texto para o Nemotron 3 Super com o prompt: "Analise este texto bruto e corrija a estrutura JSON, garantindo a integridade dos dados de peso e dimensões".
9.	Notificação: Informar ao usuário: "Encontrei dificuldades na leitura automática da página 2. Poderia confirmar se os dados abaixo estão corretos?".
11. Validações de Negócio
Antes da inserção no banco de dados, o sistema executa duas validações críticas:
●	Checksum ISO 6346: Validação de contêineres e códigos identificadores padrão.
●	Deduplicação SHA-256: Gera um hash único baseado em id + descrição + peso. Se o hash já existir no deck atual, a carga é marcada como duplicata e o usuário é alertado.
●	Cálculo de Estabilidade: $$PesoTotal = \sum (Carga_{i} \times Distancia_{i})$$. O sistema alerta se a distribuição entre bordos exceder 15% de desequilíbrio.
12. Integração com Deck Visual do CargoDeck
Após a confirmação no chat, a função `confirmImport` dispara um evento que atualiza o Zustand Store ou Redux do app. As cargas aparecem instantaneamente na "Sidebar de Cargas Pendentes", prontas para serem arrastadas para as baias do convés visual.
13. Estratégia de Testes
●	Unitário: Validar a função de conversão KG para TON.
●	Prompt Testing: Testar o MiniMax com 10 variações de layouts de manifestos (limpos vs ruidosos).
●	E2E (Cypress/Playwright): Simular o upload de um arquivo, interação no chat e verificação da carga no deck visual.
14. Cronograma de 5 Dias e Checklist
Cronograma (3 Fases)
●	Fase 1 (Dia 1-2): Configuração de APIs e desenvolvimento do componente de Chat UI.
●	Fase 2 (Dia 3-4): Engenharia de prompts e lógica de extração multi-modelo.
●	Fase 3 (Dia 5): Integração com o estado global do deck e testes finais.
Checklist de 20 Itens
10.	Chaves de API configuradas no Vercel.
11.	Componente ChatManifestoImporter renderizando.
12.	Upload de PDF funcionando via FormData.
13.	MiniMax M2.5 extraindo JSON básico.
14.	Detecção de mudança de Origem/Destino validada.
15.	Conversão KG para TON verificada.
16.	Filtro de "ESLINGA" funcionando.
17.	BigPickle gerando resumos amigáveis.
18.	Botão de confirmação injetando dados no Store.
19.	Hash SHA-256 gerado para cada carga.
20.	Validação de duplicatas ativa.
21.	Fallback para Nemotron 3 Super configurado.
22.	Scroll automático do chat para novas mensagens.
23.	Loading states visíveis durante processamento.
24.	Responsividade do chat em telas menores.
25.	Tratamento de erro para arquivos corrompidos.
26.	Logs de extração salvos para auditoria.
27.	Prompt de sistema protegido contra injeção.
28.	Teste de carga com PDF de 50+ páginas.
29.	Documentação de uso atualizada para o usuário final.

