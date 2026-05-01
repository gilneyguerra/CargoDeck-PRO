/**
 * @file Vercel Serverless (Edge runtime) — proxy para o OpenCode Zen Multi-LLM.
 *
 * Por que existe:
 *   1. SEGURANÇA. A chave fica no servidor (env `OPENCODE_ZEN_KEY` sem prefixo
 *      `VITE_*`). Nunca aparece no bundle do client. Antes da introdução
 *      deste proxy, a chave saía como `VITE_OPENCODE_ZEN_KEY` direto no JS
 *      do browser — qualquer pessoa via DevTools tinha acesso.
 *   2. CORS. OpenCode Zen não envia headers CORS para chamadas browser.
 *      Chamando `/api/llm-zen` (mesmo origin), o browser não bloqueia, e o
 *      Vercel faz a chamada server-to-server sem restrição.
 *
 * Contrato: o cliente (src/services/llmRouter.ts) envia o body OAI-compatível
 * (model, messages, temperature, max_tokens) via POST. Este handler
 * encaminha para o endpoint upstream com `Authorization: Bearer ...` e
 * devolve o JSON tal qual.
 *
 * Edge runtime: zero deps, cold start mínimo, suportado nativamente pelo
 * Vercel sem precisar do pacote @vercel/node.
 */

export const config = {
  runtime: 'edge',
};

const DEFAULT_ENDPOINT = 'https://opencode.ai/zen/v1/chat/completions';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonError(405, 'Método não permitido. Use POST.');
  }

  // Edge runtime expõe env via process.env (Vercel injeta).
  const apiKey = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.OPENCODE_ZEN_KEY;
  if (!apiKey) {
    return jsonError(
      500,
      'Servidor mal configurado: defina OPENCODE_ZEN_KEY (sem prefixo VITE_) nas Environment Variables do Vercel.'
    );
  }

  const endpoint = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.OPENCODE_ZEN_ENDPOINT ?? DEFAULT_ENDPOINT;

  let body: string;
  try {
    body = await req.text();
    if (!body) return jsonError(400, 'Body vazio.');
    // Validação leve — tem que ser JSON parseável; não inspecionamos campos.
    JSON.parse(body);
  } catch {
    return jsonError(400, 'Body precisa ser JSON válido.');
  }

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return jsonError(502, `Upstream OpenCode Zen indisponível: ${msg}`);
  }

  // Pass-through do status + body. Não vazamos headers do upstream para
  // evitar surpresas (ex.: Set-Cookie de algum proxy intermediário).
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
