PLANO DE IMPLEMENTAÇÃO REFINADO
Migração de Cargas Não Alocadas para Interface de Grid Dedicada
29 de abril de 2026

ÍNDICE
1.	Resumo Executivo
2.	Entendimento Atual da Arquitetura
3.	Página de Cargas Não Alocadas - Visão Geral
4.	Especificação Técnica Detalhada
5.	Fluxo de Usuário Detalhado
6.	Design e Responsividade
7.	Persistência de Dados
8.	Passos de Implementação
9.	Código-Chave (Snippets)
10.	Checklist de Implementação
11.	Estrutura de Pastas Proposta
12.	Estimativa de Tempo e Glossário

1. RESUMO EXECUTIVO
Este documento detalha o plano de engenharia para a migração das funcionalidades de gerenciamento de cargas não alocadas do CargoDeck-PRO. Atualmente restritas a um sidebar comprimido, as cargas serão movidas para uma página dedicada com Grid Layout responsivo. Esta mudança visa resolver gargalos de usabilidade e preparar o sistema para operações de larga escala (mais de 100 itens simultâneos).
●	Escopo: Criação da rota /unallocated-cargo, desenvolvimento de grid interativo e sistema de alocação em lote.
●	Objetivos: Maximizar a área visual para conferência de dimensões, centralizar ferramentas de extração (PDF/Excel) e permitir alocação rápida via modal.
●	Timeline: 12 horas de desenvolvimento e testes.
●	Stack: React 18, TypeScript, Zustand (Estado), Tailwind CSS (Estilização), Supabase (Persistência).

2. ENTENDIMENTO ATUAL DA ARQUITETURA
2.1 Estrutura Existente
O sistema utiliza o cargoStore para gerenciar o estado global das cargas. Atualmente, o sidebar renderiza uma lista vertical simples. A representação visual é limitada, dificultando a percepção de escala e proporção dos itens antes da estivagem.
2.2 Componentes Afetados
●	Sidebar.tsx: Será reduzido a um menu de navegação, removendo a listagem pesada de itens.
●	App.tsx: Configuração da nova rota protegida.
●	cargoStore.ts: Expansão para suportar seleções complexas e filtros de busca otimizados.

3. PÁGINA DE CARGAS NÃO ALOCADAS - VISÃO GERAL
3.1 Localização e Roteamento
A página será acessível via rota /unallocated-cargo. O usuário poderá navegar a partir do Dashboard principal ou através de um link de destaque no novo Sidebar simplificado. Um sistema de breadcrumbs garantirá o retorno rápido ao Plano de Estivagem.
3.2 Layout Principal
O layout seguirá o padrão Dark Industrial, com um cabeçalho fixo contendo ações globais. O corpo da página será composto por um grid fluido onde cada card representa uma unidade de carga, mantendo proporções visuais baseadas em suas dimensões reais (comprimento x largura).
3.3 Funcionalidades Integradas
13.	Grid de Cargas: Visualização lado a lado com lazy loading.
14.	Ferramentas de Entrada: Botões para extração via IA (PDF/Excel) e criação manual.
15.	Ações em Lote: Seleção múltipla para alocação imediata em conveses específicos.
16.	Busca Inteligente: Filtro por metadados (ID, Categoria, Nome).

4. ESPECIFICAÇÃO TÉCNICA DETALHADA
4.1 Componentes Novos
Componente	Responsabilidade
UnallocatedCargoPage	Container principal e orquestrador de estado da página.
CargoGridLayout	Gerenciamento do grid responsivo e renderização de listas.
CargoCard	Representação visual individual com suporte a seleção e edição.
UnallocatedCargoToolbar	Ações de topo: Busca, Upload, Criação e Alocação em Lote.
AllocateCargoModal	Interface de destino para definir Convés, Baia e Bordo.
4.2 Atualizações em Stores (Zustand)
O cargoStore passará a utilizar um Set<string> para gerenciar selectedCargos, garantindo performance O(1) em operações de adição e remoção de itens selecionados.

5. FLUXO DE USUÁRIO DETALHADO
Fluxo de Alocação em Lote:
17.	O usuário acessa a página e utiliza a SearchBar para filtrar "TUBOS".
18.	Clica em "Selecionar Todos" ou marca individualmente os CargoCards.
19.	O UnallocatedCargoFooter exibe o peso total acumulado (ex: 45.5t).
20.	O usuário clica em "Movimentar Selecionadas".
21.	No AllocateCargoModal, seleciona "Convés Principal" e "Bay 04".
22.	Ao confirmar, o sistema atualiza o status no Supabase e redireciona (opcional) para o mapa de carga.

6. DESIGN E RESPONSIVIDADE (TAILWIND CSS)
6.1 Breakpoints de Grid
●	Mobile: 1 coluna (foco em lista de detalhes).
●	Tablet: 3 colunas (grid compacto).
●	Desktop: 4 a 5 colunas (visualização panorâmica).
6.2 Estética Dark Industrial
●	Superfícies: bg-slate-950 para o fundo e bg-slate-900 para cards.
●	Bordas: border-slate-700 com transição para border-blue-500 na seleção.
●	Tipografia: Inter ou Roboto Mono para dados técnicos (dimensões/pesos).

7. PERSISTÊNCIA DE DADOS
A sincronização será realizada via Supabase Realtime. Ao alocar uma carga na nova página, o campo status será alterado de unallocated para allocated, disparando a atualização automática em qualquer outra aba aberta do sistema (como o mapa de estivagem).

8. PASSOS DE IMPLEMENTAÇÃO
Fase 1: Infraestrutura (1.5h)
●	 Registro da rota /unallocated-cargo no App.tsx.
●	 Atualização da interface Cargo no arquivo de tipos.
●	 Criação do esqueleto da página com Tailwind.
Fase 2: Componentes Visuais (3h)
●	 Desenvolvimento do CargoCard com cálculo de aspectRatio.
●	 Implementação do CargoGridLayout com suporte a estados vazios.
●	 Estilização da UnallocatedCargoToolbar.
Fase 3: Lógica de Negócio (5h)
●	 Implementação dos métodos de seleção no cargoStore.
●	 Integração do filtro de busca com debounce.
●	 Desenvolvimento do AllocateCargoModal com validação de campos.
Fase 4: Integração Supabase (2h)
●	 Criação da função de atualização em lote (RPC ou múltiplas queries).
●	 Implementação de Toasts de feedback para sucesso/erro.

9. CÓDIGO-CHAVE (SNIPPETS)
9.1 Extensão do cargoStore.ts
// Adição de lógica de seleção e movimentação em lote toggleCargoSelection: (id: string) => set((state) => {   const newSelected = new Set(state.selectedCargos);   newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);<br/>   return { selectedCargos: newSelected }; }),  moveCargosToAllocated: async (cargoIds: string[], deckId: string, bayId: string, side: string) => {   const { data, error } = await supabase     .from('cargo_items')     .update({        status: 'allocated', <br/>       allocatedDeckId: deckId, <br/>       allocatedBayId: bayId, <br/>       allocatedSide: side,<br/>       updatedAt: new Date().toISOString()     })     .in('id', cargoIds);        if (!error) {     set((state) => ({       cargoItems: state.cargoItems.map(c => <br/>         cargoIds.includes(c.id) ? { ...c, status: 'allocated' } : c       ),       selectedCargos: new Set()     }));   } }
9.2 Componente CargoCard.tsx (Visual Proporcional)
export default function CargoCard({ cargo, selected }: { cargo: Cargo, selected: boolean }) {   const ratio = cargo.dimensions.length / cargo.dimensions.width;      return (     <div className={`p-4 rounded-lg border-2 transition-all ${selected ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-900'}`}>       <div className="flex justify-between mb-4">         <input type="checkbox" checked={selected} readOnly className="w-4 h-4" />         <span className="text-[10px] font-mono text-slate-500">{cargo.code}</span>       </div>              <div className="flex justify-center items-center h-24 mb-4 bg-slate-800/50 rounded">         <div            style={{ width: `${Math.min(100, 40 * ratio)}px`, height: '40px' }}           className="border-2 border-slate-500 bg-slate-700 flex items-center justify-center"         >           <span className="text-[9px] text-slate-400">{cargo.dimensions.length}m</span>         </div>       </div>              <h4 className="font-bold text-slate-200 truncate">{cargo.name}</h4>       <div className="flex justify-between mt-2">         <span className="text-xs text-slate-400">{cargo.weight}t</span>         <span className="text-xs text-green-500 font-bold">{cargo.category}</span>       </div>     </div>   ); }

10. CHECKLIST DE IMPLEMENTAÇÃO
●	Responsividade: O grid quebra corretamente em telas de 1366px (padrão offshore)?
●	Performance: A busca trava a UI com mais de 200 itens? (Usar useMemo).
●	UX: O botão "Alocar" só habilita se houver seleção?
●	Dados: O peso total no rodapé bate com a soma das cargas selecionadas?
●	Segurança: O usuário tem permissão de escrita para alterar o status da carga?

11. ESTRUTURA DE PASTAS PROPOSTA
src/ ├── pages/ │   └── UnallocatedCargoPage.tsx ├── components/ │   └── UnallocatedCargo/ │       ├── CargoCard.tsx │       ├── CargoGridLayout.tsx │       ├── UnallocatedCargoToolbar.tsx │       ├── UnallocatedCargoFooter.tsx │       └── AllocateCargoModal.tsx ├── store/ │   └── cargoStore.ts └── types/     └── cargo.ts

12. ESTIMATIVA DE TEMPO E GLOSSÁRIO
Cronograma
| 2 | UI/UX (Grid e Cards) | 3.0h | | 4 | Integração Supabase | 2.5h | | Total | | 12.0h |
Glossário Offshore
●	Backload: Carga que retorna da plataforma para terra.
●	Bay (Baia): Divisão transversal do convés da embarcação.
●	Manifesto: Documento legal que lista todas as cargas a bordo.
●	Stowage Plan: Plano visual de onde cada carga está posicionada.
