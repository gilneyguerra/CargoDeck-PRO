# 🛡️ CargoDeck-PRO: Protocolo de Build & Deploy (Vercel Zero-Failure)

Este documento é de leitura OBRIGATÓRIA para a IA antes de qualquer `git push`. Ele serve como memória persistente para evitar desperdício de deploys no Vercel (limite de usuários free).

## 🚨 Regras de Ouro
1. **Sync de Tipos (TS2322):** Nunca use strings ad-hoc para campos de formulário (ex: Geometria de Carga, Categorias) sem validar se os tipos literais existem exatamente iguais em `src/domain/Cargo.ts`.
2. **Strict Clean-up (TS6133):** Remover TODOS os imports de ícones, componentes ou tipos não utilizados. O Vercel trata avisos como erros fatais no build.
3. **Numeric Safety (TS2345):** Todo valor proveniente de `e.target.value` em inputs numéricos deve ser convertido explicitamente via `parseFloat` ou `Number()` antes de atualizar o estado (useState) ou a Store.
4. **Integridade de Sintaxe:** Após edições via `write_to_file` ou `replace_file_content`, realizar uma leitura rápida (`view_file`) para garantir que as tags JSX estão fechadas corretamente e não há blocos duplicados.

## 📋 Checklist Pré-Commit / Pré-Push
- [ ] **Domain Check:** Os tipos injetados batem com `src/domain/Cargo.ts`?
- [ ] **Linter Check:** Existem variáveis declaradas e não usadas (especialmente no `Header.tsx`)?
- [ ] **Input Check:** O `ManualCargoModal` está fazendo o parse correto de números?
- [ ] **Refactor Check:** O arquivo `DraggableCargo.tsx` possui o número esperado de fechamentos de tags?

---
*Assinado: Antigravity AI Code Companion*
