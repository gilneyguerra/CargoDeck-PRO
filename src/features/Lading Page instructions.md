DIRETRIZES DE DESIGN E IMPLEMENTAÇÃO: LANDING PAGE CARGODECK PRO
Especificações de Interface, Experiência do Usuário e Engenharia de Prompt para Antigravity
27 de abril de 2026

1. Briefing Executivo
O objetivo primordial desta landing page é converter gestores de logística portuária e operadores de convés em usuários ativos da plataforma CargoDeck Pro. A página deve transmitir autoridade técnica, inovação tecnológica e confiabilidade operacional. O diferencial competitivo reside na capacidade de transformar manifestos de carga complexos e analógicos em planos de convés digitais e interativos em questão de segundos, utilizando OCR de alta precisão e inteligência de layout.
As métricas de sucesso (KPIs) incluem uma taxa de conversão de visitantes para "Início de Teste" superior a 15%, tempo médio de permanência na página acima de 3 minutos e uma taxa de cliques (CTR) nos CTAs principais de pelo menos 8%. As chamadas para ação (CTAs) devem ser claras, urgentes e estrategicamente posicionadas para guiar o usuário através do funil de decisão.
●	Objetivo: Conversão de leads B2B e demonstração de capacidade técnica.
●	Público-alvo: Engenheiros de carga, superintendentes marítimos, planejadores de logística offshore.
●	Diferencial: Extração automatizada de dados espaciais e validação ISO 6346 integrada.
●	CTAs Principais: "Começar Agora Gratuitamente", "Agendar Demonstração Técnica", "Ver App em Ação".
2. Identidade Visual
A estética visual deve evocar o ambiente industrial marítimo fundido com a sofisticação do software de alta tecnologia. Utilizaremos o conceito de Dark Industrial Mode, onde o fundo escuro (Navy) permite que os elementos de destaque (Emerald e Cyan) brilhem com efeitos de neon, simulando interfaces de radares e sistemas de navegação modernos.
●	Paleta de Cores:Navy (#001F3F): Cor de fundo primária e superfícies profundas.
●	Emerald Green (#00A884): Cor de sucesso, confirmação e destaques de segurança.
●	Silver/White (#F0F0F0): Tipografia de corpo e ícones secundários.
●	Cyan/Neon (#00FFCC): Elementos de interação, botões primários e efeitos de glow.
●	Tipografia:Títulos: Montserrat Bold (700) para impacto e modernidade.
●	Corpo: Inter Regular (400) para legibilidade máxima em dados técnicos.
●	Elementos Gráficos: Ícones de contêineres com traços de circuitos integrados, bordas com glassmorphism (blur de 15px) e sombras elevadas com difusão em Cyan.
3. Estrutura de Seções da Landing Page
3.1. HERO (Impacto Imediato)
●	Objetivo: Capturar a atenção em menos de 3 segundos.
●	Conteúdo: Headline: "O Futuro do Planejamento de Carga é Digital e Instantâneo". Subheadline: "Transforme manifestos complexos em planos de convés interativos com precisão cirúrgica".
●	Visual: Background animado com uma grade de convés (grid) em perspectiva 3D sofrendo um efeito de "scan" por uma linha Cyan horizontal.
●	Interação: Botão principal com efeito de pulso neon ao passar o mouse.
3.2. VALOR PROPOSTO (Diferenciais)
●	Objetivo: Justificar a adoção da ferramenta.
●	Conteúdo: 3 Cards: Velocidade (Redução de 90% no tempo de digitação), Precisão (Validação automática de pesos e dimensões), Segurança (Eliminação de erros humanos no cálculo de carga).
●	Visual: Cards com fundo Navy levemente mais claro que o background e bordas em gradiente Emerald-to-Cyan.
3.3. COMO FUNCIONA (O Processo)
●	Objetivo: Demonstrar a facilidade de uso.
●	Passos:Upload: Arraste seu PDF (texto ou imagem).
●	Extração: IA identifica origens, destinos, pesos e dimensões.
●	Alocação: Arraste as cargas para o grid do convés.
●	Exportação: Gere relatórios PDF profissionais instantaneamente.
●	Visual: GIFs em motion sincronizados com o scroll do usuário.
3.4. CARACTERÍSTICAS PRINCIPAIS (Features)
●	Objetivo: Listar capacidades técnicas.
●	Itens: OCR Avançado, Detecção de Grid, Validação ISO 6346, Multi-Destinos, Conversão Automática KG/TON, Interface Drag-and-Drop, Relatórios Customizados, Histórico de Operações, Modo Offline, Suporte a PDFs Escaneados.
3.5. DEMONSTRAÇÃO VISUAL (Showcase)
●	Objetivo: Prova social de interface.
●	Visual: Carrossel de screenshots de alta resolução do app em uso, com zoom automático em detalhes como a extração de dados e o mapa de calor do convés.
3.6. CASOS DE USO (Aplicações Reais)
●	Cenários: Operações de Supply Offshore, Logística de Contêineres Especiais, Gestão de Carga de Projeto, Planejamento de Convés para Embarcações de Apoio.
3.7. PRICING (Planos)
●	Estrutura: Plano Free (Individual), Pro (Equipes Médias), Enterprise (Grandes Operadores com API).
3.8. TESTIMONIALS (Confiança)
●	Conteúdo: Depoimentos reais de operadores de carga com foto, nome e cargo.
3.9. FAQ (Dúvidas)
●	Conteúdo: Acordeão com perguntas sobre segurança de dados, tipos de PDF suportados e integração com outros sistemas.
3.10. CTA FINAL (Fechamento)
●	Objetivo: Conversão final.
●	Visual: Seção de largura total com gradiente Navy-to-Emerald e botão gigante "Acessar CargoDeck Pro Agora".
4. Assets Visuais Necessários
Para garantir a qualidade final, os seguintes ativos devem ser produzidos ou fornecidos:
●	GIFs em Motion: Processamento de OCR mostrando o texto sendo "lido" e transformado em campos de formulário.
●	Carga sendo arrastada de uma lista lateral para uma baia específica no mapa do convés.
●	Relatório PDF sendo gerado com um clique e abrindo em uma nova aba.
●	Ícones Customizados: Conjunto de ícones em formato SVG com espessura de linha de 2px, utilizando a cor Cyan.
●	Backgrounds: Textura de metal escovado escuro e padrões de grade náutica (latitudes/longitudes) sutis.
5. Especificações Técnicas de Frontend
●	Framework: Next.js 14 (App Router) para performance e SEO otimizado.
●	Estilização: Tailwind CSS para agilidade e consistência de design system.
●	Animações: Framer Motion para transições de entrada e estados de hover complexos.
●	Responsividade:Mobile (320px - 480px): Menu hambúrguer, cards em coluna única, fontes reduzidas em 15%.
●	Tablet (768px - 1024px): Grid de 2 colunas para features, imagens laterais ocultas se necessário.
●	Desktop (1440px+): Layout full-width com containers de no máximo 1280px.
●	Performance: Imagens em formato WebP, Lazy Loading em todas as seções abaixo da dobra (fold).
6. Especificações de Componentes UI
6.1. Botão Primário (CTA)
●	Estilo: Fundo Cyan (#00FFCC), texto Navy (#001F3F) Bold.
●	Hover: Aumento de escala (1.05), sombra externa (box-shadow) Cyan com 20px de difusão.
●	CSS Base:
.btn-primary { background: #00FFCC; color: #001F3F; padding: 12px 24px; border-radius: 8px; font-weight: 700; transition: all 0.3s ease; box-shadow: 0 0 0px rgba(0, 255, 204, 0); }
.btn-primary:hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(0, 255, 204, 0.6); }
6.2. Feature Card
●	Estilo: Glassmorphism. Fundo rgba(0, 31, 63, 0.7), backdrop-filter: blur(10px), borda 1px rgba(240, 240, 240, 0.1).
●	Animação: Fade-in-up ao entrar no viewport.
7. Paleta de Cores Detalhada
●	Primárias: Navy: HEX #001F3F | RGB(0, 31, 63) | HSL(210, 100%, 12%)
●	Emerald: HEX #00A884 | RGB(0, 168, 132) | HSL(167, 100%, 33%)
●	Destaque: Cyan Neon: HEX #00FFCC | RGB(0, 255, 204) | HSL(168, 100%, 50%)
●	Escala de Cinzas: Grey 900: #0A0A0A (Fundo absoluto)
●	Grey 500: #757575 (Textos secundários)
●	Grey 50: #F9F9F9 (Textos de alto contraste)
8. Tipografia Completa
●	H1 (Hero): Montserrat Bold, 48px / 1.2 line-height, -0.02em letter-spacing.
●	H2 (Seções): Montserrat Bold, 36px / 1.3 line-height.
●	Corpo (P): Inter Regular, 16px / 1.6 line-height, cor #F0F0F0.
●	Labels/Buttons: Inter SemiBold, 14px, uppercase para botões.
9. Copy e Microcopy
●	Headline: "Domine a Logística de Convés com Inteligência Artificial."
●	Subheadline: "O CargoDeck Pro automatiza a extração de manifestos e otimiza o espaço da sua embarcação em segundos. Menos erro humano, mais eficiência operacional."
●	CTA Button: "INICIAR TESTE GRÁTIS"
●	Feature Label: "Extração OCR de Alta Precisão"
10. Fluxo de Interação e User Journey
1.	Entrada: Usuário impactado pelo Hero e animação de grid.
2.	Educação: Scroll para "Como Funciona" para entender a simplicidade.
3.	Validação: Leitura das features técnicas e casos de uso.
4.	Conversão: Clique no CTA flutuante ou no CTA final da página.
5.	Pós-Clique: Redirecionamento para página de Sign-up com campos pré-preenchidos.
11. Animações e Micro-interações
●	Scroll Parallax: O mapa do convés no background move-se 20% mais devagar que o conteúdo.
●	Hover de Card: O ícone da feature muda de Silver para Cyan e ganha um brilho externo.
●	Loading State: Um contêiner estilizado fazendo um loop infinito de "carregamento" entre as seções se o asset demorar a carregar.
12. Checklist de Implementação
6.	 Favicon em alta resolução (ícone de contêiner neon).
7.	 Meta tags de SEO (Título, Descrição, Keywords).
8.	 Open Graph configurado para compartilhamento em LinkedIn/WhatsApp.
9.	 Certificado SSL ativo (HTTPS).
10.	 Compressão de imagens Gzip/Brotli ativa.
11.	 Teste de contraste WCAG 2.1 AA em todos os botões.
12.	 Verificação de links quebrados.
13.	 Formulário de contato com validação de e-mail.
14.	 Integração com Google Analytics/Hotjar.
15.	 Tempo de carregamento (LCP) abaixo de 2.5s.
16.	 Responsividade testada em iPhone 13, iPad Air e Desktop 1080p.
17.	 Hover states aplicados em todos os elementos clicáveis.
18.	 Smooth scroll implementado.
19.	 Alt text em todas as imagens e GIFs.
20.	 Scripts de terceiros carregados com defer.
21.	 Página de 404 customizada com a identidade visual.
22.	 Política de Privacidade e Termos de Uso acessíveis no footer.
23.	 Botão "Voltar ao Topo" em telas mobile.
24.	 Teste de velocidade no PageSpeed Insights (Score > 90).
25.	 Verificação de renderização em modo escuro forçado pelo browser.
26.	 Alinhamento de grid de 12 colunas consistente.
27.	 Espaçamento (gaps) de 1.5rem (24px) padronizado.
28.	 Animações de entrada não bloqueiam a interação do usuário.
29.	 Vídeos em loop com atributo muted e playsinline.
30.	 Fallback de fontes configurado (sans-serif).
31.	 Ícones em formato SVG para evitar pixelização.
32.	 Mensagens de sucesso após envio de formulário claras.
33.	 Menu fixo (sticky) com mudança de opacidade no scroll.
34.	 Teste de usabilidade: fluxo de conversão em menos de 3 cliques.
35.	 Backup final do código e assets realizado.
