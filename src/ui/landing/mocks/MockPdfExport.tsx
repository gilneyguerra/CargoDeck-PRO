import { FileText, Download, CheckCircle2 } from 'lucide-react';
import { MockBrowserFrame } from '../MockBrowserFrame';

export function MockPdfExport() {
  return (
    <MockBrowserFrame title="Relatório PDF" aspect="aspect-[16/10]">
      <div className="absolute inset-0 p-4 flex gap-3 text-white/90">
        {/* Sidebar com botão Download */}
        <div className="w-32 shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <FileText size={12} className="text-cyan-neon" />
            <span className="text-[10px] font-black uppercase tracking-widest">PDF</span>
          </div>

          <span className="text-[8px] text-white/40 font-mono">Plano_de_Carga.pdf</span>

          <div
            className="mt-auto px-3 py-2 rounded-lg bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-500/30"
            style={{ animation: 'btn-download-pulse 4s ease-in-out infinite' }}
          >
            <Download size={11} />
            <span className="text-[9px] font-black uppercase tracking-widest">Baixar</span>
          </div>

          <div
            className="flex items-center gap-1 text-[8px] text-emerald-300 font-mono opacity-0"
            style={{
              animation: 'fade-in 0.6s ease-out forwards',
              animationDelay: '5.5s',
              animationIterationCount: 'infinite',
              animationDuration: '8s',
            }}
          >
            <CheckCircle2 size={9} />
            Gerado em 1.2s
          </div>
        </div>

        {/* Página A4 sendo desenhada */}
        <div className="flex-1 bg-white rounded-md p-3 flex flex-col gap-2 shadow-2xl text-[#0f172a] relative overflow-hidden">
          {/* Header com fundo escuro */}
          <div
            className="rounded-sm bg-[#1e293b] text-white px-3 py-2 flex items-center justify-between origin-top scale-y-0"
            style={{
              animation: 'paper-line 0.5s ease-out forwards',
              animationDelay: '0.4s',
              animationIterationCount: 'infinite',
              animationDuration: '8s',
            }}
          >
            <div className="space-y-0.5">
              <span className="block text-[8px] font-black uppercase tracking-widest">Plano de Carga Consolidado</span>
              <span className="block text-[6px] text-white/60 font-mono">UNIDADE: NAVIO ALPHA</span>
            </div>
            <span className="text-[6px] text-cyan-neon font-mono">N° 509442732</span>
          </div>

          {/* Sumário row */}
          <div
            className="rounded-sm bg-blue-50 px-2 py-1 origin-left scale-x-0"
            style={{
              animation: 'paper-line-h 0.4s ease-out forwards',
              animationDelay: '1.2s',
              animationIterationCount: 'infinite',
              animationDuration: '8s',
            }}
          >
            <span className="text-[7px] font-black uppercase tracking-widest text-[#1e293b]">
              RESUMO: 12 carga(s) | 84.2 t
            </span>
          </div>

          {/* Bay headers + rows */}
          {[
            { name: 'Convés Principal', tonnage: '52.4 t', delay: 1.7 },
            { name: 'Riser Deck',       tonnage: '31.8 t', delay: 3.2 },
          ].map((bay) => (
            <div key={bay.name} className="space-y-1">
              <div
                className="rounded-sm bg-[#1e293b]/80 px-2 py-1 flex items-center justify-between origin-left scale-x-0"
                style={{
                  animation: 'paper-line-h 0.4s ease-out forwards',
                  animationDelay: `${bay.delay}s`,
                  animationIterationCount: 'infinite',
                  animationDuration: '8s',
                }}
              >
                <span className="text-[7px] font-black uppercase tracking-widest text-white">{bay.name}</span>
                <span className="text-[6px] text-cyan-neon font-mono">{bay.tonnage}</span>
              </div>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 origin-left scale-x-0"
                  style={{
                    animation: 'paper-line-h 0.3s ease-out forwards',
                    animationDelay: `${bay.delay + 0.2 + i * 0.15}s`,
                    animationIterationCount: 'infinite',
                    animationDuration: '8s',
                  }}
                >
                  <span className="h-1 flex-1 bg-[#1e293b]/10 rounded-sm" />
                  <span className="h-1 w-12 bg-[#1e293b]/20 rounded-sm" />
                </div>
              ))}
            </div>
          ))}

          {/* Footer assinatura */}
          <div
            className="mt-auto pt-1 border-t border-[#1e293b]/10 flex items-center justify-center origin-bottom scale-y-0"
            style={{
              animation: 'paper-line 0.4s ease-out forwards',
              animationDelay: '6s',
              animationIterationCount: 'infinite',
              animationDuration: '8s',
            }}
          >
            <span className="text-[6px] font-black uppercase tracking-widest text-[#1e293b]/60">
              Responsável Operacional
            </span>
          </div>
        </div>
      </div>
    </MockBrowserFrame>
  );
}
