MODULO MODAL DE TRANSPORTE
Atue como um Engenheiro Full Stack Sênior para implementar a migração do módulo de cargas não alocadas para uma página dedicada de Grid. Siga rigorosamente os 5 requisitos abaixo:
REQUISITO 1: Mudança de Título e Roteamento
Renomeie o módulo de "Cargas Não Alocadas" para Módulo de Geração Modal de Transporte.
Crie a rota /geracao-modal e adicione um link de navegação proeminente no menu principal.
Remova a lista de cargas da sidebar, mantendo nela apenas o resumo estatístico.
REQUISITO 2: Filtros com Abas e Busca
Implemente um sistema de Abas de Filtragem no topo do Grid: "Todas", "Cargas Soltas", "Contentores/Módulos", "Prioridade Máxima".
Adicione um Input de Busca Global que filtre por ID da Carga, Descrição ou Manifesto em tempo real.
REQUISITO 3: Seleção Múltipla e Ações em Lote
Cada card de carga física no Grid deve possuir um Checkbox de Seleção.
Ao selecionar um ou mais itens, exiba uma Floating Action Bar com as opções: "Mover para Convés", "Agrupar em Contentor" e "Alterar Prioridade".
REQUISITO 4: Deleção de Cargas e Limpeza de Grid
Implemente a funcionalidade de Exclusão Permanente para cargas selecionadas.
Adicione um botão "Limpar Cargas Processadas" para remover do grid itens que já foram alocados em planos de carga anteriores.
REQUISITO 5: FAQ com IA Integrada
Implemente um componente de Assistente de Carga (IA) no canto inferior da página.
Utilize o llmRouter.ts existente para responder dúvidas sobre: "Como otimizar o espaço deste lote?", "Quais cargas exigem peação especial?" ou "Sugestão de agrupamento por peso".
3. Arquivos a Serem Criados e Modificados
src/pages/ModalGenerationPage.tsx: Página principal contendo o Grid de cargas e a lógica de layout.
src/components/cargo/CargoGridCard.tsx: Componente visual da carga física, mantendo a proporção e estilo industrial.
src/components/cargo/GridToolbar.tsx: Barra superior com filtros, busca e botões de extração (Excel/Manual).
src/components/cargo/SelectionActionBar.tsx: Barra flutuante para ações em lote (mover/deletar).
src/store/useModalStore.ts: Novo store Zustand para gerenciar o estado de seleção e filtros do grid.
src/hooks/useCargoActions.ts: Hook para centralizar a lógica de movimentação entre Grid e Conveses.
src/components/ai/CargoAssistant.tsx: Interface de chat integrada ao router de LLM para suporte ao usuário.
src/styles/grid-industrial.css: Definições de CSS para o layout de grid responsivo com tema dark.
4. Checklist de Implementação (30+ Checkpoints)Fase 1: Estrutura e Rotas
 Criar arquivo ModalGenerationPage.tsx.
 Configurar rota no App.tsx.
 Atualizar Navbar.tsx com o novo nome do módulo.
 Garantir que a página herde o layout Dark Industrial.
Fase 2: Componentes de UI
 Implementar Grid responsivo (CSS Grid/Flexbox).
 Criar CargoGridCard com suporte a checkbox.
 Adicionar estados de Hover e Focus nos cards.
 Implementar Skeleton Loaders para carregamento de grandes lotes.
 Criar abas de filtro (Tabs) usando Headless UI ou Radix.
 Implementar barra de busca com debounce de 300ms.
Fase 3: Gerenciamento de Estado (Zustand)
 Criar selectedCargoIds no store.
 Implementar função toggleSelection(id).
 Implementar função selectAll().
 Sincronizar estado do Grid com o useCargoStore global.
 Persistir filtros básicos no localStorage.
Fase 4: Lógica de Negócio e Ações
 Implementar botão de Extração Excel dentro da nova página.
 Criar modal de Criação Manual de carga.
 Implementar lógica de Deleção em Lote com confirmação.
 Criar fluxo de "Mover para Convés" (abrir modal de escolha de baia/bordo).
 Validar peso total na seleção múltipla.
Fase 5: Integração com IA
 Conectar CargoAssistant ao llmRouter.ts.
 Enviar contexto das cargas selecionadas para a LLM.
 Formatar respostas da IA em Markdown.
 Adicionar sugestões de perguntas rápidas (Quick Actions).
Fase 6: Finalização e QA
 Testar performance com 500+ itens no grid.
 Validar responsividade em monitores Ultrawide e Tablets.
 Verificar se não há memory leaks na seleção múltipla.
 Garantir "Zero Build Failures" no log do Vercel.
5. Exemplos de Código (TypeScript/React)5.1. Estrutura do Store de SeleçãoUtilize o padrão abaixo para gerenciar a seleção múltipla de forma performática:
```typescript
interface ModalStore {
  selectedIds: string[];
  filterTab: 'all' | 'loose' | 'containers';
  searchQuery: string;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setFilter: (tab: ModalStore['filterTab']) => void;
}export const useModalStore = create((set) => ({
selectedIds: [],
filterTab: 'all',
searchQuery: '',
toggleSelect: (id) => set((state) => ({
selectedIds: state.selectedIds.includes(id)
? state.selectedIds.filter(i => i !== id)
: [...state.selectedIds, id]
})),
clearSelection: () => set({ selectedIds: [] }),
setFilter: (tab) => set({ filterTab: tab }),
}));
#### 5.2. Componente de Grid (Layout Base)
```tsx
const CargoGrid = () => {
  const { cargoItems } = useCargoStore();
  const { filterTab, searchQuery } = useModalStore();

  const filteredItems = cargoItems.filter(item => {
    const matchesTab = filterTab === 'all' || item.type === filterTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch && !item.isAllocated;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-6">
      {filteredItems.map(item => (
        <CargoGridCard key={item.id} item={item} />
      ))}
    </div>
  );
};
6. Integração com Código ExistenteA integração deve respeitar o fluxo de dados atual do Supabase. Ao mover uma carga do Grid para um convés, o campo stowage_location deve ser atualizado via RPC ou Update direto na tabela cargo_items. O Módulo de Geração Modal deve escutar as mudanças em tempo real (Realtime Subscriptions) para remover automaticamente itens que outros usuários possam ter alocado simultaneamente.
7. Validações e Business Rules
Regra de Unicidade: Não permitir a criação manual de cargas com IDs de manifesto já existentes no Grid.
Limite de Peso: Ao agrupar cargas em um contentor, o sistema deve validar se a soma dos pesos não excede a Capacidade de Carga (Payload) do módulo de transporte escolhido.
Status de Alocação: Apenas cargas com status unallocated podem aparecer neste Grid.
Prioridade: Cargas marcadas como "Urgente" no Excel devem ser renderizadas com uma borda pulsante em #B71C1C.
8. FAQ Development Guide (IA Integration)O assistente de IA deve ser alimentado com o Schema das Cargas atuais. Ao interagir com o llmRouter.ts, envie um prompt de sistema que defina a IA como um Especialista em Logística Offshore. Ela deve ser capaz de calcular centros de gravidade básicos e sugerir a ordem de embarque baseada no roteiro (LIFO/FIFO).
9. Deployment e Testes
Build Check: Execute npm run build localmente para garantir que as novas tipagens de Grid não quebrem o compilador.
Vercel Preview: Utilize as branchs de preview para validar o comportamento do Grid em ambiente de staging.
Teste de Stress: Simule a importação de um Excel com 1.000 linhas e verifique o tempo de renderização do Grid.
