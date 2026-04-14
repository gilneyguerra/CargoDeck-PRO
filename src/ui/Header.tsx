import { Ship, Download, Trash2, ListCollapse, Weight, CloudUpload, LogIn, UserCircle, Sun, Moon } from 'lucide-react';
import { useCargoStore } from '@/features/cargoStore';
import { PdfGeneratorService } from '@/infrastructure/PdfGeneratorService';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/infrastructure/DatabaseService';
import { AuthModal } from './AuthModal';
import type { User } from '@supabase/supabase-js';

export function Header() {
  const {
    locations, manifestsLoaded, shipOperationCode, setShipOperationCode,
    manifestShipName, manifestVoyage, manifestAtendimento, manifestRoteiro
  } = useCargoStore();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFilename, setExportFilename] = useState('Plano_de_Carga_Consolidado.pdf');
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Set dark mode from localStorage or system preference
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      const isDark = storedTheme === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
      setIsDark(isDark);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
      setIsDark(prefersDark);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleExport = () => {
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
       alert('Manifesto Salvo! Os dados atuais foram gravados no banco de dados com segurança.');
      } catch(err: unknown) {
        alert('Erro ao salvar no banco: ' + String(err));
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
  const isTopHeavy = totalTopHeavyMoment > 100000; // Adjusted limit for new mathematical scale

  return (
    <>
      <header className="flex flex-wrap items-center justify-between min-h-[3.5rem] py-2 px-3 lg:px-6 border-b border-border bg-bg shrink-0 gap-y-3 gap-x-2 lg:gap-x-4">
        
        {/* Left Section */}
        <div className="flex items-center flex-wrap gap-2 lg:gap-6 order-1">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="bg-indigo-500/10 p-1.5 rounded-md">
              <Ship className="h-5 w-5 text-indigo-400" />
            </div>
            <h1 className="font-semibold text-base lg:text-lg tracking-tight text-gray-800 dark:text-neutral-100 whitespace-nowrap">CargoDeck Pro</h1>
          </div>

          <div className="flex items-center gap-2 border-l border-neutral-300 dark:border-neutral-800 pl-3 lg:pl-6 hidden sm:flex">
            <span className="text-[10px] lg:text-xs text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider whitespace-nowrap">Navio Atual:</span>
            <input 
              type="text" 
              value={shipOperationCode}
              onChange={(e) => setShipOperationCode(e.target.value)}
              className="bg-white dark:bg-neutral-950 border border-neutral-400 dark:border-neutral-700 text-gray-800 dark:text-neutral-200 text-sm rounded px-2 lg:px-3 py-1 w-20 lg:w-24 uppercase focus:border-indigo-500 outline-none"
              placeholder="Sigla"
              title="Sigla exata do navio como consta no manifesto"
            />
          </div>

          {/* Informações do manifesto carregado */}
          {(manifestShipName || manifestAtendimento) && (
            <div className="flex items-center flex-wrap gap-2 lg:gap-4 pl-3 lg:pl-6 border-l border-neutral-300 dark:border-neutral-800">
              {manifestShipName && (
                <div className="flex flex-col">
                  <span className="text-[9px] text-neutral-500 dark:text-neutral-500 font-bold uppercase tracking-widest whitespace-nowrap">Embarcação</span>
                  <span className="text-[11px] lg:text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{manifestShipName}</span>
                </div>
              )}
              {manifestAtendimento && (
                <div className="flex flex-col">
                  <span className="text-[9px] text-neutral-500 dark:text-neutral-500 font-bold uppercase tracking-widest whitespace-nowrap">Atendimento</span>
                  <span className="text-[11px] lg:text-xs font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">#{manifestAtendimento}</span>
                </div>
              )}
              {manifestRoteiro && manifestRoteiro.length > 0 && (
                <div className="flex flex-col max-w-[150px] lg:max-w-[250px]">
                  <span className="text-[9px] text-neutral-500 dark:text-neutral-500 font-bold uppercase tracking-widest whitespace-nowrap">Roteiro</span>
                  <span className="text-[11px] lg:text-xs font-mono text-neutral-600 dark:text-neutral-400 truncate" title={manifestRoteiro.join(' → ')}>
                    {manifestRoteiro.slice(0, 4).join(' → ')}{manifestRoteiro.length > 4 ? ' …' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="ml-auto flex items-center flex-wrap gap-2 lg:gap-4 text-xs lg:text-sm text-neutral-500 dark:text-neutral-400 order-2 xl:order-3">
          <div className="flex items-center gap-1 lg:gap-2">
            <span className="hidden lg:inline whitespace-nowrap">Total Planejado:</span>
            <span className="inline lg:hidden font-semibold">Total:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-100 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">{currentTotalWeight.toFixed(1)} t</span>
          </div>

          <div className="hidden lg:block h-4 w-px bg-neutral-400 dark:bg-neutral-700" />

           <div className="flex items-center gap-1 lg:gap-3">
             <button 
               className="flex items-center gap-1 lg:gap-2 text-neutral-600 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
               onClick={() => {
                 if (window.confirm('Você está prestes a deletar todas as cargas do plano de carga, deseja prosseguir?')) {
                   const { clearAllCargoes } = useCargoStore.getState();
                   clearAllCargoes();
                 }
               }} 
               title="Limpar Planejamento"
             >
               <Trash2 className="w-4 h-4" />
             </button>
            
             <button 
               onClick={handleExport}
               disabled={!manifestsLoaded}
               className="flex items-center gap-1 lg:gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-800 disabled:text-neutral-600 dark:disabled:text-neutral-500 text-white px-2 lg:px-3 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-colors border border-indigo-500 dark:disabled:border-neutral-700 shadow-sm"
               title="Gerar PDF"
             >
               <Download className="w-4 h-4" />
               <span className="hidden lg:inline whitespace-nowrap">Gerar PDF</span>
             </button>

              <button 
                onClick={() => setIsDark(prev => !prev)}
                className="flex items-center gap-1 lg:gap-2 text-neutral-600 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200 transition-colors p-1"
                title={isDark ? "Modo Claro" : "Modo Escuro"}
              >
                {isDark ? (<Sun className="w-4 h-4" />) : (<Moon className="w-4 h-4" />)}
              </button>

             <button 
               onClick={handleSaveToCloud}
               disabled={saving}
               className="flex items-center gap-1 lg:gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-400 dark:disabled:bg-neutral-800 disabled:text-neutral-600 dark:disabled:text-neutral-500 text-white px-2 lg:px-3 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-colors border border-emerald-500 dark:disabled:border-neutral-700 shadow-sm"
               title="Salvar Cloud"
             >
               <CloudUpload className="w-4 h-4" />
               <span className="hidden lg:inline whitespace-nowrap">{saving ? 'Salvando...' : 'Salvar Cloud'}</span>
             </button>

            {user ? (
              <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1 lg:gap-2 text-neutral-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-1" title="Sair da Conta">
                <UserCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </button>
            ) : (
              <button onClick={() => setIsAuthOpen(true)} className="flex items-center gap-1 lg:gap-2 text-neutral-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-1" title="Login">
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Center Section */}
        {(totalPort > 0 || totalStarboard > 0) && (
            <div className="flex flex-1 xl:flex-none w-full xl:w-auto justify-center items-center gap-4 lg:gap-6 px-2 lg:px-4 border-t xl:border-t-0 xl:border-x border-neutral-300 dark:border-neutral-800/50 xl:mx-4 order-3 xl:order-2 pt-3 xl:pt-0 pb-1 xl:pb-0 min-w-fit">
              <div className="flex flex-col items-center gap-1 w-full max-w-[250px] lg:max-w-none lg:w-auto">
                <span className="text-[9px] text-neutral-500 dark:text-[#6c6c8c] font-bold tracking-widest flex items-center gap-1 whitespace-nowrap">
                  <ListCollapse size={10} /> BANDA (TRANSVERSAL)
                </span>
                <div className="flex items-center gap-2 text-[10px] lg:text-xs font-mono w-full justify-center">
                  <span className={totalPort > totalStarboard + 50 ? "text-red-500 dark:text-red-400" : "text-neutral-600 dark:text-neutral-400"}>BB: {totalPort.toFixed(1)}t</span>
                  <div className="flex-1 max-w-[120px] h-1.5 bg-neutral-300 dark:bg-black border border-neutral-400 dark:border-neutral-600 rounded-full relative overflow-hidden flex">
                    <div className="flex-1 border-r border-neutral-400 dark:border-neutral-600 relative">
                       <div className={`absolute top-0 bottom-0 right-0 transition-all ${isListing && totalPort > totalStarboard ? "bg-red-500" : "bg-indigo-500"}`}
                           style={{ width: `${Math.min(100, (listDiff / (totalPort+totalStarboard+1)) * 100)}%`, opacity: totalPort > totalStarboard ? 1 : 0 }}></div>
                    </div>
                    <div className="flex-1 relative">
                      <div className={`absolute top-0 bottom-0 left-0 transition-all ${isListing && totalStarboard > totalPort ? "bg-red-500" : "bg-indigo-500"}`}
                          style={{ width: `${Math.min(100, (listDiff / (totalPort+totalStarboard+1)) * 100)}%`, opacity: totalStarboard > totalPort ? 1 : 0 }} />
                    </div>
                  </div>
                  <span className={totalStarboard > totalPort + 50 ? "text-red-500 dark:text-red-400" : "text-neutral-600 dark:text-neutral-400"}>BE: {totalStarboard.toFixed(1)}t</span>
                </div>
              </div>

              {totalTopHeavyMoment > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-neutral-500 dark:text-[#6c6c8c] font-bold tracking-widest flex items-center gap-1 whitespace-nowrap"><Weight size={10} /> CENTRO GAL (VCG)</span>
                  <span className={`text-[10px] lg:text-xs font-mono font-bold whitespace-nowrap ${isTopHeavy ? "text-red-600 dark:text-red-500" : "text-emerald-600 dark:text-emerald-500"}`}>
                    M: {totalTopHeavyMoment.toFixed(0)} <span className="opacity-50">tm</span> {isTopHeavy && '(⚠️)'}
                  </span>
                </div>
              )}
            </div>
        )}
      </header>

    <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

    {exportModalOpen && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-neutral-100 dark:bg-neutral-800 p-6 rounded-lg w-96 max-w-[90vw]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-neutral-100 mb-4">Exportar PDF</h3>
          <input
            type="text"
            value={exportFilename}
            onChange={(e) => setExportFilename(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-neutral-700 text-gray-800 dark:text-neutral-100 rounded mb-4 border border-neutral-400 dark:border-neutral-600 focus:border-indigo-500 outline-none"
            placeholder="Nome do arquivo (com .pdf)"
          />
          <div className="flex gap-2 mb-4">
              <button 
                onClick={async () => {
                  if ('showDirectoryPicker' in window) {
                    try {
                      const showDirectoryPicker = (window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
                      if (showDirectoryPicker) {
                        const handle = await showDirectoryPicker();
                        setDirHandle(handle);
                      }
                    } catch {
                      // User cancelled
                    }
                  } else {
                    alert('Seu navegador não suporta seleção de pasta. O arquivo será baixado na pasta padrão de downloads.');
                  }
                }} 
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm transition-colors"
              >
              Escolher Pasta
            </button>
            <button 
              onClick={async () => {
                const blob = await PdfGeneratorService.generateBlob(
                  locations,
                  manifestVoyage || '',
                  manifestAtendimento,
                  manifestRoteiro
                );
                if (dirHandle) {
                  try {
                    const fileHandle = await dirHandle.getFileHandle(exportFilename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    alert('PDF salvo com sucesso na pasta selecionada!');
                  } catch (e) {
                    alert('Erro ao salvar: ' + (e as Error).message);
                  }
                } else {
                  PdfGeneratorService.executeExport(
                    locations,
                    manifestVoyage || '',
                    exportFilename,
                    manifestAtendimento,
                    manifestRoteiro
                  );
                }
                setExportModalOpen(false);
                setDirHandle(null);
              }} 
              className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Salvar
            </button>
          </div>
          <button 
            onClick={() => { setExportModalOpen(false); setDirHandle(null); }} 
            className="w-full text-neutral-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    )}
    </>
  );
}
