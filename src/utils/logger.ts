// src/utils/logger.ts
/**
 * @file Utilitario de logging para a aplicacao CargoDeck-PRO.
 * Permite registrar mensagens com diferentes niveis de severidade.
 * Em um ambiente de producao, pode ser integrado com servicos de logging externos (e.g., Sentry, LogRocket).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
    error?: Error;
}

// Nivel minimo de log para exibicao no console
const MIN_LOG_LEVEL: LogLevel = 'debug';

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

class Logger {
    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[MIN_LOG_LEVEL];
    }

    private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            context,
            error: error ? { name: error.name, message: error.message, stack: error.stack } as Error : undefined,
        };
    }

    private redact(data: any): any {
        if (!data) return data;
        const SENSITIVE_KEYS = ['email', 'password', 'token', 'apiKey', 'secret'];

        
        if (Array.isArray(data)) {
            return data.map(item => this.redact(item));
        }
        
        if (typeof data === 'object') {
            const redacted: any = {};
            for (const key in data) {
                if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
                    redacted[key] = '[REDACTED]';
                } else {
                    redacted[key] = this.redact(data[key]);
                }
            }
            return redacted;
        }
        
        return data;
    }

    public debug(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('debug')) {
            const entry = this.formatMessage('debug', message, this.redact(context));
            console.debug(`[DEBUG] ${entry.timestamp} - ${entry.message}`, entry.context);
        }
    }

    public info(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('info')) {
            const entry = this.formatMessage('info', message, this.redact(context));
            console.info(`[INFO] ${entry.timestamp} - ${entry.message}`, entry.context);
        }
    }

    public warn(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('warn')) {
            const entry = this.formatMessage('warn', message, this.redact(context));
            console.warn(`[WARN] ${entry.timestamp} - ${entry.message}`, entry.context);
        }
    }

    public error(message: string, error?: unknown, context?: Record<string, unknown>): void {
        if (this.shouldLog('error')) {
            const errorInstance = error instanceof Error ? error : undefined;
            const redactedContext = this.redact(context);
            const entry = this.formatMessage('error', message, redactedContext, errorInstance);
            if (error !== undefined && !(error instanceof Error)) {
                const extendedContext = { ...redactedContext, rawError: this.redact(error) };
                console.error(`[ERROR] ${entry.timestamp} - ${entry.message}`, entry.error, extendedContext);
            } else {
                console.error(`[ERROR] ${entry.timestamp} - ${entry.message}`, entry.error, entry.context);
            }
        }
    }

}

export const logger = new Logger();