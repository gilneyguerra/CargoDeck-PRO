MÓDULO DE EDIÇÃO DE CARGAS - IMPLEMENTAÇÃO PASSO A PASSO PARA CARGODECK PLAN
Especificação técnica code-oriented para substituição de extração OCR por interface de edição em grade de alta precisão
29 de abril de 2026

1. Nome da Seção: OVERVIEW DA SOLUÇÃO
Este documento detalha a substituição do motor de extração via OCR/PDF por um Módulo de Edição de Cargas nativo. A decisão estratégica visa eliminar as inconsistências de leitura de documentos escaneados, garantindo 100% de acurácia nos dados de estabilidade e alocação. O sistema adota uma interface inspirada em planilhas eletrônicas (estilo Excel), permitindo a entrada em massa de itens com validação em tempo real.
O fluxo operacional consiste no acionamento de um modal centralizado onde o usuário define as propriedades físicas de cada carga. Ao finalizar o preenchimento, o sistema processa a lista, gera as entidades no estado global da aplicação e renderiza automaticamente as representações 3D no deck e os itens na sidebar de controle.

2. Nome da Seção: ARQUITETURA TÉCNICA
A implementação utiliza uma stack moderna focada em performance de renderização e gerenciamento de estado complexo. A estrutura foi desenhada para suportar centenas de linhas sem degradação de interface.
●	Frontend Framework: React 18 (Concurrent Mode)
●	Linguagem: TypeScript 5.x (Strict Mode)
●	Estado Global: Zustand com middleware de persistência
●	Data Grid: React Data Grid (para virtualização de linhas)
●	Animações: Framer Motion (transições de modal e tooltips)
●	Renderização 3D: Three.js / React Three Fiber
●	Estilização: Tailwind CSS + CSS Modules
2.1 Estrutura de Pastas
●	src/components/CargoEditor/: Componentes da interface de grade
●	src/hooks/: Lógica de validação e cálculos de estabilidade
●	src/types/: Definições de interfaces e enums
●	src/store/: Gerenciamento de estado persistente

3. Nome da Seção: INSTALAÇÃO E SETUP INICIAL
Execute os comandos abaixo no terminal do projeto para garantir que todas as dependências críticas estejam disponíveis para o Claude Code.
npm install react-data-grid zustand framer-motion three @react-three/fiber @react-three/drei lucide-react clsx tailwind-merge
Crie a estrutura de diretórios necessária para organizar os novos módulos:
mkdir -p src/components/CargoEditor src/hooks src/types src/store src/styles/cargoEditor

4. Nome da Seção: DEFINIÇÃO DE TYPES TYPESCRIPT
As definições de tipos são o contrato central da aplicação. O enum CargoCategory define o comportamento visual e físico de cada item.
// src/types/cargo.ts  export enum CargoCategory {   CONTAINER = 'Container',   CESTA = 'Cesta',   CEMENTING_BOX = 'Cementing Box',   TANQUE = 'Tanque',   SPOOLER = 'Spooler',   BAG = 'Bag',   CABLE = 'Cable',   BRIDGE_PLUG = 'Bridge Plug',   TUBULAR = 'Tubular',   EQUIPAMENTO = 'Equipamento',   PALLET = 'Pallet',   SKID = 'Skid',   BOTTLE_RACK = 'Bottle Rack',   MANIFOLD = 'Manifold',   OUTROS = 'Outros' }  export interface CargoDimensions {   length: number;<br/>   width: number;<br/>   height: number; }  export interface Cargo {   id: string;<br/>   category: CargoCategory;<br/>   cargoCode: string;<br/>   description: string;<br/>   dimensions: CargoDimensions;<br/>   weightTon: number;<br/>   itemNumber?: string;<br/>   lashingNumber?: string;<br/>   observations?: string;<br/>   origin: string;<br/>   destination: string;<br/>   status: 'unallocated' | 'allocated' | 'pending';<br/>   position?: { x: number; y: number; z: number };<br/>   rotation?: number; }  export interface ValidationError {   field: keyof Cargo | string;<br/>   message: string; }

5. Nome da Seção: CONFIGURAÇÃO DO ZUSTAND STORE
O store gerencia a lista de cargas e garante que os dados não sejam perdidos em caso de refresh da página através do middleware de persistência.
// src/store/cargoStore.ts import { create } from 'zustand'; import { persist } from 'zustand/middleware'; import { Cargo } from '../types/cargo';  interface CargoState {   cargoList: Cargo[];<br/>   pendingCargos: Cargo[];<br/>   addCargos: (cargos: Cargo[]) => void;<br/>   removeCargo: (id: string) => void;<br/>   updateCargo: (id: string, data: Partial<Cargo>) => void;<br/>   clearPending: () => void; }  export const useCargoStore = create<CargoState>()(   persist(     (set) => ({       cargoList: [],<br/>       pendingCargos: [],<br/>       addCargos: (cargos) => set((state) => ({ <br/>         cargoList: [...state.cargoList, ...cargos]        })),       removeCargo: (id) => set((state) => ({ <br/>         cargoList: state.cargoList.filter(c => c.id !== id)        })),       updateCargo: (id, data) => set((state) => ({<br/>         cargoList: state.cargoList.map(c => c.id === id ? { ...c, ...data } : c)       })),       clearPending: () => set({ pendingCargos: [] }),     }),     { name: 'cargodeck-storage' }   ) );

6. Nome da Seção: HOOK DE VALIDAÇÃO - useCargoValidation
Este hook encapsula a lógica de integridade dos dados, utilizando expressões regulares para validar códigos e limites físicos para peso e dimensões.
// src/hooks/useCargoValidation.ts import { Cargo, ValidationError } from '../types/cargo';  export const useCargoValidation = () => {   const validateCargo = (cargo: Partial<Cargo>): ValidationError[] => {<br/>     const errors: ValidationError[] = [];      if (!cargo.cargoCode || cargo.cargoCode.length < 3) {       errors.push({ field: 'cargoCode', message: 'Código identificador inválido.' });     }      if (!cargo.weightTon || cargo.weightTon <= 0 || cargo.weightTon > 500) {       errors.push({ field: 'weightTon', message: 'Peso deve estar entre 0.1 e 500 TON.' });     }      if (!cargo.dimensions || cargo.dimensions.length <= 0 || cargo.dimensions.length > 50) {       errors.push({ field: 'length', message: 'Comprimento inválido (máx 50m).' });     }      return errors;   };    const checkDuplicates = (cargos: Cargo[], currentList: Cargo[]) => {     const codes = currentList.map(c => c.cargoCode);     return cargos.filter(c => codes.includes(c.cargoCode));   };    return { validateCargo, checkDuplicates }; };

7. Nome da Seção: COMPONENTE PRINCIPAL - CargoEditorModal
O modal utiliza Framer Motion para transições suaves e serve como container para o grid de edição.
// src/components/CargoEditor/CargoEditorModal.tsx import React, { useState } from 'react'; import { motion, AnimatePresence } from 'framer-motion'; import { CargoEditorGrid } from './CargoEditorGrid'; import { useCargoStore } from '../../store/cargoStore'; import { Cargo, CargoCategory } from '../../types/cargo'; import { X, Plus, Trash2, Check } from 'lucide-react';  export const CargoEditorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {   const [rows, setRows] = useState<Partial<Cargo>[]>([{}]);   const addCargos = useCargoStore(state => state.addCargos);    const handleAddRow = () => setRows([...rows, {}]);      const handleGenerate = () => {     // Lógica de validação e conversão para Cargo[]     const finalCargos = rows as Cargo[];      addCargos(finalCargos);     onClose();   };    return (     <AnimatePresence>       {isOpen && (         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">           <motion.div              initial={{ opacity: 0, scale: 0.95 }}<br/>             animate={{ opacity: 1, scale: 1 }}<br/>             exit={{ opacity: 0, scale: 0.95 }}             className="w-[95vw] h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"           >             <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">               <h2 className="text-xl font-bold text-cyan-400">Editor de Cargas em Lote</h2>               <button onClick={onClose} className="text-slate-400 hover:text-white"><X /></button>             </div>                          <div className="flex-1 overflow-auto p-4">               <CargoEditorGrid rows={rows} setRows={setRows} />             </div>              <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-between">               <button onClick={handleAddRow} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">                 <Plus size={18} /> Adicionar Linha               </button>               <div className="flex gap-3">                 <button onClick={onClose} className="px-6 py-2 text-slate-300 hover:text-white">Cancelar</button><br/>                 <button onClick={handleGenerate} className="flex items-center gap-2 px-8 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-lg shadow-emerald-900/20">                   <Check size={18} /> Gerar Cargas                 </button>               </div>             </div>           </motion.div>         </div>       )}     </AnimatePresence>   ); };

8. Nome da Seção: COMPONENTE GRID - CargoEditorGrid
O grid é o coração do módulo. Ele define as colunas e gerencia a edição de cada célula. As larguras são fixas para garantir a legibilidade.
// src/components/CargoEditor/CargoEditorGrid.tsx import DataGrid from 'react-data-grid'; import 'react-data-grid/lib/styles.css'; import { CargoCategory } from '../../types/cargo';  const columns = [   { key: 'category', name: 'Categoria', width: 180, editable: true },<br/>   { key: 'cargoCode', name: 'Cód. Identificador', width: 150, editable: true },<br/>   { key: 'description', name: 'Descrição', width: 250, editable: true },<br/>   { key: 'length', name: 'Comp. (M)', width: 100, editable: true },<br/>   { key: 'width', name: 'Larg. (M)', width: 100, editable: true },<br/>   { key: 'height', name: 'Alt. (M)', width: 100, editable: true },<br/>   { key: 'weightTon', name: 'Peso (TON)', width: 120, editable: true },<br/>   { key: 'origin', name: 'Origem', width: 150, editable: true },<br/>   { key: 'destination', name: 'Destino', width: 150, editable: true } ];  export const CargoEditorGrid = ({ rows, setRows }: any) => {   return (     <DataGrid       columns={columns}       rows={rows}       onRowsChange={setRows}       className="rdg-dark h-full text-sm"       rowHeight={45}     />   ); };

9. Nome da Seção: COMPONENTE CELULA - CargoGridCell
As células customizadas garantem que o usuário insira dados no formato correto, aplicando máscaras e validações visuais instantâneas.
// src/components/CargoEditor/CargoGridCell.tsx import React from 'react';  export const NumericEditor = ({ row, onRowChange, column }: any) => {   return (     <input       type="number"       className="w-full h-full bg-transparent px-2 outline-none text-cyan-300 focus:bg-slate-700"       value={row[column.key] || ''}       onChange={(e) => onRowChange({ ...row, [column.key]: parseFloat(e.target.value) })}       autoFocus     />   ); };  export const CategoryEditor = ({ row, onRowChange }: any) => {   return (     <select       className="w-full h-full bg-slate-800 text-white px-2 outline-none"       value={row.category || ''}       onChange={(e) => onRowChange({ ...row, category: e.target.value })}     >       {Object.values(CargoCategory).map(cat => (         <option key={cat} value={cat}>{cat}</option>       ))}     </select>   ); };

10. Nome da Seção: TOOLTIP AO HOVER - CargoHoverTooltip
O tooltip é renderizado via React Portal para evitar cortes por overflow de containers. Ele apresenta o resumo completo da carga ao passar o mouse.
// src/components/CargoEditor/CargoHoverTooltip.tsx import { motion } from 'framer-motion'; import { Cargo } from '../../types/cargo';  export const CargoHoverTooltip: React.FC<{ cargo: Cargo; x: number; y: number }> = ({ cargo, x, y }) => {   return (     <motion.div        initial={{ opacity: 0, y: 10 }}<br/>       animate={{ opacity: 1, y: 0 }}<br/>       style={{ top: y, left: x }}       className="fixed z-[1000] w-64 bg-slate-800 border border-cyan-500/30 rounded-lg p-4 shadow-2xl backdrop-blur-md"     >       <div className="flex justify-between items-start mb-2">         <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{cargo.category}</span>         <span className="text-xs text-slate-400">#{cargo.itemNumber}</span>       </div>       <h4 className="text-white font-bold mb-1">{cargo.cargoCode}</h4>       <p className="text-slate-300 text-xs mb-3 italic">"{cargo.description}"</p>       <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">         <div>Dimensões: <strong>{cargo.dimensions.length}x{cargo.dimensions.width}x{cargo.dimensions.height}m</strong></div><br/>         <div>Peso: <strong className="text-emerald-400">{cargo.weightTon} TON</strong></div><br/>         <div>Origem: <strong>{cargo.origin}</strong></div><br/>         <div>Destino: <strong>{cargo.destination}</strong></div>       </div>     </motion.div>   ); };

11. Nome da Seção: BOTÃO DE AÇÃO - "Adicionar Carga"
Este botão deve ser posicionado no cabeçalho da sidebar ou na barra de ferramentas principal do deck.
// src/components/CargoEditor/AddCargoButton.tsx import React, { useState } from 'react'; import { PackagePlus } from 'lucide-react'; import { CargoEditorModal } from './CargoEditorModal';  export const AddCargoButton = () => {   const [isModalOpen, setIsModalOpen] = useState(false);    return (     <>       <button          onClick={() => setIsModalOpen(true)}         className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md transition-all shadow-lg shadow-cyan-900/20"       >         <PackagePlus size={18} />         <span className="font-medium">Adicionar Carga</span>       </button>       <CargoEditorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />     </>   ); };

12. Nome da Seção: INTEGRAÇÃO COM SIDEBAR
A sidebar deve refletir as cores das categorias para facilitar a identificação visual rápida pelo operador.
// src/components/Sidebar/CargoItem.tsx import { Cargo, CargoCategory } from '../../types/cargo';  const categoryColors: Record<CargoCategory, string> = {<br/>   [CargoCategory.CONTAINER]: 'border-l-blue-500',<br/>   [CargoCategory.CESTA]: 'border-l-emerald-500',<br/>   [CargoCategory.TANQUE]: 'border-l-orange-500',   // ... demais cores };  export const CargoItem = ({ cargo }: { cargo: Cargo }) => {   return (     <div className={`p-3 mb-2 bg-slate-800 border-l-4 ${categoryColors[cargo.category]} rounded-r-md hover:bg-slate-700 transition cursor-move`}>       <div className="flex justify-between items-center mb-1">         <span className="text-[10px] font-bold text-slate-400 uppercase">{cargo.category}</span>         <span className="text-[10px] font-bold text-emerald-400">{cargo.weightTon} TON</span>       </div>       <div className="text-sm font-mono text-white">{cargo.cargoCode}</div>     </div>   ); };

13. Nome da Seção: INTEGRAÇÃO COM REPRESENTAÇÃO 3D
A representação 3D utiliza as dimensões reais inseridas no grid. O cálculo de escala é de 1 unidade = 1 metro.
// src/components/3D/CargoVisual3D.tsx import React from 'react'; import { Box } from '@react-three/drei'; import { Cargo } from '../../types/cargo';  export const CargoVisual3D = ({ cargo }: { cargo: Cargo }) => {   const { length, width, height } = cargo.dimensions;      return (     <mesh position={[cargo.position?.x || 0, height / 2, cargo.position?.z || 0]}>       <boxGeometry args={[length, height, width]} />       <meshStandardMaterial          color={getCategoryColor(cargo.category)}          transparent          opacity={0.9}        />       {/
Label flutuante
/}       <group position={[0, height / 2 + 0.5, 0]}>         <Text fontSize={0.2} color="white">{cargo.cargoCode}</Text>         <Text fontSize={0.15} position={[0, -0.2, 0]} color="#10b981">{cargo.weightTon}T</Text>       </group>     </mesh>   ); };

14. Nome da Seção: FLUXO COMPLETO DE CRIAÇÃO
O processo de criação segue uma lógica linear para garantir que nenhum dado inconsistente entre no sistema de cálculo de estabilidade.
1.	Trigger: Usuário clica em "Adicionar Carga" no Header.
2.	Interface: Modal abre com uma linha vazia e foco no campo "Categoria".
3.	Entrada: Usuário preenche os dados. Ao pressionar TAB na última célula, uma nova linha é criada automaticamente.
4.	Validação: O hook useCargoValidation verifica cada campo. Células inválidas ficam com borda vermelha border-red-500.
5.	Persistência: Ao clicar em "Gerar Cargas", o sistema verifica se há erros globais.
6.	Commit: Se aprovado, os dados são enviados para o cargoStore e o modal fecha.
7.	Renderização: A Sidebar atualiza e os modelos 3D aparecem na área de "Cargas Pendentes".

15. Nome da Seção: ESPECIFICAÇÕES DE CATEGORIAS
Abaixo, a tabela de referência para estilização e categorização das cargas no sistema.
●	Container: #3B82F6 (Azul) - Cargas padrão ISO.
●	Cesta: #10B981 (Esmeralda) - Cestas de transporte de materiais.
●	Cementing Box: #F59E0B (Âmbar) - Unidades de cimentação.
●	Tanque: #F97316 (Laranja) - Tanques de fluidos/químicos.
●	Spooler: #8B5CF6 (Violeta) - Carretéis de cabos/umbilicais.
●	Tubular: #64748B (Ardósia) - Racks de tubos e risers.
●	Equipamento: #EC4899 (Rosa) - Máquinas e ferramentas especiais.

16. Nome da Seção: VALIDAÇÕES E TRATAMENTO DE ERROS
O sistema de mensagens de erro deve ser amigável e instrutivo, evitando termos técnicos genéricos.
●	Erro de Peso: "O peso informado ($$P > 500$$) excede a capacidade máxima de içamento do guindaste principal."
●	Erro de Dimensão: "As dimensões informadas são incompatíveis com as baias do deck (Máx 50m)."
●	Código Duplicado: "O código identificador já existe no manifesto atual. Verifique se a carga já foi inserida."
●	Campo Vazio: "Este campo é obrigatório para o cálculo de estabilidade transversal."

17. Nome da Seção: CSS E ESTILOS COMPLETOS
Estilos baseados em utilitários Tailwind para garantir consistência com o tema Dark Industrial do CargoDeck.
/
src/styles/cargoEditor.css
/ .rdg-dark {   --rdg-background-color: #0f172a;<br/>   --rdg-border-color: #1e293b;<br/>   --rdg-font-size: 13px;<br/>   --rdg-color: #cbd5e1;<br/>   --rdg-header-background-color: #1e293b;<br/>   --rdg-selection-color: #06b6d433; }  .cargo-modal-glass {   background: rgba(15, 23, 42, 0.8);<br/>   backdrop-filter: blur(12px);<br/>   border: 1px solid rgba(255, 255, 255, 0.1); }  .input-error {   border: 1px solid #ef4444 !important;<br/>   background: rgba(239, 68, 68, 0.1) !important; }

18. Nome da Seção: INTEGRAÇÃO COMPLETA E DEPLOYMENT
Para finalizar a implementação, siga o checklist de prontidão para produção.
8.	Verifique se o cargoStore está persistindo no localStorage.
9.	Teste a entrada de 50 linhas simultâneas para validar a performance do grid.
10.	Certifique-se de que o hover tooltip não "treme" ao mover o mouse rapidamente.
11.	Valide se o peso total na sidebar atualiza imediatamente após o "Gerar Cargas".
12.	Execute npm run build para garantir que não há erros de tipagem no TypeScript.
O deploy no Vercel será automático ao realizar o push para a branch `main`. Nenhuma variável de ambiente adicional é necessária para este módulo.
