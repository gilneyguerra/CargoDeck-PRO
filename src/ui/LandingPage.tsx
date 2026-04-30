import { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Plus,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeatureShowcase } from './landing/FeatureShowcase';
import { MockExcelImport } from './landing/mocks/MockExcelImport';
import { MockCargoGrid } from './landing/mocks/MockCargoGrid';
import { MockBatchMove } from './landing/mocks/MockBatchMove';
import { MockDragDrop } from './landing/mocks/MockDragDrop';
import { MockPdfExport } from './landing/mocks/MockPdfExport';
import { MockDashboard } from './landing/mocks/MockDashboard';

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-navy text-grey-50 font-sans selection:bg-cyan-neon selection:text-navy overflow-x-hidden">
      {/* Background Grid Pattern - Motion Art 2 & 5 context */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0, 217, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.2) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#111827_100%)]" />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-700 ${isScrolled ? 'bg-white/90 backdrop-blur-md border-b border-black/5 py-3 shadow-sm' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
             <div className="relative">
                <img 
                  src="/logo-premium.png" 
                  alt="CargoDeck Plan" 
                  className={cn(
                    "w-12 h-12 object-contain transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 rounded-xl",
                    isScrolled 
                      ? "mix-blend-multiply shadow-none" 
                      : "invert hue-rotate-180 brightness-150 drop-shadow-[0_0_15px_rgba(0,217,255,0.4)]"
                  )} 
                />
             </div>
             <span className={`text-2xl font-montserrat font-black tracking-tighter uppercase italic transition-colors ${isScrolled ? 'text-maritime' : 'text-white'}`}>CargoDeck <span className={isScrolled ? 'text-action' : 'text-cyan-neon'}>Plan</span></span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className={`text-xs font-bold uppercase tracking-widest transition-all relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-action after:transition-all hover:after:w-full ${isScrolled ? 'text-maritime/70 hover:text-maritime' : 'text-white/70 hover:text-white'}`}>Tecnologia</a>
            <a href="#process" className={`text-xs font-bold uppercase tracking-widest transition-all relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-action after:transition-all hover:after:w-full ${isScrolled ? 'text-maritime/70 hover:text-maritime' : 'text-white/70 hover:text-white'}`}>Fluxo AVA</a>
            <a href="#pricing" className={`text-xs font-bold uppercase tracking-widest transition-all relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-action after:transition-all hover:after:w-full ${isScrolled ? 'text-maritime/70 hover:text-maritime' : 'text-white/70 hover:text-white'}`}>Licenciamento</a>
            <button 
              onClick={onEnterApp}
              className={cn(
                "px-9 py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-500 shadow-xl transform hover:-translate-y-1.5 active:scale-95 flex items-center gap-3 text-white",
                isScrolled 
                  ? "bg-gradient-to-r from-brand-primary to-blue-600 shadow-brand-primary/25 hover:shadow-brand-primary/40" 
                  : "bg-gradient-to-r from-action to-cyan-500 shadow-cyan-neon/20 hover:shadow-cyan-neon/40 border border-white/20"
              )}
            >
              <Zap size={14} className="text-cyan-200" />
              Acessar Módulo
            </button>
          </div>

          <button className={`md:hidden ${isScrolled ? 'text-maritime' : 'text-white'}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Hero Section - Premium Enterprise Refinement */}
      <section className="relative min-h-[700px] flex items-center justify-center pt-28 overflow-hidden">
        {/* Motion Art 4 — Extração de Manifesto: Scanning line in Cyan */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-action shadow-[0_0_20px_#0056B3] animate-scan-line z-10 opacity-30" />
        
        {/* Section Gradient Background (Guia de Design) */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,20,40,0.92)_0%,rgba(0,51,102,0.85)_100%)] z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1590674033104-c1ce09ef9254?q=80&w=2070&auto=format&fit=crop')] bg-center bg-cover" />

        <div className="max-w-7xl mx-auto px-6 relative z-20 text-center space-y-12">
          <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full animate-in fade-in slide-in-from-bottom-8 duration-1000">
             <Sparkles className="w-3.5 h-3.5 text-cyan-neon animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Inteligência Artificial de Convés V2.4</span>
          </div>
          
          <h1 className="text-6xl md:text-[5.5rem] font-montserrat font-black tracking-tight leading-[1.1] text-white uppercase italic drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
            Logística de Carga <br />
            <span className="text-white">Instantânea e <span className="text-cyan-neon">Digital</span></span>
          </h1>
          
          <p className="max-w-3xl mx-auto text-xl md:text-2xl text-white/90 font-medium leading-relaxed tracking-tight">
            O CargoDeck Plan revoluciona o planejamento offshore transformando manifestos complexos em <span className="text-white font-black underline decoration-action decoration-4 underline-offset-8">planos de convés interativos</span> com precisão cirúrgica.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-6">
            <button 
              onClick={onEnterApp}
              className="group relative px-12 py-5 bg-action text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-xl shadow-lg hover:bg-action-dark hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-5"
            >
              Iniciar Operação Grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-3 transition-transform" />
            </button>
            <button className="px-12 py-5 bg-transparent border-2 border-white/30 text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-xl hover:bg-white hover:text-maritime hover:border-white transition-all duration-300">
              Agendar Demo Marítima
            </button>
          </div>
        </div>

        {/* 3D Grid Perspective Refined */}
        <div className="absolute bottom-0 left-0 w-full h-1/2 [perspective:2000px] pointer-events-none opacity-40">
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent z-10" />
          <div className="w-full h-full border-[10px] border-emerald/5 origin-bottom [transform:rotateX(65deg)_translateZ(0)_scale(2)] bg-[linear-gradient(rgba(0,217,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,217,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>
      </section>

      {/* Feature Showcase Grid — 6 mockups animados das features-chave */}
      <section id="features" className="py-32 relative z-20 bg-grey-50 overflow-hidden">
         {/* Pequenos detalhes de fundo */}
         <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-action/40 to-transparent" />
         <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-action/40 to-transparent" />

         <div className="max-w-7xl mx-auto px-6">
           {/* Header da seção */}
           <div className="flex flex-col items-center text-center mb-24 space-y-4">
             <div className="w-16 h-1 bg-action rounded-full" />
             <h2 className="text-xs font-black text-action uppercase tracking-[0.4em]">Experiência Operacional</h2>
             <h3 className="text-4xl md:text-6xl font-montserrat font-black tracking-tighter text-maritime uppercase italic max-w-4xl">
               Tudo que você opera, em <span className="text-action">6 cenas</span>
             </h3>
             <p className="max-w-2xl text-maritime/50 font-medium pt-4">
               Cada feature do CargoDeck Plan demonstrada no contexto real — manifesto, grid, plano de convés e relatório consolidado.
             </p>
           </div>

           {/* As 6 cenas — alternando esquerda/direita */}
           <div className="space-y-32 md:space-y-40">
             <FeatureShowcase
               index={1}
               direction="lr"
               eyebrow="Extração Inteligente"
               title="Manifesto em segundos, não horas"
               description="Cole um PDF ou suba um Excel. A IA multi-modelo (OpenCode Zen) reconhece embarcação, atendimento, roteiro e cada carga — com pesos, dimensões e códigos ISO 6346 validados automaticamente."
               bullets={[
                 'Suporte a PDF escaneado (Tesseract OCR) e planilhas Excel/CSV nativas',
                 'Detecção de duplicatas via hash SHA-256 antes de importar',
                 'Validação de schema com Zod — campos faltantes viram alertas, não erros',
                 'Roteador multi-modelo: extração robusta com fallback em 3 níveis',
               ]}
               mockLabel="Demonstração: importação de manifesto Excel com cargas extraídas via IA"
               mock={<MockExcelImport />}
             />

             <FeatureShowcase
               index={2}
               direction="rl"
               eyebrow="Inventário Visual"
               title="Grid responsivo com filtros dinâmicos"
               description="Cargas não alocadas em cards proporcionais — largura×altura refletindo dimensões reais. Filtros por categoria nascem automaticamente do que você importa, e cargas perigosas ganham destaque pulsante imediato."
               bullets={[
                 'Tabs dinâmicas por categoria (Contentores, Cestas, Tubulares, Perigosas…)',
                 'Busca instantânea (useDeferredValue) por ID, descrição, manifesto ou destino',
                 'Cards proporcionais ao tamanho real da carga (L×A em metros)',
                 'Hazmat com borda roxa pulsante e badge de identificação imediata',
               ]}
               mockLabel="Demonstração: grid de cargas com filtros dinâmicos e identificação de carga perigosa"
               mock={<MockCargoGrid />}
             />

             <FeatureShowcase
               index={3}
               direction="lr"
               eyebrow="Operação em Lote"
               title="Movimentação em grupo com 1 clique"
               description="Selecione múltiplas cargas e mova todas para uma baia, distribua entre bordos ou aplique prioridade — sem fricção. A barra de ação aparece quando há seleção e some quando não há, mantendo a tela limpa."
               bullets={[
                 'Selecionar tudo / inverter / limpar — atalhos contextuais',
                 'Distribuição por bordo: Bombordo / Centro / Boreste em uma única ação',
                 'Indicador transversal recalcula em tempo real durante a operação',
                 'Operador decide — o app nunca bloqueia movimentação por critério automático',
               ]}
               mockLabel="Demonstração: seleção múltipla de cargas e movimentação em lote para destino"
               mock={<MockBatchMove />}
             />

             <FeatureShowcase
               index={4}
               direction="rl"
               eyebrow="Plano de Convés"
               title="Drag & drop direto na baia certa"
               description="Cargas aparecem no convés respeitando dimensões reais. Arraste uma carga e o destino válido brilha. Solte e a baia atualiza ocupação, peso e equilíbrio automaticamente — tudo em 60fps com @dnd-kit."
               bullets={[
                 'Visualização proporcional: container 20" não vira a mesma silhueta de um skid',
                 'Highlight da baia destino com glow cyan durante o arraste',
                 'Indicador de ocupação por baia (% peso máximo) sempre visível',
                 'Suporte a múltiplos conveses (Main Deck, Riser Deck, conforme a unidade)',
               ]}
               mockLabel="Demonstração: arrastar uma carga da lista até a baia destino no plano de convés"
               mock={<MockDragDrop />}
             />

             <FeatureShowcase
               index={5}
               direction="lr"
               eyebrow="Entrega Operacional"
               title="PDF consolidado pronto para o turno"
               description="Um clique gera o Plano de Carga assinado, com logo, atendimento, todas as baias e cargas alocadas, peso por convés e linha de assinatura. Lazy-loaded — só baixa o jspdf quando você realmente exporta."
               bullets={[
                 'Logo + assinatura customizáveis em Configurar Relatório',
                 'Layout A4 paisagem com cabeçalho operacional e rodapé com responsável',
                 'Cores por categoria (CONTAINER laranja, HAZARDOUS vermelho, etc.)',
                 'Exportação alternativa em CSV para integração com ERP',
               ]}
               mockLabel="Demonstração: relatório PDF sendo gerado linha a linha com cabeçalho e baias"
               mock={<MockPdfExport />}
             />

             <FeatureShowcase
               index={6}
               direction="rl"
               eyebrow="Telemetria em Tempo Real"
               title="Dashboard com equilíbrio transversal"
               description="Cargas alocadas, peso total, ocupação e a divisão de pesos Bombordo / Centro / Boreste — atualizados a cada movimentação. Indicador apenas informativo: a decisão final fica sempre com o operador."
               bullets={[
                 'KPIs ao vivo: total de cargas, tonelagem alocada, % ocupação',
                 'Gauge transversal: 3 barras coloridas com soma por bordo',
                 'Identificação automática de hazmat para segregação visual',
                 'Histórico de erros (errorReporter) com sugestões acionáveis',
               ]}
               mockLabel="Demonstração: dashboard com KPIs animados e gauge de equilíbrio transversal"
               mock={<MockDashboard />}
             />
           </div>
         </div>
      </section>

      {/* Pricing - Enterprise Grade */}
      <section id="pricing" className="py-40 relative z-20 bg-grey-50">
         <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-32 space-y-6">
             <h3 className="text-5xl md:text-[6rem] font-montserrat font-black tracking-[-0.04em] text-maritime uppercase italic">Modelos Escalonáveis</h3>
             <p className="max-w-2xl mx-auto text-maritime/40 font-medium">Transparência total para frotas offshore e operadores logísticos globais.</p>
           </div>

           <div className="grid md:grid-cols-3 gap-12">
              {[
                { 
                  name: "Industrial Lite", price: "0", 
                  features: ["1 Operador", "5 Manifestos AVA /mês", "Exportação PDF Standard", "Cloud Sync Essentials"] 
                },
                { 
                  name: "Deck Pro Fleet", price: "249", popular: true,
                  features: ["5 Operadores Inclusos", "OCR Ilimitado", "Exportação HD + Custom", "Módulo de Estabilidade", "Suporte 1h Response"] 
                },
                { 
                  name: "Enterprise Hub", price: "Custom", 
                  features: ["Equipe Ilimitada", "API de Integração", "Servidor Seguro Local", "Treinamento Técnico", "SLA Garantido"] 
                }
              ].map((plan, i) => (
                <div key={i} className={`relative p-16 rounded-[4rem] transition-all duration-700 bg-white border ${plan.popular ? 'border-action shadow-2xl scale-105 z-30' : 'border-black/5 hover:border-black/10'}`}>
                  {plan.popular && (
                    <div className="absolute top-10 right-[-45px] bg-action text-white font-black text-[10px] px-12 py-1.5 uppercase tracking-widest rotate-45">
                      Top Choice
                    </div>
                  )}
                  <div className="space-y-12 h-full flex flex-col">
                    <div>
                      <h4 className={`text-[11px] font-black uppercase tracking-[0.4em] mb-6 ${plan.popular ? 'text-action' : 'text-maritime/40'}`}>{plan.name}</h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black font-montserrat text-maritime">{plan.price === 'Custom' ? 'VOB' : `$${plan.price}`}</span>
                        <span className="text-xs font-black text-maritime/30 uppercase tracking-[0.2em]">{plan.price === 'Custom' ? '' : '/NAVIO'}</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-6 py-12 border-y border-black/5">
                       {plan.features.map((f, idx) => (
                         <div key={idx} className="flex items-center gap-4">
                            <CheckCircle2 size={18} className={plan.popular ? "text-action" : "text-maritime/30"} />
                            <span className="text-sm font-bold text-maritime/70 uppercase tracking-tight">{f}</span>
                         </div>
                       ))}
                    </div>

                    <button 
                      onClick={onEnterApp}
                      className={`w-full py-6 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all duration-300 ${plan.popular ? 'bg-action text-white shadow-lg hover:bg-action-dark hover:scale-105 active:scale-95' : 'bg-grey-50 text-maritime border border-black/5 hover:bg-black/5'}`}
                    >
                      Selecionar Estratégia
                    </button>
                  </div>
                </div>
              ))}
           </div>
         </div>
      </section>

      {/* Footer Industrial - Maritime Refined */}
      <footer className="py-32 border-t border-black/5 bg-[linear-gradient(135deg,var(--color-primary-maritime),var(--color-bg-dark))] text-white relative z-20">
         <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-32 mb-32">
               <div className="space-y-8 max-w-md">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-action rounded-lg shadow-lg flex items-center justify-center">
                       <Plus className="text-white w-6 h-6 font-black" />
                    </div>
                    <span className="text-2xl font-montserrat font-black tracking-tighter uppercase italic text-white">CargoDeck <span className="text-cyan-neon">Plan</span></span>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed font-medium">
                    A plataforma líder em engenharia de convés offshore. Precisão cirúrgica para as operações logísticas mais exigentes do setor de Óleo e Gás.
                  </p>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-24">
                  <div className="space-y-8">
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Plataforma</p>
                     <ul className="space-y-4">
                        <li><a href="#" className="text-xs font-bold text-white/70 hover:text-white hover:pl-1 transition-all">Segurança AVA</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/70 hover:text-white hover:pl-1 transition-all">API Dev</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/70 hover:text-white hover:pl-1 transition-all">Nodes Locais</a></li>
                     </ul>
                  </div>
                  <div className="space-y-8">
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Marítimo</p>
                     <ul className="space-y-4">
                        <li><a href="#" className="text-xs font-bold text-white/70 hover:text-white hover:pl-1 transition-all">Termos Marítimos</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/70 hover:text-white hover:pl-1 transition-all">Compliance ISO</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/70 hover:text-white hover:pl-1 transition-all">Ship Tracking</a></li>
                     </ul>
                  </div>
                  <div className="space-y-8">
                     <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Corporação</p>
                     <ul className="space-y-4">
                        <li><a href="#" className="text-xs font-bold text-white/70 hover:text-white hover:pl-1 transition-all">Sobre Nós</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/70 hover:text-white hover:pl-1 transition-all">Sala de Imprensa</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/70 hover:text-white hover:pl-1 transition-all">Vagas Tech</a></li>
                     </ul>
                  </div>
               </div>
            </div>
            
            <div className="pt-16 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-10">
               <div className="flex gap-10">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white cursor-pointer transition-colors">LinkedIn</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white cursor-pointer transition-colors">Medium</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white cursor-pointer transition-colors">GitHub</span>
               </div>
               <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">© 2026 CargoDeck Plan Labs. Patentes em registro.</p>
            </div>
         </div>
      </footer>

      {/* Global CSS — animações do hero + showcase mocks */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(500px); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .glass {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        /* ───── MockExcelImport ───── */
        @keyframes cursor-excel-flow {
          0%   { top: 6%; left: 4%; opacity: 0; transform: scale(1); }
          8%   { top: 6%; left: 4%; opacity: 1; transform: scale(1); }
          22%  { top: 12%; left: 78%; opacity: 1; transform: scale(1); }
          28%  { top: 12%; left: 78%; opacity: 1; transform: scale(0.82); }
          33%  { top: 12%; left: 78%; opacity: 1; transform: scale(1); }
          70%  { top: 12%; left: 78%; opacity: 1; transform: scale(1); }
          88%  { top: 6%; left: 4%; opacity: 0.3; transform: scale(1); }
          100% { top: 6%; left: 4%; opacity: 0; transform: scale(1); }
        }
        @keyframes excel-btn-pulse {
          0%, 20%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
          25%           { box-shadow: 0 0 0 6px rgba(16,185,129,0.5); }
          35%           { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        @keyframes card-row-in {
          0%, 25% { opacity: 0; transform: translateY(8px); }
          35%     { opacity: 1; transform: translateY(0); }
          90%     { opacity: 1; transform: translateY(0); }
          100%    { opacity: 0; transform: translateY(8px); }
        }
        @keyframes banner-in {
          0%, 60% { opacity: 0; transform: translateY(8px); }
          70%     { opacity: 1; transform: translateY(0); }
          92%     { opacity: 1; transform: translateY(0); }
          100%    { opacity: 0; transform: translateY(8px); }
        }

        /* ───── MockCargoGrid ───── */
        @keyframes pulse-hazard {
          0%, 100% {
            border-color: rgba(232,121,249,0.3);
            box-shadow: 0 0 0 0 rgba(232,121,249,0);
          }
          50% {
            border-color: rgba(232,121,249,0.7);
            box-shadow: 0 0 12px 2px rgba(232,121,249,0.35);
          }
        }

        /* ───── MockBatchMove ───── */
        @keyframes action-bar-slide-in {
          0%, 35% { opacity: 0; transform: translateX(20px); }
          50%     { opacity: 1; transform: translateX(0); }
          92%     { opacity: 1; transform: translateX(0); }
          100%    { opacity: 0; transform: translateX(20px); }
        }
        @keyframes row-select {
          0%, 15% { background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
          25%     { background-color: rgba(0,217,255,0.08); border-color: rgba(0,217,255,0.3); }
          92%     { background-color: rgba(0,217,255,0.08); border-color: rgba(0,217,255,0.3); }
          100%    { background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
        }
        @keyframes check-pop {
          0%, 15% { opacity: 0; transform: scale(0.5); }
          22%     { opacity: 1; transform: scale(1.15); }
          28%     { opacity: 1; transform: scale(1); }
          92%     { opacity: 1; transform: scale(1); }
          100%    { opacity: 0; transform: scale(0.5); }
        }
        @keyframes destination-in {
          0%, 60% { opacity: 0; transform: translateY(6px); }
          70%     { opacity: 1; transform: translateY(0); }
          92%     { opacity: 1; transform: translateY(0); }
          100%    { opacity: 0; transform: translateY(6px); }
        }

        /* ───── MockDragDrop ───── */
        @keyframes card-source-pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(0,217,255,0.3); }
          50%      { box-shadow: 0 0 20px rgba(0,217,255,0.5); }
        }
        @keyframes bay-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
          50%      { box-shadow: 0 0 18px 4px rgba(52,211,153,0.45); }
        }
        @keyframes drag-cursor-flow {
          0%   { top: 28%; left: 6%; opacity: 0; }
          8%   { top: 28%; left: 6%; opacity: 1; }
          25%  { top: 30%; left: 22%; opacity: 1; }
          50%  { top: 38%; left: 60%; opacity: 1; }
          70%  { top: 50%; left: 72%; opacity: 1; }
          80%  { top: 50%; left: 72%; opacity: 1; transform: scale(0.92); }
          85%  { top: 50%; left: 72%; opacity: 0.7; transform: scale(1); }
          100% { top: 28%; left: 6%; opacity: 0; transform: scale(1); }
        }

        /* ───── MockPdfExport ───── */
        @keyframes btn-download-pulse {
          0%, 100% { box-shadow: 0 8px 16px -4px rgba(16,185,129,0.4); transform: translateY(0); }
          50%      { box-shadow: 0 12px 24px -4px rgba(16,185,129,0.6); transform: translateY(-2px); }
        }
        @keyframes paper-line {
          0%, 5%   { transform: scaleY(0); }
          15%      { transform: scaleY(1); }
          92%      { transform: scaleY(1); }
          100%     { transform: scaleY(0); }
        }
        @keyframes paper-line-h {
          0%, 5%   { transform: scaleX(0); }
          15%      { transform: scaleX(1); }
          92%      { transform: scaleX(1); }
          100%     { transform: scaleX(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ───── MockDashboard ───── */
        @keyframes gauge-fill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        /* ───── prefers-reduced-motion ───── */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
