import { 
  Trash2, Download, CloudUpload, UserCircle, LogIn,
  Sun, Moon, Ship, Plus, Scale
} from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { PdfGeneratorService } from '@/infrastructure/PdfGeneratorService';
import { CsvGeneratorService } from '@/infrastructure/CsvGeneratorService';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/infrastructure/DatabaseService';
import { AuthModal } from './AuthModal';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

export function Header() {
  const {
    locations, manifestsLoaded,
    manifestAtendimento,
    manifestShipName, setShipName
  } = useCargoStore();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exportFilename, setExportFilename] = useState('Plano_de_Carga_Consolidado.pdf');
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isEditingShip, setIsEditingShip] = useState(false);
  const [tempShipName, setTempShipName] = useState(manifestShipName || '');

  // Update temp name when store changes (e.g. from PDF OCR)
  useEffect(() => {
    setTempShipName(manifestShipName || '');
  }, [manifestShipName]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      const isDark = storedTheme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      setIsDark(isDark);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      setIsDark(prefersDark);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleExportPdf = () => {
    setExportFormat('pdf');
    setExportFilename('Plano_de_Carga_Consolidado.pdf');
    setExportModalOpen(true);
  };

  const handleExportCsv = () => {
    setExportFormat('csv');
    setExportFilename('Plano_de_Carga_Consolidado.csv');
    setExportModalOpen(true);
  };

  const handleSaveToCloud = async () => {
     if (!user) {
        setIsAuthOpen(true);
        return;
     }
     setSaving(true);
     try {
       await DatabaseService.saveStowagePlan();
       alert('Manifesto Salvo!');
      } catch(err: unknown) {
        alert('Erro ao salvar: ' + String(err));
      } finally {
       setSaving(false);
     }
  };

  const { totalPort, totalStarboard, totalTopHeavyMoment, currentTotalWeight } = useMemo(() => {
    let port = 0;
    let starboard = 0;
    let topHeavy = 0;
    let weight = 0;

    locations.forEach(loc => {
      const elev = loc.config.elevationMeters !== undefined ? loc.config.elevationMeters : 30;
      loc.bays.forEach(bay => {
        bay.allocatedCargoes.forEach(c => {
          const cargoWeight = c.weightTonnes * c.quantity;
          weight += cargoWeight;
          if (c.positionInBay === 'port') port += cargoWeight;
          else if (c.positionInBay === 'starboard') starboard += cargoWeight;
          const cargoHeight = c.heightMeters || 2.5; 
          const centerOfGravityZ = elev + (cargoHeight / 2);
          topHeavy += (cargoWeight * centerOfGravityZ);
        });
      });
    });

    return { 
      totalPort: port, 
      totalStarboard: starboard, 
      totalTopHeavyMoment: topHeavy, 
      currentTotalWeight: weight 
    };
  }, [locations]);

  const listDiff = Math.abs(totalPort - totalStarboard);
  const isListing = listDiff > 50; 
  const isTopHeavy = totalTopHeavyMoment > 100000;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between min-h-[5rem] px-6 lg:px-10 border-b border-subtle bg-header shrink-0 gap-6 shadow-medium z-30 font-sans">
        
        {/* Left Section: Logo & Navio */}
        <div className="flex items-center gap-6 order-1">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary p-3 rounded-2xl shadow-high shadow-brand-primary/20 hover:scale-105 transition-transform">
              <Ship className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
               <h1 className="font-extrabold text-xl leading-none text-primary tracking-tight">CargoDeck Pro</h1>
               <span className="text-[11px] font-bold text-muted uppercase tracking-[0.2em] mt-1 opacity-80">Maritime Hub</span>
            </div>
          </div>
          
          <div className="h-8 w-px bg-border-subtle hidden sm:block" />
          
          <div className="flex items-center gap-2 group">
            {isEditingShip ? (
              <input
                autoFocus
                type="text"
                value={tempShipName}
                onChange={(e) => setTempShipName(e.target.value)}
                onBlur={() => {
                  setShipName(tempShipName);
                  setIsEditingShip(false);
                }}
                className="bg-main border-2 border-brand-primary rounded-lg px-4 py-2 text-sm font-bold text-primary outline-none w-56 shadow-lg shadow-brand-primary/10"
                placeholder="Identificar Navio..."
              />
            ) : (
              <button
                onClick={() => setIsEditingShip(true)}
                title="Identificar Embarcação: Clique para editar o nome do navio ou unidade offshore."
                className="flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-sidebar/50 hover:bg-main transition-all border border-subtle group/btn shadow-low hover:shadow-medium"
              >
                <div className="flex flex-col items-start">
                   <span className="text-[10px] font-black text-muted uppercase tracking-wider leading-none mb-1">Vessel Identification</span>
                   <span className={cn(
                     "text-sm font-extrabold transition-colors leading-tight",
                     manifestShipName ? "text-primary" : "text-muted italic"
                   )}>
                     {manifestShipName || 'M/V DISCOVERY...'}
                   </span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-status-success shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </button>
            )}
          </div>
        </div>

        {/* Center Section: Stability Info */}
        {(totalPort > 0 || totalStarboard > 0) && (
            <div 
              className="hidden xl:flex flex-1 max-w-2xl justify-center items-center gap-12 px-10 glass rounded-3xl py-3 order-2 shadow-medium"
              title="Indicador de Banda: Monitoramento de estabilidade transversal."
            >
              <div className="flex flex-col items-center gap-2.5 flex-1 max-w-[340px]">
                <div className="flex justify-between w-full text-[10px] font-extrabold tracking-[0.1em] uppercase">
                   <span className={cn("transition-colors", totalPort > totalStarboard + 50 ? "text-status-error" : "text-muted")}>BOMBORDO</span>
                   <span className={cn("transition-colors", totalStarboard > totalPort + 50 ? "text-status-error" : "text-muted")}>BORESTE</span>
                </div>
                <div className="flex items-center gap-4 w-full">
                  <span className="text-xs font-mono font-black text-secondary tabular-nums w-14 text-right">{totalPort.toFixed(1)}t</span>
                  <div className="flex-1 h-3.5 bg-main/50 border border-subtle rounded-full overflow-hidden flex shadow-inner p-0.5 relative">
                    <div className="flex-1 flex justify-end">
                       <div className={cn(
                         "h-full transition-all duration-700 rounded-l-sm",
                         isListing && totalPort > totalStarboard ? "bg-status-error" : "bg-brand-primary"
                       )}
                       style={{ width: `${Math.min(100, (totalPort / (Math.max(totalPort, totalStarboard) || 1)) * 100)}%` }}></div>
                    </div>
                    <div className="w-0.5 bg-border-strong mx-0.5 z-10" />
                    <div className="flex-1">
                      <div className={cn(
                        "h-full transition-all duration-700 rounded-r-sm",
                        isListing && totalStarboard > totalPort ? "bg-status-error" : "bg-brand-primary"
                      )}
                      style={{ width: `${Math.min(100, (totalStarboard / (Math.max(totalPort, totalStarboard) || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-secondary tabular-nums w-14">{totalStarboard.toFixed(1)}t</span>
                </div>
              </div>

              <div className="h-10 w-px bg-border-subtle opacity-50" />

              <div 
                className="flex flex-col items-center min-w-32"
                title="Estabilidade VCG"
              >
                <span className="text-[10px] text-muted font-bold tracking-[0.15em] uppercase mb-1.5 opacity-70">Stability Index</span>
                <div className="flex items-center gap-3">
                   <div className={cn(
                     "p-1.5 rounded-lg transition-colors",
                     isTopHeavy ? "bg-status-error/10 text-status-error" : "bg-status-success/10 text-status-success"
                   )}>
                     <Scale size={18} />
                   </div>
                   <span className={cn(
                     "text-lg font-black tracking-tighter tabular-nums",
                     isTopHeavy ? "text-status-error" : "text-primary"
                   )}>
                     {totalTopHeavyMoment.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[10px] font-bold text-muted uppercase ml-1">tm</span>
                   </span>
                </div>
              </div>
            </div>
        )}

        {/* Right Section: Badges & Actions */}
        <div className="flex items-center gap-4 order-3 ml-auto">
          {/* Peso Plano */}
          <div 
            className="hidden xxl:flex flex-col items-end px-6 py-2.5 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl shadow-low"
            title="Carga Útil Total"
          >
            <span className="text-[10px] text-brand-primary font-black uppercase tracking-[0.2em] mb-1 opacity-80">Payload Total</span>
            <span className="text-primary font-black text-xl tabular-nums leading-none">{currentTotalWeight.toFixed(1)} <sub className="text-[11px] font-bold bottom-0 uppercase ml-1 opacity-50">Ton</sub></span>
          </div>

          <div className="h-10 w-px bg-border-subtle hidden lg:block" />

          {/* Action Group */}
          <div className="flex items-center gap-2">
            <button
              className="p-3 text-muted hover:text-status-error hover:bg-status-error/10 rounded-2xl transition-all active:scale-90 hover:rotate-12"
              onClick={() => {
                if (window.confirm('Limpar manifestos?')) useCargoStore.getState().clearAllCargoes();
              }}
              title="Zerar Plano de Carga"
            >
              <Trash2 size={20} />
            </button>

            <div className="flex items-center gap-2 p-1.5 glass rounded-2xl shadow-low">
               <button 
                 onClick={handleExportCsv} 
                 disabled={!manifestsLoaded} 
                 title="Exportar CSV"
                 className="flex items-center gap-2 bg-main border border-subtle hover:border-brand-primary text-secondary hover:text-brand-primary disabled:opacity-40 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all hover:shadow-low"
               >
                 <Download size={14} /> CSV
               </button>
               <button 
                 onClick={handleExportPdf} 
                 disabled={!manifestsLoaded} 
                 title="Exportar PDF"
                 className="flex items-center gap-2 bg-main border border-subtle hover:border-brand-primary text-secondary hover:text-brand-primary disabled:opacity-40 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all hover:shadow-low"
               >
                 <Download size={14} /> PDF
               </button>
            </div>

            <button
              onClick={handleSaveToCloud}
              disabled={saving}
              title="Sincronizar"
              className="flex items-center gap-3 bg-gradient-to-br from-[#10b981] to-[#059669] text-white hover:brightness-110 disabled:opacity-40 px-7 py-3.5 rounded-2xl text-xs font-extrabold shadow-high shadow-status-success/30 active:scale-95 transition-all hover-lift"
            >
              <CloudUpload size={18} /> 
              <span className="tracking-widest">{saving ? 'PROCESSANDO...' : 'SALVAR'}</span>
            </button>
          </div>

          <div className="h-10 w-px bg-border-subtle mx-1" />

          {/* User Section */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDark(prev => !prev)} 
              title={isDark ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
              className="p-3 text-secondary hover:bg-sidebar rounded-2xl border border-transparent hover:border-subtle transition-all"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
               <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 p-1.5 pr-4 bg-status-success/10 border border-status-success/20 rounded-full hover:bg-status-success/20 transition-all">
                 <UserCircle className="w-9 h-9 text-status-success" />
                 <div className="flex flex-col items-start leading-none gap-1">
                    <span className="text-[10px] font-black text-status-success uppercase tracking-widest">Active</span>
                    <span className="text-xs font-bold text-primary truncate max-w-[80px]">{user.email?.split('@')[0]}</span>
                 </div>
               </button>
            ) : (
               <button onClick={() => setIsAuthOpen(true)} className="p-3 text-secondary hover:text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all">
                 <LogIn size={20} />
               </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-header border border-subtle p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 bg-brand-primary/10 rounded-3xl mb-4">
                <Download className="w-8 h-8 text-brand-primary" />
              </div>
              <h3 className="text-xl font-black text-primary">Exportar Manifesto</h3>
              <p className="text-sm text-muted mt-1 font-medium">Configure o nome do arquivo para salvamento.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Nome do Arquivo</label>
                <input
                  type="text"
                  value={exportFilename}
                  onChange={(e) => setExportFilename(e.target.value)}
                  className="w-full px-5 py-4 bg-main border-2 border-subtle text-primary rounded-2xl focus:border-brand-primary outline-none transition-all font-bold"
                  placeholder={`ex: Plano_Consolidado.${exportFormat}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={async () => {
                    const showDirectoryPicker = (window as any).showDirectoryPicker;
                    if (showDirectoryPicker) {
                      try { setDirHandle(await showDirectoryPicker()); } catch {}
                    } else {
                      alert('Browser não suporta seleção de pasta local.');
                    }
                  } } 
                  className="px-6 py-4 bg-sidebar border border-subtle text-primary rounded-2xl text-xs font-black hover:bg-main transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> PASTA
                </button>
                <button 
                  onClick={async () => {
                    let blob: Blob;
                    if (exportFormat === 'pdf') {
                      blob = await PdfGeneratorService.generateBlob(locations, manifestShipName, manifestAtendimento);
                    } else {
                      blob = CsvGeneratorService.generateCsv(locations, manifestShipName, manifestAtendimento);
                    }

                    if (dirHandle) {
                      try {
                        const fileHandle = await dirHandle.getFileHandle(exportFilename, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        alert('Salvo com sucesso!');
                      } catch (e) { alert('Erro: ' + (e as Error).message); }
                    } else {
                      if (exportFormat === 'pdf') PdfGeneratorService.executeExport(locations, exportFilename, manifestShipName, manifestAtendimento);
                      else CsvGeneratorService.executeExport(locations, exportFilename, manifestShipName, manifestAtendimento);
                    }
                    setExportModalOpen(false); setDirHandle(null);
                  } } 
                  className="px-6 py-4 bg-brand-primary text-white rounded-2xl text-xs font-black shadow-xl shadow-brand-primary/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  EXPORTAR
                </button>
              </div>

              <button 
                onClick={() => { setExportModalOpen(false); setDirHandle(null); } } 
                className="w-full py-4 text-xs font-bold text-muted hover:text-primary transition-colors text-center"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
