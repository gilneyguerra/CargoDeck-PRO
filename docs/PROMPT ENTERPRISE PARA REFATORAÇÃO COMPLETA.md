PROMPT ENTERPRISE PARA REFATORAÇÃO COMPLETA CARGODECK-PRO v2.0 - CODE ORIENTED
Guia Técnico Detalhado para Claude Code - Refatoração com Zero Downtime e Máxima Estabilidade
30 de abril de 2026

1. EXECUTIVE SUMMARY
Este documento estabelece as diretrizes técnicas e o roteiro de execução para a refatoração sistêmica do CargoDeck-PRO para a versão 2.0. O objetivo central é transformar o protótipo funcional em uma plataforma de nível enterprise, capaz de suportar operações críticas de logística offshore com zero downtime e integridade de dados absoluta. A refatoração foca na transição de uma arquitetura centrada em componentes para uma arquitetura centrada em domínios e performance, garantindo que cada modificação seja retrocompatível e não interrompa o fluxo de trabalho atual dos usuários.
O escopo abrange dez áreas críticas, desde o endurecimento da segurança (OWASP Compliance) até a otimização extrema de performance (Lighthouse Score 90+). A estratégia de implementação utiliza o princípio de Non-Breaking Changes, onde novas funcionalidades e refatorações de estado coexistem com o código legado através de feature flags e adaptadores de interface até a validação completa via testes E2E. A timeline estimada de 5 semanas prioriza a fundação técnica e segurança, seguida por performance e experiência do usuário (UX/UI).
Os riscos de regressão são mitigados através de uma suíte de testes robusta (Vitest e Cypress) e monitoramento em tempo real com Sentry. Ao final deste ciclo, o CargoDeck-PRO não apenas processará manifestos com maior precisão via IA, mas oferecerá uma infraestrutura resiliente, acessível e preparada para escala global, reduzindo o custo de manutenção técnica e acelerando o time-to-market de novas funcionalidades.
2. CHECKLIST DE FERRAMENTAS INDISPENSÁVEIS
Para garantir a conformidade com os padrões de engenharia de software de alta performance, as seguintes ferramentas e verificações devem ser integradas ao ecossistema de desenvolvimento:
2.1 Segurança e Integridade
●	OWASP ZAP: Auditoria automatizada de vulnerabilidades web.
●	Crypto.js: Encriptação AES-256 para persistência de tokens sensíveis no localStorage.
●	Helmet.js: Configuração de headers HTTP (CSP, HSTS, X-Frame-Options).
●	Upstash Redis: Implementação de rate limiting distribuído para APIs de IA.
●	DOMPurify: Sanitização rigorosa de inputs HTML para prevenir XSS.
●	Supabase RLS: Políticas de Row Level Security validadas por perfil de acesso.
●	Bcrypt: Hashing de senhas com salt adaptativo.
2.2 Performance e Monitoramento
●	Lighthouse CI: Integração no pipeline para impedir deploys com queda de performance.
●	Vite Plugin Visualizer: Análise visual do tamanho do bundle por dependência.
●	Sharp: Processamento e compressão de imagens no lado do servidor/edge.
●	Sentry: Rastreamento de erros e monitoramento de performance (APM).
●	Web Vitals: Monitoramento contínuo de LCP, FID e CLS em produção.
●	Brotli: Compressão de assets de alto nível para transferência rápida.
2.3 Qualidade e Estabilidade
●	TypeScript Strict Mode: Tipagem 100% forte, proibindo o uso de any.
●	Husky + Lint-staged: Garantia de código limpo antes de cada commit.
●	Vitest: Testes unitários de alta velocidade para lógica de negócio e stores.
●	Cypress: Testes de ponta a ponta simulando a jornada completa do usuário.
●	SonarQube: Análise estática de dívida técnica e cobertura de código.
●	Jest-axe: Testes automatizados de acessibilidade (WCAG compliance).

3. PROMPT COPYABLE PARA CLAUDE CODE
"Atue como um Engenheiro de Software Senior Full Stack especializado em React, TypeScript e Performance. Sua missão é refatorar o projeto CargoDeck-PRO para a versão 2.0 seguindo as diretrizes de Non-Breaking Changes."
3.1 Contexto e Escopo
O projeto atual é um sistema de gestão de carga offshore. Você deve migrar a lógica de 'Cargas Não Alocadas' para o novo 'Módulo de Geração Modal de Transporte'. Este módulo deve ser um Grid responsivo com filtros por tipo de carga (Containers, Cestas, Skids) e suporte a ações em lote (Batch Actions).
3.2 Instruções Técnicas Específicas
1.	Estado Global: Refatore o cargoStore.ts (Zustand) para separar ações de estado. Implemente seletores otimizados para evitar re-renders desnecessários.
2.	Segurança: Integre Zod para validação de todos os schemas de dados vindos do Excel ou APIs. Implemente sanitização de strings em todos os campos de busca.
3.	IA e FAQ: Transforme o módulo de IA atual em um suporte FAQ inteligente. O sistema deve ler os arquivos .md da pasta /docs e /lessons-learned para responder dúvidas técnicas e operacionais.
4.	UI/UX: Utilize Tailwind CSS para criar um layout 'Dark Industrial'. O Grid deve suportar virtualização (react-window) para lidar com 1000+ itens sem lag.
5.	Ações de Carga: Permita a movimentação de cargas (individuais ou em grupo) para os conveses (Main Deck, Riser Deck) através de um modal de seleção de Baia/Bordo.
3.3 Restrições de Código
●	Proibido o uso de bibliotecas de componentes pesadas (ex: MUI completo). Prefira componentes Headless ou Tailwind puro.
●	Todo novo componente deve ter um arquivo de teste .test.ts associado.
●	Mantenha a compatibilidade com o schema atual do Supabase, sugerindo migrações apenas se estritamente necessário para performance.

4. ÁREA 1: SEGURANÇA DE DADOS
4.1 Proteção de Secrets e API Keys
A gestão de chaves de API (OpenCode, Supabase) deve seguir o padrão de Secret Rotation e encriptação em repouso. Nunca exponha chaves no bundle de cliente sem o prefixo `VITE_` e apenas se forem destinadas ao uso público com restrição de domínio.
Implementação de Content Security Policy (CSP):
// Exemplo de configuração de Header de Segurança const securityHeaders = {   'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none';",<br/>   'X-Frame-Options': 'DENY',<br/>   'X-Content-Type-Options': 'nosniff',<br/>   'Referrer-Policy': 'strict-origin-when-cross-origin' };
4.2 Supabase Row Level Security (RLS)
Todas as tabelas devem ter RLS habilitado. O acesso deve ser restrito ao `auth.uid()` do usuário logado ou ao `tenant_id` da embarcação.
-- Exemplo de política RLS para cargas ALTER TABLE cargo_items ENABLE ROW LEVEL SECURITY;  CREATE POLICY "Users can only access their vessel cargo"  ON cargo_items FOR ALL  USING (vessel_id IN (   SELECT vessel_id FROM user_permissions WHERE user_id = auth.uid() ));

5. ÁREA 2: PERFORMANCE E VELOCIDADE
5.1 Otimização de Bundle e Code Splitting
Utilize `React.lazy` para carregar módulos pesados como o gerador de PDF e o processador de Excel apenas quando necessário. Isso reduz o First Contentful Paint (FCP) significativamente.
const PdfGenerator = React.lazy(() => import('./services/PdfGeneratorService')); const ExcelProcessor = React.lazy(() => import('./services/ExcelProcessor'));
5.2 Estratégia de Caching e Service Workers
Implemente uma estratégia de Stale-While-Revalidate para dados de manifesto. Utilize o IndexedDB (via Dexie.js ou localForage) para armazenar o estado offline das cargas, permitindo que o usuário trabalhe em áreas de baixa conectividade (comum em ambiente offshore).
Recurso	Estratégia de Cache	TTL (Tempo de Vida)
Assets Estáticos (JS/CSS)	Cache First	1 Ano (Hash)
Dados de Carga	Stale-While-Revalidate	5 Minutos
Configurações de Usuário	Network First	Imediato

6. ÁREA 3: RESPONSIVIDADE E MOBILE
6.1 Design System Mobile-First
O CargoDeck-PRO v2.0 deve ser totalmente operacional em tablets industriais. Todos os elementos clicáveis devem respeitar a área mínima de 44x44 pixels para evitar erros de input em ambientes com vibração ou uso de luvas.
Atenção: O uso de hover como única forma de acessar ações é proibido. Todas as ações de carga devem estar disponíveis via menus de contexto ou botões visíveis.

7. ÁREA 4: ESTADO E ZUSTAND
7.1 Refatoração do cargoStore
A store principal deve ser dividida em fatias (slices) para facilitar a manutenção. Implemente o middleware de persistência para garantir que o progresso não seja perdido em caso de refresh acidental.
interface CargoState {   unallocatedCargo: CargoItem[];<br/>   filters: FilterOptions;<br/>   setFilters: (filters: FilterOptions) => void;<br/>   moveCargo: (ids: string[], destination: string) => Promise<void>; }  export const useCargoStore = create<CargoState>()(   persist(     (set, get) => ({       unallocatedCargo: [],<br/>       filters: { type: 'all', search: '' },<br/>       setFilters: (filters) => set({ filters }),<br/>       moveCargo: async (ids, destination) => {         // Lógica de movimentação com rollback       },     }),     { name: 'cargo-storage' }   ) );

8. ÁREA 5: TESTE E QUALIDADE
8.1 Pirâmide de Testes v2.0
6.	Testes Unitários (Vitest): Foco em conversores de unidade (KG para Ton), parsers de dimensões e lógica de filtros.
7.	Testes de Integração: Validação do fluxo entre cargoStore e Supabase.
8.	Testes E2E (Cypress): Fluxo crítico: Login -> Importar Excel -> Gerar Modal de Transporte -> Alocar no Deck -> Exportar PDF.

9. GUIA DE IMPLEMENTAÇÃO SEQUENCIAL
Fase 1: Foundation & Security (Dias 1-7)
●	 Ativação do TypeScript Strict Mode e correção de erros.
●	 Implementação de Zod Schemas para validação de entrada.
●	 Configuração de CSP e Headers de Segurança no Vercel.
●	 Auditoria inicial de RLS no Supabase.
Fase 2: Core Refactoring (Dias 8-14)
●	 Migração do Sidebar para o 'Módulo de Geração Modal de Transporte'.
●	 Implementação do Grid virtualizado com filtros reativos.
●	 Refatoração da Store Zustand para arquitetura de Slices.
●	 Implementação de deleção e movimentação em lote.
Fase 3: IA & FAQ (Dias 15-21)
●	 Criação do motor de busca semântica nos arquivos Markdown.
●	 Integração do Chat FAQ com contexto do projeto.
●	 Implementação de feedback de utilidade da IA.

10. MÉTRICAS DE SUCESSO
O sucesso da refatoração será medido pelos seguintes KPIs (Key Performance Indicators):
●	Performance (Lighthouse): > 90 pontos.
●	Acessibilidade: 100% de conformidade WCAG 2.1 AA.
●	Cobertura de Testes: Mínimo de 80% das funções de negócio.
●	Tempo de Carregamento: < 1.5s para o Módulo de Transporte com 500 itens.
●	Taxa de Erro (Sentry): Redução de 50% em relação à v1.0.
