GUIA DE CORREÇÕES DE DESIGN - CARGODECKPLAN.COM
Diretrizes técnicas para otimização de UI/UX e conformidade de acessibilidade
27 de abril de 2026

1. PALETA DE CORES DEFINIDAS
A definição cromática abaixo estabelece os padrões de identidade visual e garante o contraste necessário para a legibilidade do sistema. Estes valores devem ser aplicados rigorosamente em todos os elementos de interface.
PRIMÁRIAS:<br/> azulMaritimo: #003366 (RGB: 0, 51, 102)<br/> azulAcao: #0056B3 (RGB: 0, 86, 179)<br/> laranjaDest: #FF8C00 (RGB: 255, 140, 0)  NEUTRAS:<br/> textoPrincipal: #1A1A1A<br/> textoSecundario: #555555<br/> bgLight: #F8F9FA<br/> bgDark: #0A192F
2. PROBLEMAS CRÍTICOS
Foram identificados desvios técnicos que comprometem a experiência do usuário e a conformidade com as normas WCAG 2.1 AA. As correções abaixo são prioritárias.
●	Problema 1: Contraste Hero TitleElemento: h1.hero-title
●	Problema: Contraste 2.8:1 (abaixo do mínimo de 4.5:1 exigido)
●	Valor Atual: color: #555555 sobre background: #FFFFFF
●	Valor Esperado: color: #FFFFFF sobre gradiente azul escuro
●	CSS Necessário:
.hero-title {   color: #FFFFFF !important;<br/>   text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
●	Problema 2: Botões CTAElemento: .btn-primary, .btn-secondary
●	Problema: Ausência de diferenciação visual clara, dificultando a identificação da ação principal.
●	Solução: Implementar botão primário com preenchimento sólido e botão secundário com estilo outline.
3. VARIÁVEIS CSS GLOBAIS
Utilize as variáveis abaixo no arquivo de estilos globais para garantir a consistência em todo o ecossistema do aplicativo.
:root {   --color-primary-maritime: #003366;<br/>   --color-action-blue: #0056B3;<br/>   --color-text-main: #1A1A1A;<br/>   --color-text-secondary: #555555;<br/>   --color-bg-light: #F8F9FA;<br/>   --color-bg-dark: #0A192F;<br/>   --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);<br/>   --shadow-md: 0 4px 12px rgba(0,0,0,0.15);<br/>   --transition-default: all 0.3s ease-in-out;<br/>   --font-size-h1: 3.5rem;<br/>   --font-size-h2: 2.5rem;<br/>   --border-radius-lg: 12px; }
4. COMPONENTE HERO - ANTES vs DEPOIS
A seção Hero deve ser reformulada para projetar autoridade e garantir que a mensagem principal seja legível independentemente da imagem de fundo.
ANTES (Problema):
.hero-section {   background-color: #FFFFFF;<br/>   padding: 60px 20px; } .hero-title {   color: #555555;<br/>   font-size: 2.5rem; }
DEPOIS (Solução):
.hero-section {   background: linear-gradient(135deg, rgba(0,20,40,0.85) 0%, rgba(0,51,102,0.8) 100%),                url('/images/hero-bg.jpg') center/cover;   padding: 100px 40px;<br/>   min-height: 600px;<br/>   display: flex;<br/>   align-items: center; } .hero-title {   color: #FFFFFF;<br/>   font-size: var(--font-size-h1);<br/>   text-shadow: 0 4px 8px rgba(0,0,0,0.4); } .btn-primary {   background-color: var(--color-action-blue);<br/>   color: #FFFFFF;<br/>   padding: 16px 40px;<br/>   border-radius: var(--border-radius-lg);<br/>   font-weight: 700; } .btn-primary:hover {<br/>   background-color: #003D8F;<br/>   transform: translateY(-3px);<br/>   box-shadow: var(--shadow-md); }
5. COMPONENTE NAVIGATION
A barra de navegação deve permanecer visível durante a rolagem para facilitar o acesso às seções do aplicativo.
header.navbar {   position: fixed;<br/>   top: 0;<br/>   width: 100%;<br/>   z-index: 1000;<br/>   background: rgba(255,255,255,0.95);<br/>   backdrop-filter: blur(10px);<br/>   -webkit-backdrop-filter: blur(10px);<br/>   border-bottom: 1px solid rgba(0,0,0,0.08);<br/>   box-shadow: var(--shadow-sm); } .navbar-links a {   color: var(--color-text-main);<br/>   transition: var(--transition-default);<br/>   position: relative;<br/>   text-decoration: none;<br/>   font-weight: 500; } .navbar-links a::after {<br/>   content: '';<br/>   position: absolute;<br/>   bottom: -4px;<br/>   left: 0;<br/>   width: 0;<br/>   height: 2px;<br/>   background-color: var(--color-action-blue);<br/>   transition: var(--transition-default); } .navbar-links a:hover::after {<br/>   width: 100%; }
6. COMPONENTE FEATURE CARDS
Os cartões de funcionalidades devem apresentar profundidade visual e feedback interativo imediato.
.features-grid {   display: grid;<br/>   grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));<br/>   gap: 32px;<br/>   padding: 60px 40px; } .feature-card {   background: #FFFFFF;<br/>   border-radius: var(--border-radius-lg);<br/>   padding: 40px;<br/>   box-shadow: var(--shadow-sm);<br/>   transition: var(--transition-default);<br/>   border-top: 4px solid transparent; } .feature-card:hover {<br/>   box-shadow: var(--shadow-md);<br/>   transform: translateY(-8px);<br/>   border-top-color: var(--color-action-blue); } .feature-card-title {   color: var(--color-text-main);<br/>   font-size: 1.5rem;<br/>   font-weight: 700;<br/>   margin-bottom: 16px; } .feature-card-description {   color: var(--color-text-secondary);<br/>   line-height: 1.6; }
7. COMPONENTE PRICING
A estrutura de preços deve destacar o plano de maior valor percebido (Intermediário/Avançado) através de escala e sombras.
.pricing-grid {   display: grid;<br/>   grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));<br/>   gap: 32px; } .pricing-card {   background: #FFFFFF;<br/>   border-radius: var(--border-radius-lg);<br/>   padding: 40px;<br/>   border: 2px solid rgba(0,0,0,0.08);<br/>   transition: var(--transition-default); } .pricing-card.featured {   border-color: var(--color-action-blue);<br/>   box-shadow: 0 20px 50px rgba(0,86,179,0.15);<br/>   transform: scale(1.05);<br/>   z-index: 10; } .pricing-price {   color: var(--color-action-blue);<br/>   font-size: 2.5rem;<br/>   font-weight: 700; } .pricing-button {   width: 100%;<br/>   padding: 16px;<br/>   background-color: var(--color-action-blue);<br/>   color: #FFFFFF;<br/>   border: none;<br/>   border-radius: var(--border-radius-lg);<br/>   font-weight: 600;<br/>   cursor: pointer;<br/>   transition: var(--transition-default); } .pricing-button:hover {<br/>   background-color: #003D8F;<br/>   transform: translateY(-2px);<br/>   box-shadow: var(--shadow-md); }
8. COMPONENTE FOOTER
O rodapé deve utilizar a paleta escura para encerrar a página com contraste adequado para links de navegação secundários.
footer.main-footer {   background: linear-gradient(135deg, var(--color-primary-maritime), var(--color-bg-dark));<br/>   color: #FFFFFF;<br/>   padding: 60px 40px 20px; } .footer-section h3 {   color: #FFFFFF;<br/>   font-size: 1.25rem;<br/>   font-weight: 700;<br/>   margin-bottom: 16px; } .footer-section ul li a {   color: #E0E0E0;<br/>   text-decoration: none;<br/>   transition: var(--transition-default); } .footer-section ul li a:hover {<br/>   color: #FFFFFF;<br/>   padding-left: 4px; } .footer-social a {   width: 40px;<br/>   height: 40px;<br/>   background: rgba(255,255,255,0.15);<br/>   border-radius: 50%;<br/>   display: flex;<br/>   align-items: center;<br/>   justify-content: center;<br/>   color: #FFFFFF;<br/>   transition: var(--transition-default); } .footer-social a:hover {<br/>   background: var(--color-action-blue);<br/>   transform: translateY(-4px); }
9. ESTADOS INTERATIVOS GLOBAIS
Garantir que todos os elementos interativos possuam estados de foco e seleção claros para navegação via teclado.
*:focus-visible {<br/>   outline: 3px solid var(--color-action-blue);<br/>   outline-offset: 2px; } a {   color: var(--color-action-blue);<br/>   text-decoration: none;<br/>   transition: var(--transition-default); } a:hover {<br/>   color: var(--color-primary-maritime); } input, textarea, select {   border: 2px solid rgba(0,0,0,0.1);<br/>   border-radius: 8px;<br/>   padding: 12px 16px;<br/>   font-size: 1rem;<br/>   transition: var(--transition-default); } input:focus, textarea:focus, select:focus {<br/>   outline: none;<br/>   border-color: var(--color-action-blue);<br/>   box-shadow: 0 0 0 4px rgba(0,86,179,0.15); } ::selection {   background-color: var(--color-action-blue);<br/>   color: #FFFFFF; }
10. RESPONSIVIDADE - MEDIA QUERIES
Ajuste as escalas tipográficas e espaçamentos para garantir a usabilidade em dispositivos móveis e desktops de alta resolução.
/
Mobile First - Base
/ /
Estilos padrão de 320px+
/  /
Tablet - 768px+
/ @media (min-width: 768px) {   :root {     --font-size-h1: 2.8rem;<br/>     --font-size-h2: 2rem;   } }  /
Desktop - 1024px+
/ @media (min-width: 1024px) {   :root {     --font-size-h1: 3.5rem;<br/>     --font-size-h2: 2.5rem;   } }  /
Prefers Reduced Motion
/ @media (prefers-reduced-motion: reduce) {   * {     animation-duration: 0.01ms !important;<br/>     transition-duration: 0.01ms !important;   } }  /
Dark Mode Support
/ @media (prefers-color-scheme: dark) {   :root {     --color-bg-light: #1A1A1A;<br/>     --color-text-main: #F0F0F0;<br/>     --color-text-secondary: #B0B0B0;   } }
11. CHECKLIST IMPLEMENTAÇÃO ANTIGRAVITY
●	 Copiar variáveis :root para o arquivo de estilos globais.
●	 Implementar componente Hero com gradiente e text-shadow.
●	 Configurar Navigation como sticky com efeito de desfoque (backdrop-filter).
●	 Aplicar sombras e transições nos Feature Cards.
●	 Destacar o plano principal nos Pricing Cards.
●	 Validar contraste de cores no Footer (mínimo 4.5:1).
●	 Adicionar suporte a focus-visible em todos os botões e links.
●	 Testar responsividade em resoluções de 320px a 1440px.
●	 Verificar acessibilidade com leitores de tela e navegação por teclado.
●	 Otimizar performance (Lighthouse score > 90).
12. TROUBLESHOOTING
●	Text Shadow não renderiza em mobileCausa: Limitação de processamento em navegadores móveis antigos.
●	Solução: Utilizar filter: drop-shadow() como alternativa de renderização.
.hero-title {   filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
●	Backdrop-filter não funciona em SafariCausa: Falta de prefixo do fornecedor.
●	Solução: Adicionar -webkit-backdrop-filter.
●	Contraste WCAG AA falhaAção: Ajustar os códigos hexadecimais utilizando a ferramenta WebAIM Contrast Checker.
