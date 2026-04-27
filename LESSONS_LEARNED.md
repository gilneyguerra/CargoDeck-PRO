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
## 6. Tipagem de Bibliotecas via CDN (OpenCV, Tesseract)
- **Problema**: Erro `TS2339: Property 'runtimeInitialized' does not exist on type...`.
- **Causa**: Ao substituir `any` por interfaces `declare const` manuais para satisfazer o Security Scan, omitimos propriedades cruciais de controle de carregamento da biblioteca.
- **Solução**: Ao criar interfaces parciais para bibliotecas externas, sempre revise as propriedades de estado/inicialização (como `runtimeInitialized` ou `ready`) para evitar quebras no fluxo de carregamento assíncrono.
- **Contexto**: Ocorrido durante a limpeza de tipos reportada pelo GitHub em `imagePreprocessor.ts`.
## 7. Imports Redundantes de React (Modern JSX)
- **Problema**: Erro `TS6133: 'React' is declared but its value is never read`.
- **Causa**: Em projetos com React 17+, o compilador não exige o import global do `React` para processar JSX. Mantê-lo no topo do arquivo sem chamadas explícitas (como `React.useState`) gera um alerta de variável não utilizada.
- **Solução**: Remova o `import React from 'react'` e utilize apenas os hooks necessários (`import { useState } from 'react'`). 
- **Contexto**: Ocorrido durante o deploy da `LandingPage.tsx` no Vercel.
