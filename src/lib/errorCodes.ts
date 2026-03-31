// src/lib/errorCodes.ts
/**
 * @file Define códigos de erro padronizados para a aplicação CargoDeck-PRO.
 * Isso garante consistência na identificação e comunicação de erros.  
 */

export const ErrorCodes = {   // Erros de PDF
    PDF_INVALID_TYPE: 'PDF_INVALID_TYPE',
    PDF_TOO_LARGE: 'PDF_TOO_LARGE',
    PDF_EMPTY: 'PDF_EMPTY',
    PDF_CORRUPTED: 'PDF_CORRUPTED',
    PDF_READ_FAILED: 'PDF_READ_FAILED',
    PDF_EXTRACTION_FAILED: 'PDF_EXTRACTION_FAILED',
    PDF_OCR_FAILED: 'PDF_OCR_FAILED',
    PDF_PARSING_FAILED: 'PDF_PARSING_FAILED',
    // Erros de Rede/API
    NETWORK_ERROR: 'NETWORK_ERROR',
    API_UNAUTHORIZED: 'API_UNAUTHORIZED',
    API_FORBIDDEN: 'API_FORBIDDEN',
    API_NOT_FOUND: 'API_NOT_FOUND',
    API_SERVER_ERROR: 'API_SERVER_ERROR',
    API_TIMEOUT: 'API_TIMEOUT',
    API_UNKNOWN_ERROR: 'API_UNKNOWN_ERROR',
    // Erros de Autenticação
    AUTH_FAILED: 'AUTH_FAILED',
    AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    // Erros de Armazenamento/Estado
    STORAGE_ERROR: 'STORAGE_ERROR',
    STATE_PERSISTENCE_FAILED: 'STATE_PERSISTENCE_FAILED',
    // Erros de UI/Componentes
    COMPONENT_RENDER_ERROR: 'COMPONENT_RENDER_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    // Erros Genéricos
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    OPERATION_CANCELLED: 'OPERATION_CANCELLED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export const ErrorMessages: Record<ErrorCode, string> = {
    [ErrorCodes.PDF_INVALID_TYPE]: 'O arquivo selecionado não é um PDF válido.',
    [ErrorCodes.PDF_TOO_LARGE]: 'O arquivo PDF excede o tamanho máximo permitido (50MB).',
    [ErrorCodes.PDF_EMPTY]: 'O arquivo PDF está vazio.',
    [ErrorCodes.PDF_CORRUPTED]: 'O arquivo PDF está corrompido ou é inválido.',
    [ErrorCodes.PDF_READ_FAILED]: 'Falha ao ler o conteúdo do arquivo PDF.',
    [ErrorCodes.PDF_EXTRACTION_FAILED]: 'Falha ao extrair texto do PDF.',
    [ErrorCodes.PDF_OCR_FAILED]: 'Falha ao realizar OCR no PDF (pode ser um PDF baseado em imagem).',
    [ErrorCodes.PDF_PARSING_FAILED]: 'Falha ao interpretar os dados do manifesto no PDF.',
    [ErrorCodes.NETWORK_ERROR]: 'Erro de conexão com a rede. Verifique sua internet.',
    [ErrorCodes.API_UNAUTHORIZED]: 'Não autorizado. Verifique suas credenciais.',
    [ErrorCodes.API_FORBIDDEN]: 'Acesso negado a este recurso.',
    [ErrorCodes.API_NOT_FOUND]: 'Recurso não encontrado.',
    [ErrorCodes.API_SERVER_ERROR]: 'Erro interno do servidor. Tente novamente mais tarde.',
    [ErrorCodes.API_TIMEOUT]: 'A requisição excedeu o tempo limite.',
    [ErrorCodes.API_UNKNOWN_ERROR]: 'Erro desconhecido na comunicação com a API.',
    [ErrorCodes.AUTH_FAILED]: 'Falha na autenticação. Usuário ou senha inválidos.',
    [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Sua sessão expirou. Faça login novamente.',
    [ErrorCodes.AUTH_REQUIRED]: 'Autenticação necessária para acessar este recurso.',
    [ErrorCodes.STORAGE_ERROR]: 'Erro ao acessar o armazenamento local.',
    [ErrorCodes.STATE_PERSISTENCE_FAILED]: 'Falha ao salvar o estado da aplicação.',
    [ErrorCodes.COMPONENT_RENDER_ERROR]: 'Ocorreu um erro na renderização de um componente.',
    [ErrorCodes.INVALID_INPUT]: 'Entrada inválida.',
    [ErrorCodes.UNKNOWN_ERROR]: 'Ocorreu um erro inesperado.',
    [ErrorCodes.OPERATION_CANCELLED]: 'A operação foi cancelada.',
};