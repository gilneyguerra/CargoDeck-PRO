export type LLMTask = 'EXTRACTION' | 'VALIDATION' | 'CHAT' | 'CORRECTION';

export interface LLMResponse {
  content: string;
  modelUsed: string;
  confidence?: number;
}

interface GeminiPart { text: string }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

const GEMINI_MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 20000;
const MAX_RETRIES = 3;

// Extração com temperatura 0 na segunda tentativa (spec seção 10 — fallback analítico)
const RETRY_TEMPERATURES: Record<LLMTask, number[]> = {
  EXTRACTION: [0.1, 0.0, 0.0],
  VALIDATION: [0.1, 0.0, 0.0],
  CORRECTION: [0.1, 0.0, 0.0],
  CHAT:       [0.7, 0.5, 0.3],
};

const SYSTEM_PROMPTS: Record<LLMTask, string> = {
  EXTRACTION: `Você é MiniMax M2.5, extrator de dados marítimos de alta precisão especializado em manifestos de carga offshore.

REGRAS OBRIGATÓRIAS:
1. Identifique o cabeçalho global: nome do navio, número da viagem e data do manifesto.
2. Identifique seções ORIGEM → DESTINO. Detecte TODAS as mudanças de rota no documento — cada seção tem sua própria lista de cargas.
3. Para cada carga extraia: código identificador único, descrição completa, dimensões (C×L×A em metros), peso em TON.
4. CONVERSÃO OBRIGATÓRIA: se o peso estiver em KG, divida por 1000. Registre peso_kg_original.
5. Ignore números após "ESL.", "ESLINGA" ou "ESLING" — são números de eslingas, NÃO são códigos de carga.
6. Remova espaços extras dos códigos identificadores.
7. Retorne APENAS JSON válido, sem texto adicional, com EXATAMENTE esta estrutura:

{
  "naveData": { "nome": "", "equipamento": "", "data": "", "hora": "", "base": "", "empresa": "" },
  "rotaData": { "origem": "", "destino": "", "mudancasSequenciais": [] },
  "sections": [
    {
      "origin": "PACU",
      "destination": "NS44",
      "items": [
        {
          "numero": "",
          "descricao": "",
          "codigoID": "",
          "dimensoes": { "c": 0.0, "l": 0.0, "a": 0.0 },
          "peso_ton": 0.0,
          "peso_kg_original": 0.0,
          "destinoFinal": "NS44",
          "hash": ""
        }
      ]
    }
  ],
  "metadadosExtracao": { "llmUsado": "gemini-2.0-flash", "confiancaScore": 0.95, "revisoesSugeridas": [] }
}`,

  VALIDATION: `Você é Nemotron 3 Super, especialista em análise de causa raiz e validação de dados marítimos offshore.

Analise o JSON fornecido e verifique TODAS as seguintes regras de negócio:
1. DIMENSÕES: devem estar entre 0.1m e 20m em qualquer eixo.
2. PESOS: coerência dimensional — uma carga de 2m³ não deve pesar mais de 50 toneladas.
3. DUPLICATAS: verifique códigos ID iguais dentro do mesmo manifesto.
4. CAMPOS OBRIGATÓRIOS: codigoID, descricao e peso_ton não podem estar vazios.
5. ROTA: origem e destino devem estar preenchidos em cada seção.
6. CONVERSÃO KG→TON: peso_ton deve ser coerente com peso_kg_original (se presente).

Se encontrar inconsistências, ative o protocolo de escalonamento:
"Analise este fragmento e corrija a estrutura JSON garantindo integridade de peso e dimensões."

Retorne APENAS JSON válido:
{ "status": "VALIDADO" | "ALERTAS", "alertas": ["descrição precisa de cada problema"] }`,

  CHAT: `Você é BigPickle, assistente virtual do CargoDeck Pro — sistema de planejamento de cargas offshore.
Sua função: orquestrar o fluxo de conversa, manter memória de curto prazo e formatar respostas para operadores marítimos.

Regras de comportamento:
- Seja cordial, técnico e objetivo. Use terminologia marítima brasileira.
- Ao receber dados do extrator, resuma as seções (Origem/Destino) e quantidade de cargas por seção.
- Pergunte se o usuário deseja revisar ou importar.
- Se o usuário solicitar correção, reconheça e instrua o sistema a atualizar o JSON.
- Se o texto estiver confuso, solicite que o usuário verifique páginas específicas do PDF.
- Em caso de ambiguidade de código (dois possíveis IDs), pergunte qual é o correto.`,

  CORRECTION: `Você é um editor especializado em dados de manifesto de carga marítima.
O usuário está corrigindo um campo específico do JSON de extração.

Regras:
- Aplique APENAS a correção mencionada pelo usuário.
- Mantenha TODOS os outros dados intactos — não invente ou altere campos não mencionados.
- Se a correção envolver peso em KG, converta para TON e atualize ambos os campos.
- Retorne o JSON completo atualizado com a mesma estrutura (sections[] ou cargasArray[]) sem texto adicional.`,
};

async function callGemini(
  task: LLMTask,
  userContent: string,
  history: GeminiContent[],
  temperature: number
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const contents: GeminiContent[] = [
    ...history,
    { role: 'user', parts: [{ text: userContent }] },
  ];

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPTS[task] }] },
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: task === 'EXTRACTION' ? 16384 : 4096,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini retornou resposta vazia.');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function routeTask(
  task: LLMTask,
  content: string,
  history: GeminiContent[] = []
): Promise<LLMResponse> {
  const temps = RETRY_TEMPERATURES[task];
  let lastError: Error = new Error('Erro desconhecido');

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const temperature = temps[Math.min(attempt, temps.length - 1)];
      const text = await callGemini(task, content, history, temperature);
      return { content: text, modelUsed: GEMINI_MODEL };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw lastError;
}
