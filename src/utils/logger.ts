// src/utils/logger.ts
/**
 * @file Utilitário de logging para a aplicação CargoDeck-PRO.
 * Permite registrar mensagens com diferentes níveis de severidade.
 * Em um ambiente de produção, pode ser integrado com serviços de logging externos (e.g., Sentry, LogRocket).
 */
interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, any>;
    error?: Error;
}

// Nível mínimo de log para exibição no console
const MIN_LOG_LEVEL: LogLevel = import.meta.env.PROD ? 'warn' : 'debug';

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

    private formatMessage(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
        return {
            level,
            message,
            timestamp: new Date().toISOString(),
            context,
            error: error ? { name: error.name, message: error.message, stack: error.stack } as Error : undefined,
        };
    }

    public debug(message: string, context?: Record<string, any>): void {
        if (this.shouldLog('debug')) {
            const entry = this.formatMessage('debug', message, context);
            console.debug(`[DEBUG] ${entry.timestamp} - ${entry.message}`, entry.context);
        }
    }

    public info(message: string, context?: Record<string, any>): void {
        if (this.shouldLog('info')) {
            const entry = this.formatMessage('info', message, context);
            console.info(`[INFO] ${entry.timestamp} - ${entry.message}`, entry.context);
        }
    }

    public warn(message: string, context?: Record<string, any>): void {
        if (this.shouldLog('warn')) {
            const entry = this.formatMessage('warn', message, context);
            console.warn(`[WARN] ${entry.timestamp} - ${entry.message}`, entry.context);
        }
    }

    public error(message: string, error?: Error, context?: Record<string, any>): void {
        if (this.shouldLog('error')) {
            const entry = this.formatMessage('error', message, context, error);
            console.error(`[ERROR] ${entry.timestamp} - ${entry.message}`, entry.error, entry.context);
            // TODO: Em produção, enviar para um serviço de monitoramento de erros (e.g., Sentry)
        }
    }
}

export const logger = new Logger();