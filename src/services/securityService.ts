/**
 * @file Serviço de segurança para sanitização de inputs.
 *
 * Usa DOMPurify (battle-tested) para remover qualquer marcação HTML/JS
 * potencialmente perigosa antes de armazenar ou exibir conteúdo.
 * React já escapa por padrão; isto é defesa em profundidade contra
 * usos com `dangerouslySetInnerHTML` ou serialização para PDF/CSV.
 */
import DOMPurify from 'dompurify';

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
} as const;

export class SecurityService {
  /**
   * Remove tags HTML e atributos potencialmente executáveis, mantendo o texto.
   * Ex.: `<script>alert(1)</script>foo` → `alert(1)foo`.
   */
  static sanitizeString(str: string): string {
    if (!str) return str;
    // DOMPurify retorna string quando o input é string; cast só para satisfazer
    // a sobrecarga genérica.
    return DOMPurify.sanitize(str, PURIFY_CONFIG) as unknown as string;
  }

  /**
   * Sanitiza recursivamente strings dentro de objetos/arrays.
   * Tipos primitivos não-string são devolvidos sem alteração.
   */
  static sanitizeObject<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return this.sanitizeString(obj) as unknown as T;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as unknown as T;
    }

    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      sanitized[key] = this.sanitizeObject((obj as Record<string, unknown>)[key]);
    }
    return sanitized as T;
  }
}
