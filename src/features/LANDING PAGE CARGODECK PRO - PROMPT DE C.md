LANDING PAGE CARGODECK PRO - PROMPT DE CORREÇÃO E MOTION ARTSGuia Técnico de Refinamento Visual, UI/UX e Especificações de Animação27 de abril de 20261. Diagnóstico Visual dos Prints AtuaisApós a análise técnica dos 5 prints da landing page atual, identificamos falhas críticas que comprometem a conversão e a percepção de valor do produto. O documento abaixo detalha as correções necessárias para elevar o padrão visual ao nível Premium Enterprise.
Problema 1: Contraste insuficiente (ratio < 4.5:1), dificultando a leitura em ambientes com alta luminosidade.
Problema 2: Cores primárias apagadas ou desbotadas, perdendo a identidade visual da marca.
Problema 3: Falta de profundidade visual (ausência de shadows e gradientes), resultando em um design "flat" sem hierarquia.
Problema 4: CTAs invisíveis ou pouco destacados, reduzindo drasticamente a taxa de clique (CTR).
Problema 5: Ausência de imagens de contexto e motion arts, tornando a página estática e pouco informativa.
Problema 6: Tipografia com baixa legibilidade devido ao kerning e line-height inadequados.
2. Especificações de Cores CorrigidasA nova paleta deve ser aplicada com rigor para garantir a consistência visual e o apelo tecnológico do CargoDeck Pro.2.1 Cores Primárias
Navy Escuro: #0F1B2E (RGB 15, 27, 46) — Base principal, aumentar saturação para profundidade.
Emerald Verde: #10B981 (RGB 16, 185, 145) — Utilizar como cor de acento e sucesso.
Cyan Neon: #00D9FF (RGB 0, 217, 255) — Exclusivo para CTAs e elementos de interação com glow effect.
Silver Cinza: #E8EAED (RGB 232, 234, 237) — Texto secundário e bordas sutis.
2.2 Cores Secundárias e Neutras
Azul Profundo: #1E3A8A (Backgrounds de seção).
Verde Escuro: #047857 (Hover states de elementos Emerald).
Neon Roxa: #A855F7 (Highlights e detalhes de IA).
Neutras: Branco (#FFFFFF), Cinza Claro (#F3F4F6), Cinza Médio (#9CA3AF), Cinza Escuro (#374151), Preto (#111827).
3. Especificações Técnicas de ContrastePara atender aos padrões WCAG AA e AAA, as seguintes relações de contraste devem ser implementadas:
Hero Section: Contrast ratio 7:1 (Combinação Navy + Cyan).
Body Text: Contrast ratio 4.5:1 (Dark Gray sobre fundo White ou Light Gray).
CTAs: Contrast ratio 8:1 (Cyan Neon sobre Navy).
Técnicas: Utilizar mix-blend-mode para sobreposição de textos em imagens e backdrop-filter para legibilidade em elementos glassmorphism.
4. Roadmap de Correções VisuaisA implementação deve seguir o cronograma de 5 fases para garantir a integridade do deploy.
Fase 1 — Hero Section (Dia 1): Adicionar gradient overlay (Navy para Transparent), aumentar H1 para 4rem e aplicar glow effect no CTA principal.
Fase 2 — Feature Cards (Dia 2): Implementar Glassmorphism com blur de 10px, bordas em gradiente e elevação no hover.
Fase 3 — Demonstração Visual (Dia 3): Carousel de screenshots em alta resolução com badges de destaque em Cyan Neon.
Fase 4 — Seções Secundárias (Dia 4-5): Refinamento de pricing cards, depoimentos com avatares e FAQ animado.
Fase 5 — Motion Arts (Dia 6-7): Integração das 8 animações otimizadas em WebP com lazy loading.
5. Especificações Técnicas CSSOs blocos de código abaixo devem ser integrados ao arquivo de estilos global do projeto.5.1 Hero Section e Glow Effectcss123456789101112131415161718192021.hero-container {
  background: linear-gradient(135deg, #0F1B2E 0%, #1E3A8A 50%, #0F1B2E 100%);<br/>
  box-shadow: inset 0 0 60px rgba(0, 217, 255, 0.1);<br/>
  position: relative;<br/>
  overflow: hidden;
}

.btn-primary {
  background: #00D9FF;<br/>
  color: #0F1B2E;<br/>
  font-weight: 700;<br/>
  padding: 14px 32px;<br/>
  border-radius: 8px;<br/>
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.6), 0 0 40px rgba(0, 217, 255, 0.3);<br/>
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-primary:hover {<br/>
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.8), 0 0 60px rgba(0, 217, 255, 0.5);<br/>
  transform: translateY(-2px);
}5.2 Glassmorphism e Tipografiacss1234567891011121314151617.feature-card {
  background: rgba(255, 255, 255, 0.08);<br/>
  backdrop-filter: blur(10px);<br/>
  border: 1px solid rgba(16, 185, 145, 0.3);<br/>
  border-radius: 12px;<br/>
  padding: 24px;<br/>
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

h1 {
  font-size: 4rem;<br/>
  font-weight: 700;<br/>
  color: #FFFFFF;<br/>
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 217, 255, 0.3);<br/>
  letter-spacing: -1px;<br/>
  line-height: 1.2;
}6. Especificações Técnicas das 8 Motion ArtsAs animações devem ser produzidas seguindo rigorosamente os tempos e elementos descritos para garantir a fluidez da experiência.
Motion Art 1 — OCR em Ação: Scan lines horizontais percorrendo um PDF escaneado, revelando texto em Emerald Verde com efeito typewriter.
Motion Art 2 — Alocação no Deck: Grid de deck com containers coloridos se posicionando via drag animation com efeito de bounce e perspectiva 3D.
Motion Art 3 — Exportação de Relatórios: Ícone de relatório preenchendo gráficos de barra e tabelas, finalizando com checkmark de sucesso e confetti.
Motion Art 4 — Extração de Manifesto: Scanning line em Cyan percorrendo manifesto 3D, destacando campos de Origem e Destino com box highlights.
Motion Art 5 — Drag and Drop: Carga em hover movendo-se em curva de Bezier para nova posição, com atualização dinâmica de sombras.
Motion Art 6 — Cálculo de Estabilidade: Gráficos de balança oscilando conforme o peso aumenta, finalizando com o status "ESTÁVEL" em Emerald.
Motion Art 7 — Filtragem de Cargas: Lista de cargas sofrendo fade-out nos itens não correspondentes e destaque em Cyan nos itens filtrados.
Motion Art 8 — Checklist de Validação: Sequência de 5 checkmarks animados em Emerald, finalizando com celebração de "100% VÁLIDO".
7. Otimização de Performance e ImplementaçãoPara garantir um LCP (Largest Contentful Paint) inferior a 2.5s, as seguintes diretrizes devem ser seguidas:
Formatos: Utilizar WebP como formato principal e MP4 como fallback.
Compressão: Aplicar compressão via FFmpeg com -crf 28 para manter qualidade com baixo peso.
Lazy Loading: Implementar via Intersection Observer para carregar vídeos apenas quando entrarem na viewport.
Acessibilidade: Garantir que todos os elementos de motion possuam aria-label descritivo e respeitem a configuração prefers-reduced-motion.
8. Checklist de Implementação Final
 Verificar contraste mínimo de 4.5:1 em todos os textos.
 Validar glow effects em navegadores Safari e Firefox.
 Confirmar responsividade em breakpoints de 320px, 768px e 1440px.
 Testar navegação via teclado em todos os CTAs e formulários.
 Monitorar Core Web Vitals após o deploy das motion arts.
