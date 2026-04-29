// OpenCode Zen Multi-LLM Router — https://opencode.ai/docs/pt-br/zen/
// Endpoint OpenAI-compatible: https://opencode.ai/zen/v1/chat/completions
// Modelo por tarefa (conforme spec):
//   EXTRACTION  → minimax-m2.5  (Data Extractor)
//   VALIDATION  → nemotron-3-super-free (Reasoning & RCA)
//   CHAT        → big-pickle    (UX & Orchestrator)
//   CORRECTION  → minimax-m2.5  (structured editor)

export type LLMTask = 'EXTRACTION' | 'VALIDATION' | 'CHAT' | 'CORRECTION';

export interface LLMResponse {
  content: string;
  modelUsed: string;
  confidence?: number;
}

interface OAIMessage { role: 'system' | 'user' | 'assistant'; content: string }

const ZEN_ENDPOINT = 'https://opencode.ai/zen/v1/chat/completions';
const TIMEOUT_MS   = 30000;
const MAX_RETRIES  = 3;

// Modelo primário e fallback por tarefa
const TASK_MODELS: Record<LLMTask, { primary: string; fallback: string }> = {
  EXTRACTION: { primary: 'minimax-m2.5',         fallback: 'gemini-3-flash'      },
  VALIDATION: { primary: 'nemotron-3-super-free', fallback: 'minimax-m2.5-free'  },
  CHAT:       { primary: 'big-pickle',            fallback: 'gemini-3-flash'      },
  CORRECTION: { primary: 'minimax-m2.5',          fallback: 'minimax-m2.5-free'  },
};

// Temperatura por tarefa e tentativa (temp=0 na 2ª tentativa para JSON estruturado)
const RETRY_TEMPS: Record<LLMTask, number[]> = {
  EXTRACTION: [0.1, 0.0, 0.0],
  VALIDATION: [0.1, 0.0, 0.0],
  CORRECTION: [0.1, 0.0, 0.0],
  CHAT:       [0.7, 0.5, 0.3],
};

const SYSTEM_PROMPTS: Record<LLMTask, string> = {
  EXTRACTION: `Você é MiniMax M2.5, extrator de dados marítimos de alta precisão especializado em manifestos de carga offshore.

REGRAS OBRIGATÓRIAS:
1. Identifique o cabeçalho global: nome do navio, número da viagem e data do manifesto.
2. Identifique seções ORIGEM → DESTINO. Detecte TODAS as mudanças de rota — cada seção tem sua própria lista de cargas.
3. Para cada carga extraia: código identificador único, descrição completa, dimensões (C×L×A em metros), peso em TON.
4. CONVERSÃO OBRIGATÓRIA: se o peso estiver em KG, divida por 1000. Registre peso_kg_original.
5. Ignore números após "ESL.", "ESLINGA" ou "ESLING" — são números de eslingas, NÃO são códigos de carga.
6. Remova espaços extras dos códigos identificadores.
7. Retorne APENAS JSON válido, sem nenhum texto adicional antes ou depois, com EXATAMENTE esta estrutura:

{
  "naveData": { "nome": "", "equipamento": "", "data": "", "hora": "", "base": "", "empresa": "" },
  "rotaData": { "origem": "", "destino": "", "mudancasSequenciais": [] },
  "sections": [
    {
      "origin": "",
      "destination": "",
      "items": [
        {
          "numero": "",
          "descricao": "",
          "codigoID": "",
          "dimensoes": { "c": 0.0, "l": 0.0, "a": 0.0 },
          "peso_ton": 0.0,
          "peso_kg_original": 0.0,
          "destinoFinal": ""
        }
      ]
    }
  ],
  "metadadosExtracao": { "llmUsado": "minimax-m2.5", "confiancaScore": 0.95, "revisoesSugeridas": [] }
}`,

  VALIDATION: `Você é Nemotron 3 Super, especialista em análise de causa raiz (RCA) e validação de dados marítimos offshore.

Analise o JSON e verifique TODAS as regras de negócio:
1. DIMENSÕES: devem estar entre 0.1m e 20m em qualquer eixo. Fora desse range = suspeito.
2. PESOS: uma carga de volume < 1m³ raramente pesa > 50t. Pesos absurdos devem ser sinalizados.
3. DUPLICATAS: dois items com mesmo codigoID na mesma seção indicam erro de extração.
4. CAMPOS OBRIGATÓRIOS: codigoID, descricao e peso_ton não podem estar vazios ou zero.
5. ROTA: origin e destination devem estar preenchidos em cada seção.
6. KG→TON: se peso_kg_original existir, valide que peso_ton = peso_kg_original / 1000 (tolerância 0.01).

Retorne APENAS JSON válido:
{ "status": "VALIDADO" | "ALERTAS", "alertas": ["descrição precisa de cada problema encontrado"] }`,

  CHAT: `Você é BigPickle, assistente virtual inteligente do CargoDeck Pro — sistema de planejamento de cargas offshore.

Sua função como Orquestrador UX:
- Gerencie o fluxo da conversa e mantenha memória de curto prazo do contexto.
- Seja cordial, técnico e objetivo. Use terminologia marítima brasileira.
- Ao receber dados do extrator (MiniMax), resuma as seções (Origem/Destino) e quantidade de cargas por seção.
- Pergunte se o usuário deseja revisar individualmente ou importar diretamente.
- Se o usuário solicitar correção de um item específico, confirme antes de aplicar.
- Em caso de ambiguidade de código (dois possíveis IDs), pergunte qual é o correto.
- Se o PDF estiver ilegível, peça para o usuário verificar a página específica com problema.`,

  CORRECTION: `Você é MiniMax M2.5 no modo de edição precisa de manifesto de carga marítima.

O usuário está corrigindo um ou mais campos do JSON extraído anteriormente.

REGRAS:
- Aplique EXATAMENTE a correção mencionada pelo usuário — não altere outros campos.
- Se a correção envolver peso em KG, converta para TON (divida por 1000) e atualize peso_kg_original também.
- Se a correção envolver um código ID, remova espaços extras e atualize o campo codigoID.
- Mantenha a estrutura sections[] intacta — apenas atualize os valores dos campos informados.
- Retorne o JSON COMPLETO atualizado sem nenhum texto antes ou depois.`,
};

async function callZen(
  task: LLMTask,
  messages: OAIMessage[],
  model: string,
  temperature: number
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENCODE_ZEN_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENCODE_ZEN_KEY não configurada no .env — obtenha sua chave em https://opencode.ai');
  }

  const endpoint = import.meta.env.VITE_OPENCODE_ZEN_ENDPOINT || ZEN_ENDPOINT;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: task === 'EXTRACTION' ? 16384 : 4096,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenCode Zen [${model}] erro ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error(`${model} retornou resposta vazia.`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildMessages(task: LLMTask, userContent: string, history: OAIMessage[]): OAIMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPTS[task] },
    ...history,
    { role: 'user', content: userContent },
  ];
}

export async function routeTask(
  task: LLMTask,
  content: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
): Promise<LLMResponse> {
  // Converter histórico do formato Gemini para OpenAI
  const oaiHistory: OAIMessage[] = history.map(h => ({
    role: h.role === 'model' ? 'assistant' : 'user',
    content: h.parts.map(p => p.text).join(''),
  }));

  const { primary, fallback } = TASK_MODELS[task];
  const temps = RETRY_TEMPS[task];
  let lastError: Error = new Error('Erro desconhecido');

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Tenta modelo primário nas 2 primeiras tentativas, fallback na última
    const model = attempt < MAX_RETRIES - 1 ? primary : fallback;
    const temperature = temps[Math.min(attempt, temps.length - 1)];

    try {
      const messages = buildMessages(task, content, oaiHistory);
      const text = await callZen(task, messages, model, temperature);
      return { content: text, modelUsed: model };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw lastError;
}
