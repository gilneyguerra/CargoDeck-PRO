PROMPT DE IMPLEMENTAÇÃO AUTÔNOMA - LANDING PAGE VISUAL ENHANCEMENT
Guia Técnico para Refatoração Visual, Automação de Assets e Integração de Mockups de Alta Fidelidade
30 de abril de 2026

ÍNDICE AUTOMÁTICO
1.	EXECUTIVE SUMMARY  03
2.	ARQUITETURA GERAL DO PROJETO  04
3.	PROMPT COPYABLE PARA CLAUDE CODE  06 3.1 Pipeline 1: Discovery & Mapping  06 3.2 Pipeline 2: Asset Generation  08 3.3 Pipeline 3: Mockup & Polish  10 3.4 Pipeline 4: Landing Page Integration  12
4.	VALIDAÇÃO E CONTROLE DE QUALIDADE  15
5.	ESTRUTURA DE PASTAS FINAL ESPERADA  16
6.	CHECKPOINTS E MILESTONES  17
7.	INSTRUÇÕES FINAIS AO CLAUDE CODE  18
8.	CONSIDERAÇÕES ESPECIAIS  19
9.	TIMELINE ESTIMADA  20

1. EXECUTIVE SUMMARY
Este documento estabelece o protocolo técnico e o prompt estruturado para a execução autônoma de melhorias visuais na landing page do ecossistema CargoDeck-PRO. O objetivo central é transformar a apresentação estática atual em uma experiência de "Product Showcase" de alto nível, utilizando o agente Claude Code como executor principal dentro do ambiente VS Code.
O agente deverá realizar, de forma independente, a captura de screenshots técnicos via CodeSnap, a gravação de motion graphics (GIFs/Vídeos) via CodeTape e a criação de mockups profissionais utilizando a integração do Figma for VS Code. A implementação final exige a refatoração da landing page para incluir seções explicativas ricas, animações de scroll e uma arquitetura de informação que guie o usuário através das funcionalidades críticas do sistema, mantendo a estética Dark Industrial característica do projeto.
2. ARQUITETURA GERAL DO PROJETO
A estratégia de refatoração visual está segmentada em quatro pipelines autônomos e sequenciais, garantindo que a geração de ativos (assets) preceda a integração de código.
2.1 Pipeline 1: Discovery & Mapping
O agente realizará uma varredura completa no repositório para identificar as 8 a 10 funcionalidades-chave. Este mapeamento correlaciona arquivos de componentes React, stores de estado (Zustand) e fluxos de usuário para determinar o que merece destaque visual (ex: extração de manifesto, drag-and-drop, relatórios PDF).
2.2 Pipeline 2: Asset Generation
Fase de produção técnica. Utilizando extensões integradas, o agente gerará PNGs de código (CodeSnap) e vídeos de curta duração (CodeTape) que demonstram a funcionalidade em tempo real no ambiente local (localhost:5173). Cada asset será acompanhado de um arquivo de metadados JSON para facilitar a indexação.
2.3 Pipeline 3: Mockup & Polish
Transformação de capturas brutas em elementos de design. O agente utilizará o Figma para adicionar molduras de navegador, sombras flutuantes e cursores simulados que apontam para os Call-to-Action (CTA). O foco é a fidelidade visual e a aplicação rigorosa da paleta de cores industrial (#0f172a, #1e293b, #0ea5e9).
2.4 Pipeline 4: Landing Page Integration
Implementação no frontend. O agente refatorará o componente LandingPage.tsx, criando seções dinâmicas que alternam entre imagem e texto explicativo. Inclui a configuração de animações de entrada (fade-in/slide-up) e a garantia de responsividade total para dispositivos móveis e desktops de alta resolução.

3. PROMPT COPYABLE PARA CLAUDE CODE
Instrução de Ativação: Copie o conteúdo abaixo e cole diretamente no terminal do Claude Code para iniciar o processo.
"Você é um agente especialista em visual design e desenvolvimento frontend autônomo. Sua tarefa é executar uma implementação visual completa da landing page do CargoDeck-PRO. Siga RIGOROSAMENTE cada pipeline abaixo sem desvios."
3.1 Pipeline 1: Discovery & Mapping - Instruções Detalhadas
1.1 Acesse o repositório GitHub https://github.com/gilneyguerra/CargoDeck-PRO e leia o arquivo README.md para entender a estrutura do projeto.
1.2 Identifique todas as páginas React existentes em /src/pages/. Você deve encontrar componentes como DashboardPage, StowagePlanPage, e outras. Documente o propósito de cada uma.
1.3 Mapeie as 8-10 funcionalidades principais que serão destaque na landing page. Priorize pela importância de negócio. Exemplos obrigatórios:
10.	Extração Inteligente de Manifesto via Excel: Processamento via LLM e extração automática de dados de carga.
11.	Grid de Cargas Não Alocadas: Exibição lado a lado com busca em tempo real e filtros por tipo (containers, cestas, skids).
12.	Movimentação de Cargas em Grupo: Seleção múltipla e alocação simultânea para conveses específicos.
13.	Drag-and-Drop para Baias: Arrastre de cargas com visual proporcional às dimensões reais no plano de convés.
14.	Criação Manual de Carga: Formulário de entrada com validação e persistência em Supabase.
15.	Geração de Relatório PDF: Exportação de planos consolidados com métricas de utilização.
16.	Dashboard de Métricas: Cards de KPI mostrando utilização de espaço e peso distribuído.
17.	Alocação em Conveses com Seleção: Modal interativo para escolha de baia e bordo (Bombordo/Estibordo).
1.4 Para cada funcionalidade, anote: arquivo React responsável, store Zustand associada e componentes filhos relevantes.
3.2 Pipeline 2: Asset Generation - Instruções Detalhadas
2.1 Para cada funcionalidade mapeada, execute a sequência de captura. Exemplo (Funcionalidade A):
2.1.1 Captura de Código (CodeSnap): Abra o arquivo relevante (ex: ExcelUploader.tsx). Selecione trechos lógicos (máx 40 linhas). Execute Cmd+Shift+P → CodeSnap. Configure: tema dark, fonte Fira Code, 16px. Exporte PNGs como 01-ExcelUploader-InputForm.png na pasta /src/assets/landing-visuals/funcionalidade-A/.
2.1.2 Gravação de Movimento (CodeTape): Com o app em localhost:5173, grave 8-15 segundos da ação completa (ex: upload do arquivo até a aparição no grid). Exporte como MP4 (1920x1080, 60fps) como 01-ExcelUploader-FullFlow.mp4.
2.1.3 Metadata: Gere um metadata.json contendo descrição, prioridade e contexto explicativo para cada asset.
3.3 Pipeline 3: Mockup & Polish - Instruções Detalhadas
3.1 Utilize o Figma for VS Code para polimento. Para cada asset:
18.	Moldura (Browser Frame): Adicione moldura com border-radius 12px, cor #1e293b. Barra de endereço em #0f172a com texto "cargodeck-pro.vercel.app".
19.	Cursor: Posicione um ícone de cursor (Phosphor Icons) sobre o elemento de ação (ex: botão "Carregar"). Adicione Drop Shadow (blur 4px, opacidade 0.3).
20.	Efeitos: Aplique Drop Shadow ao frame (blur 12px, offset Y 8px). Use Gradient Overlay (#0f172a a #1e293b).
21.	Exportação: Gere versões PNG e WebP otimizadas (PNG < 500KB, WebP < 250KB).
3.4 Pipeline 4: Landing Page Integration - Instruções Detalhadas
4.1 Refatore LandingPage.tsx. Crie o componente FeatureShowcaseSection.tsx com suporte a alternância de lado (imagem esquerda/direita).
4.2 Animações: Use framer-motion para Fade-in (opacity 0 → 1) e Slide-up (translateY 40px → 0) com duração de 600ms ao entrar no viewport.
4.3 Responsividade: Mobile (stack vertical, imagem no topo), Desktop (lado a lado, gap 32px). Use picture tag para priorizar WebP.

4. VALIDAÇÃO E CONTROLE DE QUALIDADE
A fase de encerramento exige a validação rigorosa dos ativos e da performance da página.
Critério	Método de Teste	Alvo / Sucesso
Performance	Google Lighthouse	Score  85
Acessibilidade	Lighthouse / Axe	Score  90 (Alt text obrigatório)
Visual	Cross-browser (Chrome/Safari)	Animações fluidas a 60fps
Responsividade	DevTools Emulation	Breakpoints 375px, 768px, 1440px

5. ESTRUTURA DE PASTAS FINAL ESPERADA
A organização dos arquivos deve seguir rigorosamente a hierarquia abaixo para garantir a manutenibilidade do projeto:
●	/src/assets/landing-visuals//funcionalidade-A-extracao-excel/ /code-snapshots/ (PNGs do CodeSnap)
●	/mockups/ (PNG + WebP finais com moldura)
●	/videos/ (MP4 do CodeTape)
●	metadata.json
●	/funcionalidade-B-grid-cargas/ (Estrutura idêntica...)
●	INDEX.md (Catálogo de todos os assets)
●	/src/components/landing/ LandingPage.tsx
●	FeatureShowcaseSection.tsx
●	HeroSection.tsx

6. CHECKPOINTS E MILESTONES
O cronograma de execução autônoma está dividido em marcos de entrega claros:
22.	Checkpoint 1 (T+2h): Conclusão do mapeamento de funcionalidades e arquivos.
23.	Checkpoint 2 (T+8h): Geração de todos os assets brutos (CodeSnap/CodeTape).
24.	Checkpoint 3 (T+12h): Finalização dos mockups no Figma e exportação WebP.
25.	Checkpoint 4 (T+16h): Integração completa no React com animações de scroll.
26.	Checkpoint 5 (T+20h): Relatório final de QA e otimização Lighthouse.

7. INSTRUÇÕES FINAIS AO CLAUDE CODE
Você tem autonomia total para a tomada de decisão técnica. Caso um caminho de arquivo não seja localizado, utilize a busca global para encontrar o equivalente funcional. Se uma biblioteca como framer-motion não estiver presente, execute a instalação via npm install e documente a alteração no package.json.
Atenção: Nunca quebre a funcionalidade de login ou os fluxos de dados do Supabase durante a refatoração da landing page.

8. CONSIDERAÇÕES ESPECIAIS
●	Extensões: CodeSnap, Figma for VS Code, CodeTape e Peacock já estão pré-configuradas no ambiente.
●	Ícones: Utilize exclusivamente a biblioteca Phosphor Icons para manter a consistência visual.
●	Paleta de Cores: Estrita observância aos hexadecimais: #0f172a (BG), #1e293b (Surface), #0ea5e9 (Primary).
●	Acessibilidade: Todas as imagens geradas devem possuir a propriedade alt descritiva no código React.
●	Animações: Utilize o AnimatePresence do framer-motion para transições suaves entre estados.
