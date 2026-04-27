import { useState, useEffect } from 'react';
import { 
  Shield, 
  Target, 
  UploadCloud, 
  Cpu, 
  MousePointer2, 
  FileCheck, 
  ArrowRight, 
  CheckCircle2,
  Menu,
  X,
  Plus
} from 'lucide-react';

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
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #00FFCC 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-navy/50 to-navy" />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${isScrolled ? 'bg-navy/80 backdrop-blur-xl border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-emerald to-cyan-neon rounded-lg shadow-neon flex items-center justify-center">
                <Plus className="text-navy w-7 h-7 font-black" />
             </div>
             <span className="text-xl font-montserrat font-black tracking-tighter uppercase italic">CargoDeck <span className="text-cyan-neon">Plan</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[11px] font-bold uppercase tracking-widest hover:text-cyan-neon transition-colors">Features</a>
            <a href="#process" className="text-[11px] font-bold uppercase tracking-widest hover:text-cyan-neon transition-colors">Operacional</a>
            <a href="#pricing" className="text-[11px] font-bold uppercase tracking-widest hover:text-cyan-neon transition-colors">Planos</a>
            <button 
              onClick={onEnterApp}
              className="px-6 py-2.5 bg-cyan-neon text-navy text-[11px] font-black uppercase tracking-widest rounded shadow-neon hover:scale-105 active:scale-95 transition-all"
            >
              Entrar no Terminal
            </button>
          </div>

          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Animated Scan Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-neon shadow-neon animate-scan-line z-10 opacity-30" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald/10 border border-emerald/30 rounded-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <div className="w-2 h-2 rounded-full bg-emerald-glow animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-glow">Sistema de Extração AVA Ativo</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-montserrat font-black tracking-tighter leading-[0.9] text-white uppercase mb-8">
            Domine a Logística <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald via-cyan-neon to-emerald-glow">De Convés com IA</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/60 font-medium leading-relaxed mb-12">
            O CargoDeck Plan automatiza a extração de manifestos e otimiza o espaço da sua embarcação em segundos. Menos erro humano, mais eficiência operacional.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button 
              onClick={onEnterApp}
              className="group relative px-10 py-5 bg-cyan-neon text-navy text-xs font-black uppercase tracking-[0.3em] rounded shadow-neon hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
            >
              Iniciar Teste Grátis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </button>
            <button className="px-10 py-5 bg-white/5 border-2 border-white/10 text-white text-xs font-black uppercase tracking-[0.3em] rounded hover:bg-white/10 transition-all">
              Agendar Demo
            </button>
          </div>
        </div>

        {/* 3D Grid Perspective Sub-visual */}
        <div className="absolute bottom-0 left-0 w-full h-1/2 [perspective:1000px] pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent z-10" />
          <div className="w-full h-full border-[1px] border-cyan-neon/20 origin-bottom [transform:rotateX(60deg)_scale(2.5)] bg-[linear-gradient(rgba(0,168,132,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,168,132,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 border-y border-white/5 bg-navy-dark relative z-20">
         <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
               <div className="space-y-2">
                  <p className="text-4xl font-black font-montserrat text-white tracking-tighter">90%</p>
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Redução de Digitação</p>
               </div>
               <div className="space-y-2">
                  <p className="text-4xl font-black font-montserrat text-cyan-neon tracking-tighter">ZERO</p>
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Erros Dimensionais</p>
               </div>
               <div className="space-y-2">
                  <p className="text-4xl font-black font-montserrat text-white tracking-tighter">{'<'} 5s</p>
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Tempo de Processamento</p>
               </div>
               <div className="space-y-2">
                  <p className="text-4xl font-black font-montserrat text-emerald-glow tracking-tighter">24/7</p>
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Disponibilidade Operacional</p>
               </div>
            </div>
         </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative z-20">
         <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-24">
             <h2 className="text-[10px] font-black text-cyan-neon uppercase tracking-[0.4em] mb-4">Núcleo Tecnológico</h2>
             <h3 className="text-4xl md:text-6xl font-montserrat font-black tracking-tighter text-white uppercase italic">Surgical Precision <br /> Planning</h3>
           </div>

           <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  icon: <Cpu className="w-8 h-8" />, 
                  title: "OCR Avançado AVA", 
                  desc: "Extração inteligente de Petrobras e TAGAZ Manifests com reconhecimento de pesos, dimensões e tipos de carga.",
                  color: "emerald"
                },
                { 
                  icon: <Shield className="w-8 h-8" />, 
                  title: "ISO 6346 Compliance", 
                  desc: "Validação automática de contêineres e códigos de carga conforme normas marítimas internacionais.",
                  color: "cyan-neon"
                },
                { 
                  icon: <Target className="w-8 h-8" />, 
                  title: "Cálculo de Lastro", 
                  desc: "Monitoramento em tempo real do centro de gravidade e distribuição de peso transversal entre BB/BE.",
                  color: "emerald"
                },
                { 
                  icon: <MousePointer2 className="w-8 h-8" />, 
                  title: "Fluid Drag & Drop", 
                  desc: "Interface tátil otimizada para tablets. Arraste do inventário para as baias com alinhamento magnético.",
                  color: "cyan-neon"
                },
                { 
                  icon: <UploadCloud className="w-8 h-8" />, 
                  title: "Cloud Sync Securo", 
                  desc: "Dados sincronizados via criptografia de ponta a ponta com acesso multi-equipe simultâneo.",
                  color: "emerald"
                },
                { 
                  icon: <FileCheck className="w-8 h-8" />, 
                  title: "Relatórios de Alta Densidade", 
                  desc: "Exporte manifestos de convés em PDF em conformidade com as exigências dos terminais portuários.",
                  color: "cyan-neon"
                }
              ].map((feature, i) => (
                <div key={i} className="group p-8 bg-navy-light/30 border-2 border-white/5 rounded-[2.5rem] hover:border-cyan-neon/30 hover:bg-navy-light/50 transition-all duration-500 hover:-translate-y-2 glass">
                  <div className={`p-4 bg-navy rounded-2xl w-fit mb-8 shadow-low group-hover:scale-110 transition-transform ${feature.color === 'emerald' ? 'text-emerald' : 'text-cyan-neon'}`}>
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight mb-4">{feature.title}</h4>
                  <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
           </div>
         </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-32 bg-navy-dark relative z-20">
         <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-20 items-center">
               <div className="space-y-12">
                  <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-emerald-glow uppercase tracking-[0.4em]">Protocolo Operacional</h2>
                    <h3 className="text-4xl md:text-6xl font-montserrat font-black tracking-tighter text-white uppercase italic">Zero para Plano em Segundos</h3>
                  </div>

                  <div className="space-y-10">
                    {[
                      { step: '01', title: 'Upload Inteligente', desc: 'Arraste seu PDF ou imagem do manifesto direto para o terminal.' },
                      { step: '02', title: 'Análise de Redes Neurais', desc: 'O motor AVA processa campos complexos e valida dados espaciais.' },
                      { step: '03', title: 'Otimização Espacial', desc: 'Arraste as cargas para as baias. O sistema avisa sobre colisões.' },
                      { step: '04', title: 'Emissão Certificada', desc: 'Gere o plano de convés final e assine digitalmente para despacho.' }
                    ].map((item, i) => (
                      <div key={i} className="flex gap-8 group">
                        <span className="text-3xl font-black font-montserrat text-transparent bg-clip-text bg-gradient-to-b from-white/20 to-transparent group-hover:from-cyan-neon/40 transition-all">{item.step}</span>
                        <div className="space-y-2">
                           <h5 className="text-lg font-black text-white uppercase tracking-tight">{item.title}</h5>
                           <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="relative">
                  <div className="absolute -inset-10 bg-cyan-neon/10 blur-[100px] rounded-full" />
                  <div className="relative bg-navy border-4 border-white/5 rounded-[3rem] p-4 shadow-high overflow-hidden group">
                     {/* Simulating App Screenshot with glass card overlay */}
                     <div className="aspect-[4/5] bg-navy-light rounded-[2.2rem] overflow-hidden relative">
                        <div className="absolute inset-x-8 top-8 bottom-8 border-2 border-emerald/20 border-dashed rounded-2xl flex flex-col items-center justify-center gap-6">
                           <UploadCloud size={64} className="text-emerald animate-bounce" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-emerald">Processando PDF...</p>
                        </div>
                        <div className="absolute bottom-8 right-8 w-48 p-4 bg-navy/90 backdrop-blur border border-white/10 rounded-2xl shadow-low animate-in slide-in-from-right duration-1000">
                           <div className="flex items-center gap-3 mb-2">
                              <div className="w-3 h-3 bg-cyan-neon rounded-full" />
                              <span className="text-[9px] font-black uppercase text-white">Carga Identificada</span>
                           </div>
                           <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full w-full bg-cyan-neon animate-in slide-in-from-left duration-1000" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative z-20">
         <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-24">
             <h2 className="text-[10px] font-black text-cyan-neon uppercase tracking-[0.4em] mb-4">Investimento Técnico</h2>
             <h3 className="text-4xl md:text-6xl font-montserrat font-black tracking-tighter text-white uppercase italic">Modelos de Licença</h3>
           </div>

           <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  name: "Industrial Free", 
                  price: "0", 
                  desc: "Ideal para operadores individuais testarem o motor AVA.",
                  features: ["1 Usuário", "10 Manifestos/mês", "Exportação PDF Standard", "Modo Offline Limitado"] 
                },
                { 
                  name: "Deck Master PRO", 
                  price: "199", 
                  desc: "Para embarcações de apoio e logística offshore crítica.",
                  features: ["Equipe de 5 Usuários", "Processamento Ilimitado", "Exportação de Alta Resolução", "Suporte 24/7 Prioritário", "Histórico Multianual"],
                  popular: true
                },
                { 
                  name: "Enterprise Fleet", 
                  price: "Custom", 
                  desc: "Solução robusta para frotas de grande escala.",
                  features: ["Usuários Ilimitados", "Integração via API", "Domínio Customizado", "Servidor Dedicado", "Treinamento Presencial"] 
                }
              ].map((plan, i) => (
                <div key={i} className={`relative p-12 rounded-[3rem] transition-all duration-500 overflow-hidden ${plan.popular ? 'bg-gradient-to-br from-navy-light to-navy border-4 border-cyan-neon shadow-neon scale-105 z-30' : 'bg-navy-light/40 border-2 border-white/5 hover:border-white/20'}`}>
                  {plan.popular && (
                    <div className="absolute top-8 right-[-35px] bg-cyan-neon text-navy font-black text-[9px] px-10 py-1 uppercase tracking-widest rotate-45 shadow-medium">
                      Popular
                    </div>
                  )}
                  <div className="space-y-8 h-full flex flex-col">
                    <div>
                      <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 ${plan.popular ? 'text-cyan-neon' : 'text-secondary'}`}>{plan.name}</h4>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black font-montserrat text-white">{plan.price === 'Custom' ? 'VOB' : `$${plan.price}`}</span>
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{plan.price === 'Custom' ? '' : '/mês'}</span>
                      </div>
                      <p className="mt-6 text-sm text-white/50 leading-relaxed">{plan.desc}</p>
                    </div>

                    <div className="flex-1 space-y-4 py-8 border-y border-white/10 my-8">
                       {plan.features.map((f, idx) => (
                         <div key={idx} className="flex items-center gap-3">
                            <CheckCircle2 size={16} className={plan.popular ? "text-cyan-neon" : "text-emerald"} />
                            <span className="text-xs font-bold text-white/80">{f}</span>
                         </div>
                       ))}
                    </div>

                    <button 
                      onClick={onEnterApp}
                      className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${plan.popular ? 'bg-cyan-neon text-navy shadow-neon hover:brightness-110 active:scale-95' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
                    >
                      Escolher Plano
                    </button>
                  </div>
                </div>
              ))}
           </div>
         </div>
      </section>

      {/* CTA Final */}
      <section className="py-32 relative overflow-hidden z-20">
         <div className="max-w-7xl mx-auto px-6">
            <div className="p-20 bg-gradient-to-br from-navy-light to-emerald-dark rounded-[4rem] border-2 border-emerald shadow-high relative overflow-hidden text-center">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,168,132,0.2),transparent)]" />
               <div className="relative z-10 space-y-10">
                  <h3 className="text-4xl md:text-7xl font-black font-montserrat text-white uppercase tracking-tighter leading-none italic">
                    Transforme seu Convés <br /> agora mesmo
                  </h3>
                  <p className="max-w-xl mx-auto text-white/60 font-medium">
                    Junte-se a centenas de operadores que já eliminaram o papel e escolheram a precisão cirúrgica do CargoDeck Plan.
                  </p>
                  <button 
                    onClick={onEnterApp}
                    className="px-12 py-6 bg-cyan-neon text-navy text-xs font-black uppercase tracking-[0.4em] rounded-full shadow-neon hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-4"
                  >
                    Acessar CargoDeck Plan Agora
                  </button>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-navy-dark relative z-20">
         <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between gap-20">
               <div className="space-y-6 max-w-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald to-cyan-neon rounded flex items-center justify-center">
                       <Plus className="text-navy w-5 h-5 font-black" />
                    </div>
                    <span className="text-lg font-montserrat font-black tracking-tighter uppercase italic text-white">CargoDeck <span className="text-cyan-neon">Plan</span></span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed uppercase font-bold tracking-widest">
                    Líder global em inteligência para logística de convés e planejamento offshore de alta fidelidade.
                  </p>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Produto</p>
                     <ul className="space-y-3">
                        <li><a href="#" className="text-xs font-bold text-white/60 hover:text-cyan-neon">Features</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/60 hover:text-cyan-neon">Manual OCR</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/60 hover:text-cyan-neon">Segurança</a></li>
                     </ul>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Suporte</p>
                     <ul className="space-y-3">
                        <li><a href="#" className="text-xs font-bold text-white/60 hover:text-cyan-neon">Ajuda</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/60 hover:text-cyan-neon">Documentação</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/60 hover:text-cyan-neon">Contato</a></li>
                     </ul>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Jurídico</p>
                     <ul className="space-y-3">
                        <li><a href="#" className="text-xs font-bold text-white/60 hover:text-cyan-neon">Privacidade</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/60 hover:text-cyan-neon">Termos</a></li>
                        <li><a href="#" className="text-xs font-bold text-white/60 hover:text-cyan-neon">Compliance</a></li>
                     </ul>
                  </div>
               </div>
            </div>
            
            <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
               <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">© 2026 CargoDeck Plan. Todos os direitos reservados.</p>
               <div className="flex gap-8">
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] cursor-pointer hover:text-emerald transition-colors">LinkedIn</span>
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] cursor-pointer hover:text-emerald transition-colors">Twitter</span>
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] cursor-pointer hover:text-emerald transition-colors">Vimeo</span>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}
