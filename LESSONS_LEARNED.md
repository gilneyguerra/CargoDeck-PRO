# LIÇÕES APRENDIDAS - CARGODECK-PRO

Este documento registra erros técnicos recorrentes e suas soluções para evitar regressões e falhas de build.

## 1. Tipagem Dinâmica de Loggers (TypeScript)
- **Problema**: Erro `TS2345: Argument of type 'Error' is not assignable to Record<string, unknown>`.
- **Causa**: O `logger.warn` (e outros níveis) espera um objeto de contexto (`Record`) e instâncias de `Error` em JS/TS não possuem uma assinatura de índice compatível.
- **Solução**: Sempre envolva o erro em um objeto: `{ error: err.message }` ou use o campo específico `error` se o método suportar.
- **Contexto**: Ocorrido durante a implementação do motor OCR AVA em `pdfExtractor.ts`.

## 2. Dependências em Ambiente Vercel
- **Problema**: Comandos `npm` falhando em scripts de validação remota sem ambiente node completo.
- **Solução**: Validar localmente com `tsc` antes do push para garantir "Zero Build Failure".

## 3. OCR e Processamento de Imagem
- **Problema**: Alto consumo de memória ao reinicializar Workers Tesseract.
- **Solução**: Manter instâncias de Worker (Singleton) e inicializar dinamicamente apenas quando necessário para PDFs escaneados.

## 5. Refs e Imports Órfãos (Regressão de Build)
- **Problema**: Erro `TS6133: 'Variable' is declared but its value is never read`.
- **Causa**: Remoção de elementos da UI sem a limpeza correspondente dos objetos importados (ex: Lucide Icons após troca por imagens).
- **Solução**: Sempre executar um "Cleanup" de imports após refatorar componentes JSX.
- **Contexto**: Ocorrido durante a substituição da logo do Header por imagem em `Header.tsx`.
