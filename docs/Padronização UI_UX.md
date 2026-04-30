PADRONIZAÇÃO DE UI/UX - POP-UPS E NOTIFICAÇÕES
Guia Técnico de Implementação de Componentes de Feedback e Diálogo
28 de abril de 2026

1. Diagnóstico dos Problemas
A análise técnica da interface atual do CargoDeck Pro identificou inconsistências críticas que prejudicam a experiência do usuário e a percepção de confiabilidade do sistema. Os pontos abaixo detalham as falhas que serão corrigidas por este documento:
●	Problema 1: Utilização de pop-ups nativos do navegador (alert()), que possuem estilo inconsistente com a identidade visual da marca e interrompem o fluxo de trabalho de forma agressiva.
●	Problema 2: Notificações de processamento posicionadas no canto superior direito, causando sobreposição direta com elementos essenciais do header e menus de navegação.
●	Problema 3: Ausência de padronização CSS entre diferentes tipos de notificações, resultando em variações de espaçamento, bordas e sombras sem critério lógico.
●	Problema 4: Hierarquia de z-index inadequada, permitindo que elementos de conteúdo ou menus flutuantes sobreponham avisos críticos e modais de confirmação.
●	Problema 5: Falta de animações de entrada e saída, tornando a transição de estados da interface abrupta e visualmente desconfortável.
●	Problema 6: Ausência de feedback visual em tempo real durante processos de longa duração (como extração de OCR), deixando o usuário sem confirmação de que o sistema está operando.
●	Problema 7: Botões de ação dentro de diálogos com estilos divergentes dos padrões globais do app, variando em altura, peso de fonte e cores de estado.

2. Solução — Componentes Padronizados
Para resolver os problemas diagnosticados, o sistema adotará quatro componentes fundamentais, construídos com foco em hierarquia visual e clareza operacional.
2.1. Modal de Confirmação
●	Finalidade: Utilizado para ações que exigem decisão do usuário, como salvar arquivos ou excluir cargas.
●	Estrutura: Header com título, corpo para conteúdo descritivo e footer para botões de ação.
●	CSS: Fundo semi-transparente (backdrop) com blur, card centralizado e aplicação de glassmorphism.
●	Cores: Fundo Navy (#1A2847), Destaques em Emerald (#10B981) e Neutros em Cinza (#6B7280).
●	Botões: Primário (Emerald), Secundário (Cinza) e Destrutivo (Red).
●	Animação: Fade-in combinado com scale-up via Framer Motion.
●	Z-index: 1000.
2.2. Toast Notification
●	Finalidade: Mensagens temporárias de confirmação ou erro leve.
●	Posição: Centro-inferior da tela para evitar obstrução de controles superiores.
●	Tipos: Success (Verde), Error (Vermelho), Warning (Amarelo) e Info (Azul).
●	Duração: 4 segundos com auto-dismiss.
●	Animação: Slide-up na entrada e fade-out na saída.
●	Interação: Botão "X" para fechamento manual e empilhamento (stack) com 12px de espaçamento.
●	Z-index: 900.
2.3. Notification Banner
●	Finalidade: Indicação de processos de longa duração, como processamento de manifestos.
●	Posição: Topo da página, posicionado imediatamente abaixo do header sem sobrepô-lo.
●	Conteúdo: Ícone animado, mensagem de status e barra de progresso opcional.
●	Cores: Cyan Neon (#06B6D4) sobre fundo Navy semi-transparente.
●	Animação: Slide-down na entrada e slide-up na saída.
●	Z-index: 800.
2.4. Alert Dialog
●	Finalidade: Erros críticos ou confirmações de alta prioridade que bloqueiam o fluxo.
●	Estrutura: Ícone centralizado de grande escala, título em destaque e mensagem clara.
●	Variações: Success (Emerald/Checkmark), Error (Red/X), Warning (Amber/Alert).
●	Animação: Bounce-in com backdrop fade.
●	Z-index: 1100.

3. Especificações CSS Detalhadas
A implementação deve seguir rigorosamente as classes e propriedades abaixo para garantir a consistência visual em todo o ecossistema do app.
/
Estrutura de Modal Base
/ .modal__backdrop {   position: fixed;<br/>   top: 0;<br/>   left: 0;<br/>   width: 100%;<br/>   height: 100%;<br/>   background: rgba(26, 40, 71, 0.5);<br/>   backdrop-filter: blur(8px);<br/>   display: flex;<br/>   align-items: center;<br/>   justify-content: center;<br/>   z-index: 1000; }  .modal__card {   background: #FFFFFF;<br/>   width: 100%;<br/>   max-width: 480px;<br/>   border-radius: 12px;<br/>   box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);<br/>   overflow: hidden;<br/>   display: flex;<br/>   flex-direction: column;<br/>   z-index: 1010; }  /
Toast Notification
/ .toast__container {   position: fixed;<br/>   bottom: 32px;<br/>   left: 50%;<br/>   transform: translateX(-50%);<br/>   display: flex;<br/>   flex-direction: column;<br/>   gap: 12px;<br/>   z-index: 900; }  .toast__item {   padding: 12px 20px;<br/>   border-radius: 8px;<br/>   display: flex;<br/>   align-items: center;<br/>   gap: 12px;<br/>   min-width: 300px;<br/>   background: #1A2847;<br/>   color: #FFFFFF;<br/>   box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }  /
Notification Banner
/ .banner__wrapper {   position: sticky;<br/>   top: 64px; /
Altura do Header
/<br/>   width: 100%;<br/>   height: 56px;<br/>   background: rgba(26, 40, 71, 0.95);<br/>   border-bottom: 2px solid #06B6D4;<br/>   display: flex;<br/>   align-items: center;<br/>   padding: 0 24px;<br/>   z-index: 800;<br/>   color: #06B6D4; }

4. Animações com Framer Motion
As animações devem ser suaves e baseadas em física (spring) para evitar a sensação de interface mecânica.
●	Modal: initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, transition: { type: "spring", duration: 0.3 }.
●	Toast: initial: { y: 50, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.2 } }.
●	Banner: initial: { y: -100% }, animate: { y: 0 }, transition: { duration: 0.3 }.
// Exemplo de implementação Modal <AnimatePresence>   {isOpen && (     <motion.div        className="modal__backdrop"       initial={{ opacity: 0 }}<br/>       animate={{ opacity: 1 }}<br/>       exit={{ opacity: 0 }}     >       <motion.div          className="modal__card"         initial={{ scale: 0.9, opacity: 0 }}<br/>         animate={{ scale: 1, opacity: 1 }}<br/>         exit={{ scale: 0.9, opacity: 0 }}<br/>         transition={{ type: "spring", damping: 25, stiffness: 300 }}       >         {children}       </motion.div>     </motion.div>   )} </AnimatePresence>

5. Paleta de Cores Completa
Abaixo estão as definições cromáticas para aplicação em todos os componentes de UI.
●	Navy (Primária) HEX: #1A2847 (Base), #0F1A2E (Dark)
●	Aplicação: Backdrops, fundos de toast e headers de modal.
●	Emerald (Sucesso) HEX: #10B981 (Base), #059669 (Hover)
●	Aplicação: Botões de confirmação e ícones de sucesso.
●	Red (Erro) HEX: #EF4444 (Base), #DC2626 (Hover)
●	Aplicação: Botões destrutivos e alertas críticos.
●	Amber (Warning) HEX: #F59E0B (Base), #D97706 (Hover)
●	Aplicação: Notificações de atenção e ícones de alerta.
●	Cyan (Info/Processamento) HEX: #06B6D4 (Base), #0891B2 (Hover)
●	Aplicação: Banners de progresso e anéis de foco.
●	Cinza Neutro HEX: #6B7280 (Texto Secundário), #E5E7EB (Bordas), #F9FAFB (Fundo Card)
●	Preto/Branco HEX: #000000, #FFFFFF

6. Tipografia Padronizada
●	Heading Modal: Montserrat Bold, 18px, Cor: #1A2847, Line-height: 1.2.
●	Texto Modal: Inter Regular, 14px, Cor: #6B7280, Line-height: 1.5.
●	Labels: Inter Medium, 12px, Cor: #1A2847, Text-transform: uppercase.
●	Botões: Inter SemiBold, 14px, Altura: 40px, Min-width: 120px.

7. Recursos Visuais Modernos para Elevar UX
7.1. Micro-interações
●	Hover States: Escala de 1.02 e aumento da sombra projetada para indicar interatividade.
●	Focus Rings: Outline de 2px sólido em Cyan (#06B6D4) com offset de 2px para acessibilidade.
●	Loading States: Uso de spinners SVG customizados e skeleton loaders para evitar saltos de layout.
7.2. Feedback Tátil e Visual
●	Pulse Effect: Aplicado em ícones de processamento no banner para indicar atividade contínua.
●	Shimmer Effect: Utilizado em placeholders de carregamento dentro de modais.
●	Progress Bar: Implementação de barra de progresso linear no topo do banner para tarefas de extração.
7.3. Efeitos de Profundidade
●	Glassmorphism: Uso de backdrop-filter: blur(8px) em todos os elementos flutuantes.
●	Glow Effect: CTAs primários devem possuir um box-shadow suave na cor Cyan quando em foco.
●	Separadores: Linhas de 1px em #E5E7EB para dividir seções de conteúdo e botões.

8. Implementação Step-by-Step
1.	Remoção de Legado: Localizar e remover todas as instâncias de alert(), confirm() e prompt() nativos.
2.	Core Components: Desenvolver os componentes base (Modal, Toast, Banner, Alert) como componentes React/Vue reutilizáveis.
3.	Provider de Notificação: Implementar um Context API ou Store para gerenciar a fila de Toasts e o estado do Banner global.
4.	Integração Framer Motion: Aplicar as variantes de animação definidas na Seção 4.
5.	Refatoração de Estilos: Substituir cores hardcoded pelas variáveis da paleta Navy/Emerald.
6.	Acessibilidade: Adicionar aria-modal="true", role="dialog" e gerenciar o foco do teclado (trap focus) em modais.
7.	Responsividade: Ajustar larguras de modais para 90% da tela em dispositivos móveis.
8.	Testes de Stress: Validar o comportamento do sistema com múltiplas notificações simultâneas.
9.	Documentação de Uso: Criar guia interno para desenvolvedores sobre quando usar cada tipo de alerta.
10.	Deploy: Lançamento em ambiente de homologação seguido de produção.

9. Checklist de Validação
●	 Pop-ups e Modais estão perfeitamente centralizados na viewport.
●	 Banners de processamento aparecem abaixo do header sem cobrir o menu.
●	 Todos os componentes utilizam a paleta Navy (#1A2847) como base.
●	 Botões possuem altura mínima de 40px para facilitar o toque.
●	 Animações não ultrapassam 500ms de duração.
●	 Hierarquia de Z-index respeita a ordem: Banner(800) < Toast(900) < Modal(1000) < Alert(1100).
●	 Backdrop blur está visível e funcional em todos os navegadores modernos.
●	 O foco do teclado é capturado pelo modal ao abrir e devolvido ao fechar.

10. Exemplos Práticos
●	Cenário: Sucesso ao SalvarAção: Usuário clica em "Salvar Manifesto".
●	Componente:Toast Success ("Manifesto salvo com sucesso!").
●	Cenário: Erro de ProcessamentoAção: Falha na leitura de PDF escaneado.
●	Componente:Alert Dialog Error ("Erro na Extração: O arquivo está corrompido ou ilegível").
●	Cenário: Processamento em LoteAção: Importação de 50 cargas simultâneas.
●	Componente:Notification Banner ("Processando 50 itens... 65% concluído").
●	Cenário: Ação IrreversívelAção: Usuário clica em "Excluir Plano de Carga".
●	Componente:Modal de Confirmação ("Deseja realmente excluir? Esta ação não pode ser desfeita").
