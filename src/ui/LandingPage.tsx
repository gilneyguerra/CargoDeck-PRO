import { useState, useEffect } from 'react';
import { 
  Shield, 
  Target, 
  Cpu, 
  MousePointer2, 
  ArrowRight, 
  CheckCircle2,
  Menu,
  X,
  Plus,
  Sparkles,
  Zap,
  BarChart3,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

      {/* Feature Section - Phase 2 Corrigida */}
      <section id="features" className="py-32 relative z-20 bg-white">
         <div className="max-w-7xl mx-auto px-6">
           <div className="flex flex-col items-center text-center mb-24 space-y-4">
             <div className="w-16 h-1 bg-maritime rounded-full" />
             <h2 className="text-xs font-black text-action uppercase tracking-[0.4em]">Arquitetura de Dados</h2>
             <h3 className="text-4xl md:text-6xl font-montserrat font-black tracking-tighter text-maritime uppercase italic">Tecnologia Certificada</h3>
           </div>

           <div className="grid md:grid-cols-3 gap-10">
              {[
                { 
                  icon: <Cpu className="w-8 h-8" />, 
                  title: "Extrator AVA V4", 
                  desc: "Reconhecimento avançado de tabelas e metadados em manifestos escaneados com rede neural proprietária.",
                  tag: "High Accuracy"
                },
                { 
                  icon: <Target className="w-8 h-8" />, 
                  title: "Validação ISO 6346", 
                  desc: "Verificação automática de padrões internacionais para contêineres e códigos de terminais portuários.",
                  tag: "Global Standard"
                },
                { 
                  icon: <Sparkles className="w-8 h-8" />, 
                  title: "Estabilidade em Tempo Real", 
                  desc: "Cálculo instantâneo de centro de gravidade e deslocamento lateral de carga para segurança operacional.",
                  tag: "Safety First"
                },
                { 
                  icon: <MousePointer2 className="w-8 h-8" />, 
                  title: "Drag & Drop Tátil", 
                  desc: "Sistema de alocação fluida com grids magnéticos e detecção automática de sobreposição de carga.",
                  tag: "Ultra Smooth"
                },
                { 
                  icon: <Shield className="w-8 h-8" />, 
                  title: "Segurança de Dados", 
                  desc: "Criptografia de nível militar para todos os seus manifestos e dados operacionais de logística.",
                  tag: "Full Encryption"
                },
                { 
                  icon: <BarChart3 className="w-8 h-8" />, 
                  title: "BI Logístico", 
                  desc: "Relatórios de ocupação de convés e eficiência de carga por navio, destino e período operacional.",
                  tag: "Deep Insight"
                }
              ].map((feature, i) => (
                <div key={i} className="group relative p-10 bg-white border border-black/5 rounded-[2rem] hover:border-t-action hover:border-t-4 hover:shadow-xl transition-all duration-500 hover:-translate-y-3">
                   <div className="absolute top-6 right-8 text-[8px] font-black uppercase tracking-widest text-maritime/30 transition-colors group-hover:text-action">
                      {feature.tag}
                   </div>
                  <div className="p-5 bg-maritime/5 border border-maritime/10 rounded-2xl w-fit mb-8 shadow-sm group-hover:bg-action group-hover:text-white transition-all text-maritime">
                    {feature.icon}
                  </div>
                  <h4 className="text-2xl font-black text-maritime uppercase tracking-tight mb-4 italic">{feature.title}</h4>
                  <p className="text-maritime/60 text-sm leading-relaxed font-medium">{feature.desc}</p>
                </div>
              ))}
           </div>
         </div>
      </section>

      {/* Motion Art 1 Showcase: OCR em Ação */}
      <section id="process" className="py-40 relative z-20 overflow-hidden bg-white">
         <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-24 items-center">
               <div className="space-y-12">
                  <div className="space-y-6">
                    <h2 className="text-xs font-black text-action uppercase tracking-[0.4em]">Operação Assistida</h2>
                    <h3 className="text-5xl md:text-7xl font-montserrat font-black tracking-tighter text-maritime uppercase italic leading-none">OCR <br /> Cirúrgico</h3>
                  </div>

                  <div className="space-y-12">
                    {[
                      { step: '01', title: 'Carregamento de Manifesto', desc: 'Arraste PDFs complexos Petrobras/TAGAZ para o terminal de leitura.' },
                      { step: '02', title: 'Scanning AVA', desc: 'A linha Cyan percorre o documento identificando campos espaciais.' },
                      { step: '03', title: 'Validação Digital', desc: 'O sistema valida pesos e dimensões contra o banco de dados global.' }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-10 group">
                        <div className="flex-shrink-0 w-16 h-16 bg-maritime/5 border-2 border-maritime/10 rounded-2xl flex items-center justify-center text-2xl font-black font-montserrat text-maritime/20 group-hover:text-action group-hover:border-action/30 transition-all duration-500">
                          {item.step}
                        </div>
                        <div className="space-y-2">
                           <h5 className="text-xl font-black text-maritime uppercase tracking-tight">{item.title}</h5>
                           <p className="text-maritime/40 text-sm leading-relaxed font-medium">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Simulated OCR Interface (Motion Art 1 Core) */}
               <div className="relative group">
                  <div className="absolute -inset-10 bg-action/10 blur-[120px] rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-1000" />
                  <div className="relative bg-maritime border-2 border-action/20 rounded-[3.5rem] p-8 shadow-2xl overflow-hidden aspect-[4/5] flex flex-col">
                     {/* Header Mockup */}
                     <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
                        <div className="flex gap-2">
                           <div className="w-3 h-3 rounded-full bg-red-500/30" />
                           <div className="w-3 h-3 rounded-full bg-yellow-500/30" />
                           <div className="w-3 h-3 rounded-full bg-green-500/30" />
                        </div>
                        <span className="text-[10px] font-black text-cyan-neon uppercase tracking-widest">Scanner Atividade</span>
                     </div>
                     
                     {/* OCR Scanning Area */}
                     <div className="flex-1 rounded-3xl bg-white/[0.02] border border-white/5 p-6 relative overflow-hidden">
                        {/* Simulation of a document with text lines */}
                        <div className="space-y-5 opacity-40">
                           <div className="h-4 w-3/4 bg-white/10 rounded" />
                           <div className="h-4 w-full bg-white/10 rounded" />
                           <div className="h-4 w-1/2 bg-white/10 rounded" />
                           <div className="h-4 w-2/3 bg-white/10 rounded" />
                           <div className="h-4 w-full bg-white/10 rounded" />
                           <div className="h-32 w-full border-2 border-action/20 border-dashed rounded-xl mt-10" />
                           <div className="h-4 w-3/4 bg-white/10 rounded" />
                           <div className="h-4 w-full bg-white/10 rounded" />
                        </div>

                        {/* The Scan Line Component */}
                        <div className="absolute top-0 left-0 w-full h-[4px] bg-cyan-neon shadow-neon animate-[scan_4s_ease-in-out_infinite] z-30" />

                        {/* OCR Revealed Fields - Motion Art 4 */}
                        <div className="absolute left-10 top-20 w-48 h-8 px-4 bg-action/20 border border-action rounded-lg flex items-center gap-3 animate-pulse opacity-0 [animation:fadeIn_1s_ease-in_forwards_2.5s]">
                           <Search className="w-3 h-3 text-cyan-neon" />
                           <span className="text-[9px] font-black text-white uppercase italic typewriter">Container ID: CX-204</span>
                        </div>
                        <div className="absolute right-10 top-64 w-40 h-8 px-4 bg-cyan-neon/20 border border-cyan-neon rounded-lg flex items-center gap-3 animate-pulse opacity-0 [animation:fadeIn_1s_ease-in_forwards_3.5s]">
                           <Zap className="w-3 h-3 text-cyan-neon" />
                           <span className="text-[9px] font-black text-white uppercase italic">Peso: 12,4 TN</span>
                        </div>
                     </div>
                  </div>
               </div>
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

      {/* Global CSS for Animations */}
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
        .typewriter {
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid #00D9FF;
          animation: typing 1.5s steps(20, end) infinite;
        }
        @keyframes typing {
          from { width: 0 }
          to { width: 100% }
        }
        .glass {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
