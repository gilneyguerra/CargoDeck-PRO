/**
 * @file Indexação leve dos documentos do projeto (docs/ + LESSONS_LEARNED.md)
 * para alimentar o assistente FAQ. Tudo é resolvido em build-time pelo Vite,
 * então não há fetch em runtime — apenas um lookup em memória.
 */

// Vite injeta os arquivos como strings via glob com `?raw`.
// Os paths começam com '/' e referenciam a raiz do repo.
const RAW_DOCS = import.meta.glob('/docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const RAW_LESSONS = import.meta.glob('/LESSONS_LEARNED.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface DocEntry {
  /** Caminho relativo ao repo (ex.: '/docs/MODULO MODAL DE TRANSPORTE.md'). */
  path: string;
  /** Primeiro `# ...` do arquivo, ou nome do arquivo se ausente. */
  title: string;
  /** `## ...` e `### ...` do arquivo, até 20 itens. */
  headings: string[];
  /** Conteúdo completo do markdown (raw). */
  content: string;
}

// Combining diacritical marks: U+0300 a U+036F. Usar escape explícito evita
// surpresas com encoding do arquivo-fonte.
const DIACRITIC_REGEX = /[̀-ͯ]/g;

function deburr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(DIACRITIC_REGEX, '');
}

function parseTitle(path: string, md: string): string {
  const match = md.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.md$/i, '').replace(/[-_]+/g, ' ');
}

function parseHeadings(md: string): string[] {
  return md
    .split('\n')
    .filter((l) => /^#{2,3}\s+/.test(l))
    .map((l) => l.replace(/^#+\s+/, '').trim())
    .slice(0, 20);
}

const ALL_DOCS: DocEntry[] = Object.entries({ ...RAW_DOCS, ...RAW_LESSONS }).map(
  ([path, content]) => ({
    path,
    title: parseTitle(path, content),
    headings: parseHeadings(content),
    content,
  })
);

/**
 * Lista todos os documentos com título e tópicos — um "table of contents"
 * compacto que cabe num único prompt do LLM.
 */
export function getDocCatalog(): string {
  if (ALL_DOCS.length === 0) {
    return '(Nenhum documento indexado.)';
  }
  return ALL_DOCS.map((d) => {
    const topics = d.headings.length > 0 ? d.headings.join(' • ') : '(sem subtítulos)';
    return `### ${d.title}\n  • Path: ${d.path}\n  • Tópicos: ${topics}`;
  }).join('\n\n');
}

/**
 * Busca por relevância simples: tokeniza a query (≥3 chars) e pontua cada doc
 * pela quantidade de tokens distintos presentes em (título + headings + corpo).
 * Retorna até `limit` docs ordenados por score decrescente.
 */
export function searchDocs(query: string, limit = 3): DocEntry[] {
  const tokens = Array.from(
    new Set(
      deburr(query)
        .split(/[\s,;:!?()/\\.\[\]{}"']+/)
        .filter((t) => t.length >= 3)
    )
  );
  if (tokens.length === 0) return [];

  const scored = ALL_DOCS.map((d) => {
    const haystack = deburr(d.title + ' ' + d.headings.join(' ') + ' ' + d.content);
    const score = tokens.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
    return { entry: d, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

/**
 * Retorna apenas o título e o caminho dos docs — útil para listar fontes
 * ao usuário.
 */
export function listDocSources(): Array<{ path: string; title: string }> {
  return ALL_DOCS.map((d) => ({ path: d.path, title: d.title }));
}

/**
 * Recorta um trecho do corpo do documento ao redor da primeira ocorrência
 * de qualquer dos tokens. Limitado a `maxChars` para caber no prompt.
 */
export function excerptDoc(entry: DocEntry, query: string, maxChars = 1500): string {
  const tokens = deburr(query)
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  const lower = deburr(entry.content);
  let firstHit = -1;
  for (const t of tokens) {
    const idx = lower.indexOf(t);
    if (idx >= 0 && (firstHit < 0 || idx < firstHit)) firstHit = idx;
  }
  if (firstHit < 0) {
    return entry.content.slice(0, maxChars);
  }
  const start = Math.max(0, firstHit - 200);
  const end = Math.min(entry.content.length, start + maxChars);
  const head = start > 0 ? '… ' : '';
  const tail = end < entry.content.length ? ' …' : '';
  return head + entry.content.slice(start, end) + tail;
}
