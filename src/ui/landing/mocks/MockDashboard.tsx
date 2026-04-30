import { Activity, Boxes, Scale, AlertOctagon } from 'lucide-react';
import { MockBrowserFrame } from '../MockBrowserFrame';
import { CountUp } from '../CountUp';

const KPI_CARDS = [
  {
    label: 'Cargas Alocadas',
    value: 12,
    suffix: '',
    decimals: 0,
    icon: <Boxes size={12} className="text-cyan-neon" />,
    accent: 'text-cyan-neon',
  },
  {
    label: 'Peso Total',
    value: 84.2,
    suffix: ' t',
    decimals: 1,
    icon: <Scale size={12} className="text-emerald-300" />,
    accent: 'text-emerald-300',
  },
  {
    label: 'Ocupação',
    value: 67,
    suffix: '%',
    decimals: 0,
    icon: <Activity size={12} className="text-amber-300" />,
    accent: 'text-amber-300',
  },
];

const SIDES = [
  { name: 'Bombordo', value: 28.4, percent: 34, color: 'bg-cyan-neon' },
  { name: 'Centro',   value: 22.6, percent: 27, color: 'bg-emerald-400' },
  { name: 'Boreste',  value: 33.2, percent: 39, color: 'bg-violet-400' },
];

export function MockDashboard() {
  return (
    <MockBrowserFrame title="Dashboard" aspect="aspect-[16/10]">
      <div className="absolute inset-0 p-4 flex flex-col gap-3 text-white/90">
        {/* Header */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-action/20 border border-action/30 flex items-center justify-center">
            <Activity size={14} className="text-cyan-neon" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Status Operacional</span>
          <span className="ml-auto flex items-center gap-1 text-[8px] font-mono text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ao vivo
          </span>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {KPI_CARDS.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg bg-white/5 border border-white/10 p-2 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                {kpi.icon}
                <span className="text-[7px] font-black uppercase tracking-widest text-white/40">
                  {kpi.label}
                </span>
              </div>
              <div className={`text-2xl font-montserrat font-black ${kpi.accent} leading-none tracking-tighter`}>
                <CountUp end={kpi.value} suffix={kpi.suffix} decimals={kpi.decimals} duration={1800} />
              </div>
            </div>
          ))}
        </div>

        {/* Distribuição transversal */}
        <div className="flex-1 flex flex-col gap-2 rounded-lg bg-white/[0.03] border border-white/10 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
              Divisão de Pesos · Equilíbrio Transversal
            </span>
            <span className="text-[8px] font-mono text-emerald-300">✓ Equilibrado</span>
          </div>

          {SIDES.map((side, i) => (
            <div key={side.name} className="space-y-1">
              <div className="flex items-center justify-between text-[8px]">
                <span className="font-black uppercase tracking-widest text-white/60">{side.name}</span>
                <span className="font-mono text-white/80">
                  <CountUp end={side.value} suffix=" t" decimals={1} duration={2000} /> · {side.percent}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full ${side.color} origin-left`}
                  style={{
                    width: `${side.percent}%`,
                    animation: `gauge-fill 1.6s ease-out forwards`,
                    animationDelay: `${0.2 + i * 0.2}s`,
                    transform: 'scaleX(0)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer alerta */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-400/30">
          <AlertOctagon size={11} className="text-fuchsia-300" />
          <span className="text-[8px] font-black uppercase tracking-widest text-fuchsia-200">
            1 carga perigosa identificada · segregação automática ativa
          </span>
        </div>
      </div>
    </MockBrowserFrame>
  );
}
