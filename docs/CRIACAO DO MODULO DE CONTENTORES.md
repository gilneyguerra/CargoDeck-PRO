PLANO DE IMPLEMENTAÇÃO: MIGRAÇÃO DA CRIAÇÃO DE CONTENTORES
Otimização de UX e Desacoplamento de Interface da Sidebar para Página Dedicada
29 de abril de 2026

1. RESUMO EXECUTIVO
Este documento detalha a estratégia técnica e operacional para a migração da funcionalidade de criação de contentores do CargoDeck-PRO. Atualmente, a lógica de criação reside em um componente colapsável na sidebar, o que limita a escalabilidade da interface e prejudica a experiência do usuário (UX) em dispositivos com telas menores ou durante operações complexas de entrada de dados.
O objetivo central é transpor essa funcionalidade para uma página dedicada (ContainerCreationPage), permitindo um fluxo de trabalho mais focado, validações robustas e uma visualização clara dos itens não alocados antes da distribuição no plano de estivagem. Os benefícios esperados incluem um aumento na velocidade de processamento de carga, redução de erros de input e uma interface principal (Main Deck View) mais limpa e funcional.
2. VISÃO GERAL TÉCNICA
A arquitetura do CargoDeck-PRO utiliza React 18 com TypeScript para tipagem estrita, garantindo a integridade dos dados de carga. O gerenciamento de estado é centralizado no Zustand, o que facilita a comunicação entre a nova página de criação e o plano de estivagem sem a necessidade de prop drilling.
2.1. Componentes Impactados
●	Sidebar.tsx: Remoção dos formulários de input e lógica de estado local de criação.
●	App.tsx / Router: Configuração de novas rotas protegidas.
●	ContainerCreationPage.tsx: Novo componente de página inteira com formulários complexos.
●	CargoStore.ts: Expansão das actions para suportar persistência temporária de rascunhos.
3. PLANO PASSO A PASSO
Passo 1: Análise e Setup Inicial
Auditoria completa do componente Sidebar atual para identificar todas as dependências de estado e funções de callback que precisam ser movidas ou globalizadas via Zustand.
Passo 2: Expandir Zustand Stores
Atualizar o useCargoStore para incluir um array de unallocatedContainers e métodos para addContainer, removeContainer e updateContainer.
Passo 3: Criar tipos TypeScript
Definição rigorosa das interfaces para Container, Dimensions e WeightMetrics, garantindo que os cálculos de centro de gravidade e ocupação de área sejam precisos.
Passo 4: Implementar ContainerCreationPage
Desenvolvimento da interface utilizando Tailwind CSS, focando em um layout de duas colunas: formulário à esquerda e preview em tempo real à direita.
Passo 5: Atualizar Sidebar
Substituição do formulário por um botão de ação rápida "Novo Contentor" que redireciona o usuário para a nova rota, mantendo apenas a lista de itens já criados para drag-and-drop.
Passo 6: Configurar Roteamento
Implementação do React Router DOM para gerenciar a navegação entre /dashboard, /create-container e /stowage-plan.
Passo 7: Validações e Erros
Integração de validações de esquema (Zod) para impedir a criação de contentores com pesos negativos ou dimensões que excedam os limites físicos das baias.
Passo 8: Persistência de Dados
Configuração do middleware de persistência do Zustand para salvar o estado no localStorage ou sincronizar com o Supabase, evitando perda de dados em caso de refresh.
Passo 9: Testes e Responsividade
Garantir que o formulário seja utilizável em tablets (comum em operações de convés) e que o feedback visual de erro seja claro.
Passo 10: Deploy e Verificação
Execução do build de produção e monitoramento de logs no Vercel para assegurar Zero Build Failures.
4. CÓDIGO-CHAVE
4.1. Estrutura de Tipos (types/cargo.ts)
export interface Container {   id: string;<br/>   name: string;<br/>   length: number; // em metros<br/>   width: number;<br/>   weight: number; // em toneladas<br/>   isAllocated: boolean;<br/>   location?: string; }
4.2. Zustand Store (store/useContainerStore.ts)
import { create } from 'zustand'; import { persist } from 'zustand/middleware';  interface ContainerState {   unallocatedContainers: Container[];<br/>   addContainer: (container: Container) => void;<br/>   clearList: () => void; }  export const useContainerStore = create<ContainerState>()(   persist(     (set) => ({       unallocatedContainers: [],<br/>       addContainer: (container) => set((state) => ({<br/>         unallocatedContainers: [...state.unallocatedContainers, container]       })),       clearList: () => set({ unallocatedContainers: [] }),     }),     { name: 'cargo-deck-storage' }   ) );
5. FLUXO DE USUÁRIO
O fluxo foi desenhado para minimizar a carga cognitiva do operador:
1.	Entrada: O usuário clica em "Adicionar Carga" na Sidebar.
2.	Criação: É redirecionado para a página de criação onde insere Nome, Tipo, Dimensões e Peso.
3.	Cálculo: O sistema calcula automaticamente a área ocupada: $$Area = L \times W$$.
4.	Confirmação: Ao salvar, o item aparece na lista de "Não Alocados".
5.	Alocação: O usuário retorna ao plano de estivagem e arrasta o item para a baia desejada (ex: Convés Principal).
6. CHECKLIST DE IMPLEMENTAÇÃO
●	 Zustand stores expandidas e testadas (Unit Tests)
●	 Tipos TypeScript completos e exportados
●	 ContainerCreationPage funcional com Tailwind
●	 Sidebar atualizada (remoção de lógica legada)
●	 Roteamento configurado em App.tsx
●	 Validações de formulário (Zod/React Hook Form)
●	 Persistência localStorage ativa
●	 Testes de responsividade (Mobile/Desktop)
●	 Deploy Vercel com sucesso
●	 Documentação técnica atualizada no README
7. CONSIDERAÇÕES DE DESIGN (TAILWIND)
A interface deve seguir o tema Dark Industrial do CargoDeck-PRO:
●	Cores: Fundo em bg-zinc-950, cards em bg-zinc-900 com bordas border-zinc-800.
●	Tipografia: Inter para legibilidade, com pesos variados para hierarquia.
●	Feedback: Uso de text-amber-500 para avisos de capacidade e text-emerald-500 para sucesso.
●	Acessibilidade: Contraste mínimo de 4.5:1 e suporte total a navegação por teclado (Tab index).
8. TROUBLESHOOTING
Problema: Dessincronização entre a lista de não alocados e o plano de estivagem após refresh.
Solução: Implementar o middleware persist do Zustand com uma estratégia de rehydrate manual para garantir que o estado do Supabase prevaleça sobre o local em caso de conflito.
Problema: Performance lenta ao renderizar muitos contentores na página de criação.
Solução: Utilizar React.memo nos itens da lista e virtualização (ex: react-window) se a lista exceder 100 itens simultâneos.
