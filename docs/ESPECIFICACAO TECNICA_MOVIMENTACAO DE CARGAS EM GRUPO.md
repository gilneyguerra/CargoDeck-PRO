ESPECIFICAÇÃO TÉCNICA: MOVIMENTAÇÃO DE CARGAS EM GRUPO
Prompt Code-Oriented para Implementação de Alocação em Massa e Validação de Estabilidade
28 de abril de 2026

1. BRIEFING EXECUTIVO
Este documento detalha a implementação da funcionalidade de Movimentação em Grupo no ecossistema CargoDeck Plan. O objetivo principal é permitir que operadores realizem a transposição de múltiplas unidades de carga simultaneamente entre diferentes áreas (abas), baias e bordos, otimizando o tempo de planejamento em até 80%. A feature introduz uma camada crítica de Validação de Estabilidade, garantindo que a distribuição de peso entre Bombordo e Boreste permaneça dentro dos limites operacionais de segurança.
2. FLUXO DE USUÁRIO DETALHADO
●	Passo 1: Ativação: O usuário clica no botão flutuante ou item de menu "Movimentar Cargas em Grupo".
●	Passo 2: Interface de Seleção: Abertura de um modal em tela cheia contendo o inventário completo de cargas disponíveis no manifesto atual.
●	Passo 3: Seleção: O usuário marca as cargas desejadas via checkboxes individuais ou utiliza a função "Selecionar Todos".
●	Passo 4: Configuração de Destino: Interface secundária para definir a Aba (Deck), Baia (Bay) e o Bordo (Side) de destino.
●	Passo 5: Validação: O sistema calcula em tempo real o impacto no centro de gravidade e estabilidade transversal.
●	Passo 6: Execução: Confirmação da movimentação, atualização do banco de dados e refresh instantâneo da visualização gráfica do deck.
3. ARQUITETURA TÉCNICA
●	Componentes React: GroupMoveModal, CargoSelectionGrid, AllocationForm, StabilityIndicator.
●	Estado Global: Utilizar Context API (CargoMovementContext) para gerenciar o array selectedCargoIds e os metadados de destino.
●	Hooks Customizados: useStabilityCalculation para lógica matemática e useCargoMovement para chamadas de API.
●	Estilização: Tailwind CSS para layout responsivo e Framer Motion para transições de modal e feedbacks de validação.
4. ESPECIFICAÇÕES DO COMPONENTE - MODAL DE SELEÇÃO
●	Container: Width 95vw, Height 90vh, Background White, Rounded-lg, Shadow-2xl.
●	Header: Título "Seleção de Cargas para Movimentação" com contador dinâmico (ex: 5 cargas selecionadas).
●	Grid de Cargas: Layout de 3 colunas (desktop), 1 coluna (mobile). Gap de 1rem.
●	Card de Carga:Borda: Emerald-500 se selecionado, Gray-200 se não selecionado.
●	Conteúdo: Código Identificador (Bold), Descrição Curta, Dimensões (CxLxA), Peso (TON), Destino Atual.
●	Checkbox: Posicionado no canto superior direito do card, tamanho 20x20px.
●	Ações: Footer fixo com botões "Selecionar Todos", "Limpar", "Cancelar" (Gray-500) e "Próximo" (Navy-700).
5. ESPECIFICAÇÕES DO COMPONENTE - MODAL DE ALOCAÇÃO
●	Seletor de Aba: Dropdown estilizado listando as áreas disponíveis (ex: Convés Principal, Mezanino, Porão).
●	Seletor de Baia: Grid visual simplificado ou Select numérico (1 a 40).
●	Seletor de Bordo: Toggle Switch ou Radio Buttons grandes para BOMBORDO e BORESTE.
●	Painel de Resumo: Card lateral exibindo: Quantidade total de itens.
●	Peso total acumulado da seleção.
●	Indicador visual de estabilidade (Balança Dinâmica).
6. ALGORITMO DE VALIDAÇÃO DE ESTABILIDADE
A validação deve seguir o cálculo de equilíbrio transversal. O peso total selecionado é somado ao peso já existente no bordo de destino para verificar o desequilíbrio.
●	Cálculo de Peso Total: $$P_{total} = \sum_{i=1}^{n} P_i$$
●	Diferença entre Bordos: $$Diff = |P_{bombordo} - P_{boreste}|$$
●	Percentual de Desequilíbrio: $$Desq% = \left( \frac{Diff}{P_{bombordo} + P_{boreste}} \right) \times 100$$
●	Regras de Alerta:Verde (OK): $$Desq% \leq 5%$$
●	Amarelo (Atenção): $$5% < Desq% \leq 10%$$
●	Vermelho (Bloqueado): $$Desq% > 10%$$
7. ESTRUTURA DE DADOS JSON
Schema de Carga:
{   "id": "uuid-v4",<br/>   "codigo": "ABC-1234",<br/>   "descricao": "Container 20ft Dry",<br/>   "dimensoes": {"c": 6.05, "l": 2.43, "a": 2.59},<br/>   "peso_kg": 24000,<br/>   "peso_ton": 24.0,<br/>   "destino": "NS44",<br/>   "origem": "PACU",<br/>   "posicao_atual": {"aba": "Main Deck", "baia": 12, "bordo": "Boreste"} }
Schema de Payload para Movimentação:
{   "cargas_ids": ["id1", "id2", "id3"],<br/>   "nova_alocacao": {<br/>     "aba": "Upper Deck",<br/>     "baia": 15,<br/>     "bordo": "Bombordo"   } }
8. LÓGICA DE BACKEND NECESSÁRIA
●	Endpoint GET /api/cargas: Retorna a lista completa de cargas com status de alocação.
●	Endpoint POST /api/cargas/mover-grupo: Recebe o array de IDs e o objeto de destino.
●	Executa transação atômica no banco de dados.
●	Verifica se a baia de destino possui "slots" suficientes (capacidade volumétrica).
●	Retorna status 200 (Sucesso) ou 400 (Erro de Estabilidade/Espaço).
9. ESPECIFICAÇÕES DE UX/DESIGN
●	Cores: Navy (#1A237E), Emerald (#2E7D32), Red (#C62828), Amber (#FF8F00).
●	Animações: Utilizar AnimatePresence do Framer Motion para entrada do modal (initial: { opacity: 0, y: 20 }).
●	Estados:Hover: Card de carga deve ter leve elevação (shadow-md).
●	Disabled: Botão "Confirmar" desabilitado se a estabilidade estiver em nível Vermelho.
●	Ícones: CheckCircle (sucesso), AlertTriangle (aviso), Scale (estabilidade), ArrowRight (fluxo).
10. CÓDIGO BASE ESTRUTURADO
Hook de Estabilidade (useStability.js):
import { useState, useEffect } from 'react';  export const useStability = (selectedCargas, currentDeckData, targetBordo) => {   const [status, setStatus] = useState('OK');   const [diffPercent, setDiffPercent] = useState(0);    useEffect(() => {     const pesoSelecionado = selectedCargas.reduce((acc, c) => acc + c.peso_ton, 0);     const pesoBombordo = currentDeckData.pesoBombordo + (targetBordo === 'BOMBORDO' ? pesoSelecionado : 0);<br/>     const pesoBoreste = currentDeckData.pesoBoreste + (targetBordo === 'BORESTE' ? pesoSelecionado : 0);          const total = pesoBombordo + pesoBoreste;     const diff = Math.abs(pesoBombordo - pesoBoreste);     const percent = total > 0 ? (diff / total) * 100 : 0;      setDiffPercent(percent);     if (percent <= 5) setStatus('OK');     else if (percent <= 10) setStatus('WARNING');     else setStatus('CRITICAL');   }, [selectedCargas, currentDeckData, targetBordo]);    return { status, diffPercent }; };
11. INTEGRAÇÃO COM VISUALIZAÇÃO DO DECK
●	Refresh: Após o sucesso da API, disparar um evento global para forçar o re-render do componente DeckGrid.
●	Badges: Adicionar um badge temporário "Movido" nas cargas que acabaram de ser alocadas.
●	Sincronização: Garantir que a cor da carga no deck reflita o seu destino (ex: NS44 = Azul, NS32 = Verde).
12. VALIDAÇÕES E TRATAMENTO DE ERROS
●	Seleção Vazia: Bloquear avanço para a tela de alocação se selectedCargoIds.length === 0.
●	Capacidade da Baia: O backend deve retornar erro se a soma das áreas das cargas selecionadas exceder a área disponível na baia destino.
●	Mensagens: Exibir Toasts amigáveis: "Erro: A baia 15 não possui espaço suficiente para estas 5 cargas."
13. TESTES RECOMENDADOS
●	Unitário: Validar a função de cálculo de estabilidade com diferentes pesos.
●	Integração: Simular o fluxo completo de seleção de 10 cargas e movimentação para uma nova aba.
●	UI: Verificar se o modal se ajusta corretamente em telas de tablets (iPad Air/Pro).
●	Stress: Selecionar 100+ cargas simultaneamente e verificar a performance do grid.
14. CHECKLIST DE IMPLEMENTAÇÃO
●	 Criar Context API para estado de movimentação.
●	 Implementar Grid de Seleção com filtros por Origem/Destino.
●	 Desenvolver Card de Carga com checkbox controlado.
●	 Implementar lógica de "Selecionar Todos".
●	 Criar Modal de Alocação com seletores de Aba/Baia/Bordo.
●	 Integrar Hook de Estabilidade com feedback visual (Cores).
●	 Criar componente de Balança Visual para o desequilíbrio.
●	 Configurar chamadas de API (Axios/Fetch) com tratamento de erro.
●	 Adicionar animações de transição entre passos do modal.
●	 Validar responsividade do grid de seleção.
●	 Implementar busca textual dentro do modal de seleção.
●	 Garantir que pesos sejam exibidos com 2 casas decimais.
●	 Adicionar confirmação secundária para movimentações críticas (> 50 TON).
●	 Verificar contraste de cores (WCAG AA).
●	 Implementar Skeleton Loaders para carregamento da lista de cargas.
●	 Adicionar logs de debug para monitorar o payload enviado.
●	 Testar comportamento de "Cancelar" em qualquer etapa.
●	 Validar se cargas já alocadas podem ser re-selecionadas.
●	 Garantir que o Z-index do modal sobreponha o Header.
●	 Realizar deploy em ambiente de Staging para homologação.
