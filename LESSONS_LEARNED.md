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

## 11. `Uint8Array<ArrayBufferLike>` Incompatível com APIs de Browser (TS2345)
- **Problema**: Erro `TS2345: Type 'Uint8Array<ArrayBufferLike>' is not assignable to 'ArrayBufferView<ArrayBuffer>'`. O TypeScript strict distingue `ArrayBuffer` de `SharedArrayBuffer` — `ArrayBufferLike` é a união dos dois, mas APIs como `DecompressionStream.writer.write()` exigem especificamente `ArrayBuffer`.
- **Causa**: Declarar `compressed: Uint8Array` sem qualificar o generic produz `Uint8Array<ArrayBufferLike>`. TypeScript **não estreita o generic `<T>` de `Uint8Array<T>` via `instanceof` em `.buffer`** — logo, `const safe = arr.buffer instanceof ArrayBuffer ? arr : new Uint8Array(arr)` continua tipado como `Uint8Array<ArrayBufferLike>` nos dois branches. O compilador do Vercel rejeita.
- **Solução correta e definitiva**: Criar um `ArrayBuffer` explicitamente com `new ArrayBuffer()` e copiar os bytes. `new ArrayBuffer()` é sempre tipado como `ArrayBuffer` — nunca como `ArrayBufferLike`:
  ```typescript
  const ab = new ArrayBuffer(compressed.byteLength);
  new Uint8Array(ab).set(compressed);
  writer.write(ab); // ab: ArrayBuffer ✓
  ```
- **Armadilha a evitar**: `new Uint8Array(existingUint8Array)` ainda retorna `Uint8Array<ArrayBufferLike>`. A cópia via `new ArrayBuffer` + `.set()` é o único caminho sem casts inseguros.
- **Consultar antes de usar**: Toda vez que passar `Uint8Array` para uma Web API que declare `BufferSource` ou `ArrayBufferView<ArrayBuffer>`, aplicar este padrão.
- **Contexto**: Ocorrido em `inflateRaw()` do parser XLSX nativo em `CargoEditorModal.tsx` — primeira tentativa de fix (instanceof guard) falhou pois TypeScript não estreita generics via instanceof.

## 12. Condição Sempre Verdadeira em Cast de Interface (TS2774)
- **Problema**: Erro `TS2774: This condition will always return true since this function is always defined`.
- **Causa**: Ao fazer `const lib = value as MinhaInterface`, o TypeScript assume que `lib` é sempre `MinhaInterface` (nunca `undefined`). Portanto, `if (lib?.propriedade)` é marcado como condição sempre verdadeira — o `?.` se torna sem sentido num tipo que não é optional.
- **Solução**: Declarar a variável como `MinhaInterface | undefined` antes de verificar:
  ```typescript
  const lib = (window as any).XLSX as XlsxLib | undefined;
  if (lib && typeof lib.read === 'function') { ... }
  ```
  O `typeof x === 'function'` é mais robusto que `lib?.method` pois verifica o valor real em runtime sem acionar TS2774.
- **Contexto**: Ocorrido no loader de SheetJS via CDN em `CargoEditorModal.tsx` — `lib` castado como `XlsxLib` tornava a guarda `if (lib?.read)` sempre verdadeira para o compilador.

## 7. Imports Redundantes de React (Modern JSX)
- **Problema**: Erro `TS6133: 'React' is declared but its value is never read`.
- **Causa**: Em projetos com React 17+, o compilador não exige o import global do `React` para processar JSX. Mantê-lo no topo do arquivo sem chamadas explícitas (como `React.useState`) gera um alerta de variável não utilizada.
- **Solução**: Remova o `import React from 'react'` e utilize apenas os hooks necessários (`import { useState } from 'react'`). 
- **Contexto**: Ocorrido durante o deploy da `LandingPage.tsx` no Vercel.

## 13. Throw em Módulo de Infra-Estrutura Quebra a Árvore Inteira
- **Problema**: Tela em branco no Vercel após hardening do `src/lib/supabase.ts` que passou a fazer `throw new Error(...)` no top-level quando `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` estavam ausentes.
- **Causa**: `App.tsx` importa estaticamente `useAuthAndHydration`, que importa `cargoStore`, que importa `supabase`. Um throw na carga do módulo `supabase.ts` é executado **antes** de qualquer componente React ser instanciado — incluindo a `LandingPage` e o `ErrorBoundary`. O `ErrorBoundary` só captura erros lançados durante o **render** de componentes, não erros de **module load** (parse/exec do JS).
- **Solução**: Validar configuração crítica no **primeiro uso real** (ex.: dentro de `getSession()`, `signIn()`), não no `import`. Se for absolutamente necessário falhar cedo, usar `Proxy` para diferir a falha até a primeira chamada — mas mesmo isso pode bubbling para o `ErrorBoundary` se a chamada estiver em `useEffect`. Caminho mais seguro: fallback sensato + `console.warn` claro.
- **Regra geral**: nunca lançar exceções no top-level de um módulo de infraestrutura compartilhado (`lib/`, `services/`, `infrastructure/`). Se a env é obrigatória, falhe na primeira chamada acionável, com mensagem explicando qual env definir e onde.
- **Contexto**: Ocorrido em `src/lib/supabase.ts` durante a Fase 0 da refatoração v2.0 (commit 22a723f). Revertido em c3fc7ff com fallback de credenciais demo + warn.
