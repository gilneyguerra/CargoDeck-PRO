/**
 * @file Serviço de segurança para sanitização e validação de dados.
 */

export class SecurityService {
  /**
   * Sanitiza uma string removendo potenciais tags HTML para prevenir XSS simples.
   * Nota: React já escapa strings por padrão, mas esta é uma camada extra de defesa.
   */
  static sanitizeString(str: string): string {
    if (!str) return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Sanitiza um objeto recursivamente.
   */
  static sanitizeObject<T>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' ? (this.sanitizeString(obj) as any) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as any;
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = this.sanitizeObject((obj as any)[key]);
      }
    }
    return sanitized;
  }
}
