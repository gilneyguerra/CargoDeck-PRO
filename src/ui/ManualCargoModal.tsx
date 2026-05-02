import { useState, useId, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useCargoStore } from '@/features/cargoStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { X, Box, Settings, Palette, Info, Layers, MapPin, AlertTriangle, FolderOpen, Building2, ChevronDown, Check } from 'lucide-react';
import { canHoldItems, type CargoCategory } from '@/domain/Cargo';
import { CargoPreview } from './CargoPreview';
import { cn } from '@/lib/utils';

// Categorias padrão sugeridas; usuário pode digitar qualquer string livre
const CATEGORY_SUGGESTIONS: { value: CargoCategory; label: string }[] = [
  { value: 'GENERAL',    label: 'Geral' },
  { value: 'CONTAINER',  label: 'Container' },
  { value: 'BASKET',     label: 'Cesta' },
  { value: 'TUBULAR',    label: 'Tubular' },
  { value: 'EQUIPMENT',  label: 'Equipamento' },
  { value: 'HAZARDOUS',  label: 'Perigoso (Hazardous)' },
  { value: 'HEAVY',      label: 'Pesado' },
  { value: 'FRAGILE',    label: 'Frágil' },
  { value: 'OTHER',      label: 'Outros' },
];

/** Paleta de cores para identificação visual da carga. Cobre o ciclo
 *  cromático principal + tons industriais maritime. Cada cor tem nome
 *  acessível em pt-BR. Renderizada em grid 4×N no popover, com chip
 *  preview ao lado de cada nome. */
const COLOR_PALETTE: { hex: string; label: string }[] = [
  { hex: '#3b82f6', label: 'Azul Marítimo' },
  { hex: '#0ea5e9', label: 'Ciano Tropical' },
  { hex: '#14b8a6', label: 'Teal Profundo' },
  { hex: '#10b981', label: 'Verde Segurança' },
  { hex: '#84cc16', label: 'Lima Sinalização' },
  { hex: '#eab308', label: 'Amarelo Atenção' },
  { hex: '#f59e0b', label: 'Âmbar Atenção' },
  { hex: '#f97316', label: 'Laranja Resgate' },
  { hex: '#ef4444', label: 'Vermelho Crítico' },
  { hex: '#dc2626', label: 'Vermelho Sinal' },
  { hex: '#ec4899', label: 'Rosa Identificação' },
  { hex: '#a855f7', label: 'Roxo Especial' },
  { hex: '#8b5cf6', label: 'Violeta Náutico' },
  { hex: '#6366f1', label: 'Índigo Corporativo' },
  { hex: '#1e293b', label: 'Preto Naval' },
  { hex: '#6b7280', label: 'Cinza Industrial' },
  { hex: '#92400e', label: 'Marrom Couro' },
  { hex: '#f1f5f9', label: 'Branco Gelo' },
];

export function ManualCargoModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addManualCargo } = useCargoStore();
  const titleId = useId();
  const containerRef = useFocusTrap<HTMLDivElement>({ isActive: isOpen, onEscape: onClose });

  const [description, setDescription] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [weightTonnes, setWeightTonnes] = useState('');
  const [lengthMeters, setLengthMeters] = useState('');
  const [widthMeters, setWidthMeters] = useState('');
  const [heightMeters, setHeightMeters] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState<CargoCategory>('GENERAL');
  /** Nome custom quando o usuário escolhe a opção 'OTHER' — fica como
   *  o valor final de cargo.category (string livre) no payload. Permite
   *  categorias além das 9 fixas do enum. */
  const [categoryCustomName, setCategoryCustomName] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isHazardous, setIsHazardous] = useState(false);
  const [observations, setObservations] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [format, setFormat] = useState<'Retangular' | 'Quadrado' | 'Tubular'>('Retangular');
  // undefined = "siga o default da categoria"; true/false = override explícito.
  const [holdsItems, setHoldsItems] = useState<boolean | undefined>(undefined);

  // Resolve o estado efetivo do switch para a UI: respeita override do
  // usuário, senão cai no default conservador por categoria.
  const effectiveHoldsItems = canHoldItems({ holdsItems, category });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightTonnes);
    const l = parseFloat(lengthMeters);
    const wi = parseFloat(widthMeters);
    const h = parseFloat(heightMeters) || 1;

    if (isNaN(w) || isNaN(l) || isNaN(wi)) return;

    // Se categoria for HAZARDOUS, garantir flag isHazardous=true (e vice-versa: SIM ⇒ HAZARDOUS).
    // Se for OTHER e o usuário digitou um nome custom, usa ele em vez de 'OTHER'.
    let finalCategory: CargoCategory = isHazardous ? 'HAZARDOUS' : category;
    if (!isHazardous && category === 'OTHER' && categoryCustomName.trim()) {
      // O tipo Cargo.category aceita string em runtime — TS não estreita aqui
      // pois CargoCategory é union literal; cast preserva a intenção.
      finalCategory = categoryCustomName.trim() as CargoCategory;
    }
    const finalIsHazardous = isHazardous || category === 'HAZARDOUS';

    addManualCargo({
      description: description.trim(),
      identifier: identifier.trim(),
      weightTonnes: w,
      lengthMeters: l,
      widthMeters: wi,
      heightMeters: h,
      quantity,
      category: finalCategory,
      isHazardous: finalIsHazardous,
      origemCarga: origin.trim() || undefined,
      destinoCarga: destination.trim() || undefined,
      observations: observations.trim() || undefined,
      color: finalIsHazardous ? '#a855f7' : color, // perigosa: roxo
      format,
      holdsItems,
      empresa: empresa.trim() || undefined,
    });

    setDescription(''); setIdentifier(''); setWeightTonnes(''); setLengthMeters('');
    setWidthMeters(''); setHeightMeters(''); setQuantity(1); setCategory('GENERAL');
    setCategoryCustomName('');
    setOrigin(''); setDestination(''); setIsHazardous(false); setFormat('Retangular');
    setHoldsItems(undefined); setEmpresa('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-main border-2 border-subtle rounded-[2.5rem] w-full max-w-2xl shadow-high relative max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-indigo-500 to-brand-primary z-50" />

        {/* Cabeçalho */}
        <div className="px-8 pt-10 pb-8 border-b border-subtle shrink-0">
          <button onClick={onClose} className="btn-close" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col gap-2">
            <h2 id={titleId} className="text-3xl font-black text-primary tracking-tighter uppercase leading-none">Nova Carga Manual</h2>
            <p className="text-[10px] font-black text-secondary uppercase tracking-[0.4em] opacity-90">Cadastro de Carga no Inventário</p>
          </div>
        </div>

        {/* Conteúdo do Formulário */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-10">
          <form id="manual-cargo-form" onSubmit={handleSubmit} className="space-y-8">

            {/* Descrição e ID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.15em] ml-1">
                  <Box size={14} className="text-brand-primary" /> Descrição Comercial
                </label>
                <input
                  type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ex.: BOMBA CENTRÍFUGA SECUNDÁRIA"
                  className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/50"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.15em] ml-1">TAG / Identificador</label>
                <input
                  type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                  placeholder="TAG-990"
                  className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-4 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/50"
                  required
                />
              </div>
            </div>

            {/* Especificações Físicas */}
            <div className="bg-sidebar/30 p-8 rounded-[2rem] border-2 border-subtle shadow-inner">
              <label className="flex items-center gap-2 text-[11px] font-black text-primary uppercase tracking-widest mb-6 border-b border-subtle pb-3">
                <Settings size={14} className="text-brand-primary" /> Especificações Técnicas
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-muted uppercase tracking-widest ml-1">Peso (Ton)</label>
                  <input
                    type="number" step="0.001" value={weightTonnes} onChange={e => setWeightTonnes(e.target.value)}
                    className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-muted uppercase tracking-widest ml-1">Comprimento (m)</label>
                  <input
                    type="number" step="0.01" value={lengthMeters} onChange={e => setLengthMeters(e.target.value)}
                    className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-muted uppercase tracking-widest ml-1">Largura (m)</label>
                  <input
                    type="number" step="0.01" value={widthMeters} onChange={e => setWidthMeters(e.target.value)}
                    className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-muted uppercase tracking-widest ml-1">Altura (m)</label>
                  <input
                    type="number" step="0.01" value={heightMeters} onChange={e => setHeightMeters(e.target.value)}
                    className="w-full bg-main border-2 border-subtle rounded-xl px-4 py-3 text-xs font-mono font-black text-primary outline-none focus:border-brand-primary shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Quantidade, Categoria, Geometria */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Quantidade</label>
                <input
                  type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-main border-2 border-strong/40 rounded-2xl px-5 py-4 text-sm font-black text-primary outline-none focus:border-brand-primary transition-all shadow-inner"
                  min="1" required
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                  <Layers size={12} className="text-brand-primary" /> Categoria
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as CargoCategory)}
                  className="w-full bg-main border-2 border-strong/40 rounded-2xl px-5 py-4 text-sm font-black text-primary outline-none focus:border-brand-primary appearance-none cursor-pointer shadow-inner"
                >
                  {CATEGORY_SUGGESTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {/* Input condicional: aparece quando user escolhe 'Outros'.
                    Permite digitar um nome de categoria custom (texto livre)
                    que vira o valor final de cargo.category. */}
                {category === 'OTHER' && (
                  <input
                    type="text"
                    value={categoryCustomName}
                    onChange={e => setCategoryCustomName(e.target.value)}
                    placeholder="Digite o nome da categoria…"
                    className="w-full bg-main border-2 border-brand-primary/30 rounded-2xl px-5 py-3 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/50 animate-in fade-in slide-in-from-top-1 duration-200"
                    aria-label="Nome custom da categoria"
                  />
                )}
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-primary uppercase tracking-widest ml-1">Geometria</label>
                <select
                  value={format} onChange={e => setFormat(e.target.value as 'Retangular' | 'Quadrado' | 'Tubular')}
                  className="w-full bg-main border-2 border-strong/40 rounded-2xl px-5 py-4 text-sm font-black text-primary outline-none focus:border-brand-primary appearance-none cursor-pointer shadow-inner"
                >
                  <option value="Retangular">Retangular</option>
                  <option value="Quadrado">Quadrado (Caixa)</option>
                  <option value="Tubular">Tubular (Cilindro)</option>
                </select>
              </div>
            </div>

            {/* Origem e Destino */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                  <MapPin size={12} className="text-brand-primary" /> Origem
                </label>
                <input
                  type="text" value={origin} onChange={e => setOrigin(e.target.value)}
                  placeholder="Ex.: PACU"
                  className="w-full bg-main border-2 border-strong/40 rounded-2xl px-5 py-4 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/50"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                  <MapPin size={12} className="text-brand-primary" /> Destino
                </label>
                <input
                  type="text" value={destination} onChange={e => setDestination(e.target.value)}
                  placeholder="Ex.: NS44"
                  className="w-full bg-main border-2 border-strong/40 rounded-2xl px-5 py-4 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/50"
                />
              </div>
            </div>

            {/* Empresa proprietária — linha separada (nomes podem ser longos). Opcional. */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                <Building2 size={12} className="text-brand-primary" /> Empresa Proprietária
              </label>
              <input
                type="text" value={empresa} onChange={e => setEmpresa(e.target.value)}
                placeholder="Ex.: Petrobras, Subsea7, Halliburton…  (opcional)"
                className="w-full bg-main border-2 border-strong/40 rounded-2xl px-5 py-4 text-sm font-bold text-primary outline-none focus:border-brand-primary transition-all shadow-inner placeholder:text-muted/50"
              />
            </div>

            {/* Toggle Carga Perigosa */}
            <div
              onClick={() => setIsHazardous(!isHazardous)}
              className={cn(
                'flex items-center justify-between p-5 border-2 rounded-3xl cursor-pointer transition-all shadow-low',
                isHazardous
                  ? 'border-purple-500 bg-purple-500/10 shadow-purple-500/20'
                  : 'bg-sidebar border-subtle hover:border-purple-500/40'
              )}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className={cn('shrink-0', isHazardous ? 'text-purple-500 animate-pulse' : 'text-muted')} />
                <div className="flex flex-col gap-1">
                  <span className={cn('text-xs font-black uppercase tracking-widest leading-none', isHazardous ? 'text-purple-600 dark:text-purple-400' : 'text-primary')}>
                    Carga Perigosa? {isHazardous ? 'SIM' : 'NÃO'}
                  </span>
                  <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter opacity-80">
                    Cargas perigosas exibem contorno roxo pulsante para identificação visual
                  </span>
                </div>
              </div>
              <div className={cn(
                'w-14 h-7 rounded-full transition-all duration-500 relative shadow-inner',
                isHazardous ? 'bg-purple-500 shadow-purple-500/40' : 'bg-strong/40'
              )}>
                <div className={cn(
                  'absolute top-1 w-5 h-5 bg-white rounded-full shadow-high transition-all duration-300',
                  isHazardous ? 'left-8' : 'left-1'
                )} />
              </div>
            </div>

            {/* Toggle Modal Unitizador — declara explicitamente se este modal
                pode receber itens fiscais (DANFE) por dentro. Default segue
                a categoria via canHoldItems(); override do usuário grava no
                campo holdsItems para a flag persistir. */}
            <div
              onClick={() => setHoldsItems(!effectiveHoldsItems)}
              className={cn(
                'flex items-center justify-between p-5 border-2 rounded-3xl cursor-pointer transition-all shadow-low',
                effectiveHoldsItems
                  ? 'border-brand-primary bg-brand-primary/10 shadow-brand-primary/20'
                  : 'bg-sidebar border-subtle hover:border-brand-primary/40'
              )}
            >
              <div className="flex items-center gap-3">
                <FolderOpen size={20} className={cn('shrink-0', effectiveHoldsItems ? 'text-brand-primary' : 'text-muted')} />
                <div className="flex flex-col gap-1">
                  <span className={cn('text-xs font-black uppercase tracking-widest leading-none', effectiveHoldsItems ? 'text-brand-primary' : 'text-primary')}>
                    Modal unitizador? {effectiveHoldsItems ? 'SIM' : 'NÃO'}
                  </span>
                  <span className="text-[9px] font-bold text-secondary uppercase tracking-tighter opacity-80">
                    Permite alocar itens fiscais (DANFE) por dentro deste modal
                  </span>
                </div>
              </div>
              <div className={cn(
                'w-14 h-7 rounded-full transition-all duration-500 relative shadow-inner',
                effectiveHoldsItems ? 'bg-brand-primary shadow-brand-primary/40' : 'bg-strong/40'
              )}>
                <div className={cn(
                  'absolute top-1 w-5 h-5 bg-white rounded-full shadow-high transition-all duration-300',
                  effectiveHoldsItems ? 'left-8' : 'left-1'
                )} />
              </div>
            </div>

            {/* Pré-visualização */}
            <div className="bg-sidebar/20 p-10 rounded-[2.5rem] border-2 border-dashed border-subtle flex flex-col items-center justify-center min-h-[160px] shadow-inner relative overflow-hidden group">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[8px] font-black uppercase tracking-[0.3em] border border-brand-primary/20 shadow-low">
                Pré-visualização Dimensional
              </div>
              <div className="scale-110 transition-transform duration-700 group-hover:scale-125 mt-4">
                <CargoPreview
                  format={format}
                  length={Number(lengthMeters) || 1}
                  width={Number(widthMeters) || 1}
                  height={Number(heightMeters) || 1}
                  color={color}
                  quantity={quantity}
                  dynamicScale={true}
                />
              </div>
            </div>

            {/* Cor e Observações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                  <Palette size={14} className="text-brand-primary" /> Cor de Identificação
                </label>
                {/* Custom dropdown — <select> nativo não permite renderizar
                    chip de cor ao lado do label em <option>. Substituímos
                    por button + popover com grid de paleta expandida. */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setColorPickerOpen(s => !s)}
                    className="w-full bg-main border-2 border-strong/40 rounded-2xl px-5 py-4 text-sm font-black text-primary outline-none focus:border-brand-primary cursor-pointer transition-all shadow-inner flex items-center justify-between gap-3"
                    aria-haspopup="listbox"
                    aria-expanded={colorPickerOpen}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-6 h-6 rounded-full border-2 border-white/40 shadow-medium shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">
                        {COLOR_PALETTE.find(c => c.hex === color)?.label ?? 'Cor personalizada'}
                      </span>
                    </div>
                    <ChevronDown size={16} className={cn('text-muted shrink-0 transition-transform duration-200', colorPickerOpen && 'rotate-180')} />
                  </button>
                  {colorPickerOpen && (
                    <>
                      {/* Backdrop transparente para fechar ao clicar fora */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setColorPickerOpen(false)}
                      />
                      <div
                        className="absolute z-50 left-0 right-0 top-full mt-2 bg-main border-2 border-subtle rounded-2xl shadow-high overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                        role="listbox"
                      >
                        <div className="grid grid-cols-2 gap-1 p-2 max-h-[280px] overflow-y-auto">
                          {COLOR_PALETTE.map(c => {
                            const isSelected = c.hex === color;
                            return (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => { setColor(c.hex); setColorPickerOpen(false); }}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-bold text-left transition-[background-color] duration-150',
                                  isSelected ? 'bg-brand-primary/10 text-brand-primary' : 'text-primary hover:bg-sidebar',
                                )}
                                role="option"
                                aria-selected={isSelected}
                              >
                                <span
                                  className="w-5 h-5 rounded-full border-2 border-white/40 shadow-sm shrink-0"
                                  style={{ backgroundColor: c.hex }}
                                />
                                <span className="truncate flex-1">{c.label}</span>
                                {isSelected && <Check size={12} className="text-brand-primary shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest ml-1">
                  <Info size={14} className="text-brand-primary" /> Observações do Operador
                </label>
                <textarea
                  value={observations} onChange={e => setObservations(e.target.value)}
                  placeholder="Instruções especiais de manuseio ou armazenamento..."
                  className="w-full bg-main border-2 border-strong/40 rounded-2xl px-6 py-3.5 text-sm font-bold text-primary outline-none focus:border-brand-primary h-[60px] resize-none no-scrollbar shadow-inner"
                />
              </div>
            </div>

          </form>
        </div>

        {/* Rodapé */}
        <div className="px-10 py-6 border-t border-subtle bg-sidebar shrink-0 flex items-center justify-between gap-8">
          <button
            type="button" onClick={onClose}
            className="px-8 py-4 rounded-2xl text-xs font-black text-primary bg-main border-2 border-subtle hover:bg-sidebar transition-all active:scale-95 uppercase tracking-[0.2em]"
          >
            CANCELAR
          </button>
          <button
            type="submit" form="manual-cargo-form"
            className="flex-1 bg-brand-primary text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            ADICIONAR AO INVENTÁRIO
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
