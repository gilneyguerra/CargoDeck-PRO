export type LLMTask = 'EXTRACTION' | 'VALIDATION' | 'CHAT' | 'CORRECTION';

export interface LLMResponse {
  content: string;
  modelUsed: string;
  confidence?: number;
}

interface GeminiPart { text: string }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

const GEMINI_MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;

const SYSTEM_PROMPTS: Record<LLMTask, string> = {
  EXTRACTION: `Você é um especialista em logística offshore. Sua tarefa é extrair dados estruturados de manifestos de carga marítima.

Regras obrigatórias:
1. Identifique blocos de ORIGEM e DESTINO. Detecte mudanças de rota no documento.
2. Para cada carga extraia: número sequencial, descrição, código ID único, dimensões (C×L×A em metros), peso em TON.
3. Conversão obrigatória: se o peso estiver em KG, divida por 1000 para obter TON.
4. Ignore números após "ESL.", "ESLINGA" ou "ESLING" — são números de eslingas, não códigos de carga.
5. Retorne APENAS um JSON válido sem texto adicional, com exatamente esta estrutura:
{
  "naveData": { "nome": "", "equipamento": "", "data": "", "hora": "", "base": "", "empresa": "" },
  "rotaData": { "origem": "", "destino": "", "mudancasSequenciais": [] },
  "cargasArray": [{ "numero": "", "descricao": "", "codigoID": "", "dimensoes": { "c": 0, "l": 0, "a": 0 }, "peso_ton": 0, "destinoFinal": "" }],
  "metadadosExtracao": { "llmUsado": "gemini-2.0-flash", "confiancaScore": 0.9, "revisoesSugeridas": [] }
}`,

  VALIDATION: `Você é um validador de dados de manifesto de carga offshore. Analise o JSON fornecido e verifique:
1. Dimensões realistas para cargas de convés: entre 0.1m e 20m em qualquer eixo.
2. Pesos coerentes: uma carga de 2m não deve pesar mais de 50 toneladas.
3. Códigos ID duplicados na mesma lista.
4. Campos obrigatórios ausentes (codigoID, descricao, peso_ton).
5. Origem e destino preenchidos.

Retorne APENAS um JSON válido:
{ "status": "VALIDADO" | "ALERTAS", "alertas": ["descrição de cada problema encontrado"] }`,

  CHAT: `Você é o Assistente de Importação Inteligente do CargoDeck, sistema de planejamento de cargas offshore.
Sua função é ajudar operadores marítimos a importar manifestos de carga.
Seja cordial, técnico e objetivo. Use terminologia marítima brasileira.
Se o texto estiver confuso ou ilegível, solicite que o usuário verifique páginas específicas do PDF.
Se não houver manifesto, pergunte se o usuário deseja colar o texto ou fazer upload de um arquivo.`,

  CORRECTION: `Você é um editor de dados de manifesto de carga. O usuário está corrigindo um campo específico do JSON.
Aplique APENAS a correção mencionada, mantendo todos os outros dados intactos.
Retorne o JSON completo atualizado com a mesma estrutura original, sem texto adicional.`,
};

async function callGemini(
  task: LLMTask,
  userContent: string,
  history: GeminiContent[] = []
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
      temperature: task === 'CHAT' ? 0.7 : 0.1,
      maxOutputTokens: task === 'EXTRACTION' ? 8192 : 2048,
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
  let lastError: Error = new Error('Erro desconhecido');

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const text = await callGemini(task, content, history);
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
