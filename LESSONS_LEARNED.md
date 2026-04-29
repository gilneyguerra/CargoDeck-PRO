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
- **Causa**: Remoção de elementos da UI sem a limpeza correspondente dos objetos importados (ex: Lucide Icons após troca por imagens ou mudanças de layout). 
- **Solução**: Sempre executar um "Cleanup" de imports manualmente ou via lint-fix antes da sincronização. Em ambientes CI estritos, como o Vercel, *warnings* são tratados como erros fatais.
- **Protocolo**: Antes de cada push, revise exaustivamente o bloco de imports do arquivo modificado.
- **Contexto**: Ocorrido durante a implementação das Fases 1 e 2 da `LandingPage.tsx`.
## 6. Tipagem de Bibliotecas via CDN (OpenCV, Tesseract)
- **Problema**: Erro `TS2339: Property 'runtimeInitialized' does not exist on type...`.
- **Causa**: Ao substituir `any` por interfaces `declare const` manuais para satisfazer o Security Scan, omitimos propriedades cruciais de controle de carregamento da biblioteca.
- **Solução**: Ao criar interfaces parciais para bibliotecas externas, sempre revise as propriedades de estado/inicialização (como `runtimeInitialized` ou `ready`) para evitar quebras no fluxo de carregamento assíncrono.
- **Contexto**: Ocorrido durante a limpeza de tipos reportada pelo GitHub em `imagePreprocessor.ts`.
## 8. Props JSX Coladas Após Refatoração de Linha (TS2322 / "numericonChange")
- **Problema**: Erro `TS2322: Property 'numericonChange' does not exist` — uma prop inventada que não existe no tipo.
- **Causa**: Durante refatoração de componentes (ex: remoção de props extras de uma chamada JSX multi-linha), ao eliminar um trecho via `replace_all` contendo um espaço final, as props adjacentes ficam sem separação: `numeric onChange` → `numericonChange`. O Vercel trata isso como erro fatal, mas editores locais sem TypeScript ativo não alertam visualmente.
- **Solução**: Após qualquer `replace_all` que envolva bordas de props em JSX, verificar manualmente as linhas afetadas para garantir que espaços de separação entre props não foram suprimidos.
- **Protocolo**: Antes de commitar, grep pelo nome do arquivo e procurar props suspeitas (`grep -n "numeric\|onChange" arquivo.tsx`) ou abrir o componente e revisar visualmente cada célula de prop longa.
- **Contexto**: Ocorrido em `CargoEditorModal.tsx` ao remover `totalCols={9} totalRows={totalRows}` — o espaço que separava `numeric` de `onChange` foi removido junto.

## 9. Variável Declarada e Não Utilizada Após Remoção de Dependente (TS6133)
- **Problema**: Erro `TS6133: 'catMeta' is declared but its value is never read`.
- **Causa**: A variável foi declarada para uso visual (ex: cor de categoria na linha), mas o bloco de JSX que a consumia foi removido ou nunca implementado. Em modo estrito (`noUnusedLocals: true`), o Vercel falha o build.
- **Solução**: Ao remover um bloco JSX que consome uma variável local, remover também a declaração da variável no mesmo passo.
- **Contexto**: Ocorrido em `GridRow` do `CargoEditorModal.tsx` — `catMeta` foi declarado para uso de cor mas o elemento visual não foi gerado.

## 10. Referência de Tipo a Pacote Não Instalado via `typeof import()` (TS2307)
- **Problema**: Erro `TS2307: Cannot find module 'xlsx' or its corresponding type declarations`.
- **Causa**: Ao carregar uma biblioteca via CDN em runtime (sem `npm install`), usar `typeof import('xlsx')` como anotação de tipo faz o compilador TypeScript tentar resolver o módulo `xlsx` em tempo de compilação — e falha porque o pacote não existe em `node_modules`. A **lição 6** (tipagem de libs CDN) não cobriu este padrão porque tratava de `declare const` em arquivos `.d.ts`, não de `import()` de tipo embutido no código.
- **Solução**: Nunca usar `typeof import('pacote-não-instalado')` como tipo. Em vez disso, declarar uma **interface local mínima** que descreve apenas os métodos realmente usados do objeto CDN, e fazer cast via `(window as any).LIB as MinhaInterface`.
- **Regra geral**: Qualquer biblioteca carregada por `<script>` dinâmico ou CDN — sem entrada em `package.json` — **nunca pode ser referenciada por nome de módulo** em anotações TypeScript (`import type`, `typeof import`, `import()`). Use sempre interfaces locais ou `unknown` com cast pontual.
- **Contexto**: Ocorrido em `CargoEditorModal.tsx` ao implementar importação de Excel via SheetJS CDN — `typeof import('xlsx')` usado como tipo de variável e retorno de Promise causou falha no build do Vercel.

## 7. Imports Redundantes de React (Modern JSX)
- **Problema**: Erro `TS6133: 'React' is declared but its value is never read`.
- **Causa**: Em projetos com React 17+, o compilador não exige o import global do `React` para processar JSX. Mantê-lo no topo do arquivo sem chamadas explícitas (como `React.useState`) gera um alerta de variável não utilizada.
- **Solução**: Remova o `import React from 'react'` e utilize apenas os hooks necessários (`import { useState } from 'react'`). 
- **Contexto**: Ocorrido durante o deploy da `LandingPage.tsx` no Vercel.
