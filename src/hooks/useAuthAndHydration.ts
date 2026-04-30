// src/hooks/useAuthAndHydration.ts
/**
 * @file Hook para gerenciar a autenticacao e hidratacao inicial de dados.
 * Aprimorado com tratamento de erros robusto e logging.
 */
import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '../utils/logger';
import { useCargoStore } from '@/features/cargoStore';
import { useReportSettings } from '@/features/reportSettingsStore';
import { useErrorReporter } from '@/features/errorReporter';
import { DatabaseService } from '@/infrastructure/DatabaseService';

// Chaves auxiliares de localStorage que pertencem ao usuário corrente
// (todas devem ser zeradas no logout para isolamento entre sessões).
const USER_SCOPED_LOCAL_STORAGE_KEYS = [
    'cargodeck-creation-draft',
    'cargodeck-modal-generation-filter',
    'cargodeck-report-settings', // limpo via resetAll() do store, mas a chave também
];

/**
 * Limpa todo o estado de aplicação ligado ao usuário (cargos, configs, drafts, logs).
 * Chamado no SIGNED_OUT — também útil em testes / reset manual.
 */
function clearAllUserState() {
    // Resets do Zustand
    useCargoStore.getState().resetToDefault();
    useReportSettings.getState().resetAll();
    useErrorReporter.getState().clear();

    // Chaves auxiliares de localStorage
    for (const k of USER_SCOPED_LOCAL_STORAGE_KEYS) {
        try { localStorage.removeItem(k); } catch { /* ignore quota / privacy mode */ }
    }
    logger.info('Estado da aplicação resetado para Default após logout.');
}

export const useAuthAndHydration = () => {
    const { hydrateFromDb, setManifestDetails, setHydrationStatus } = useCargoStore();

    const fetchUserData = useCallback(async () => {
        logger.info('Tentando buscar dados do usuario e sessao...');
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                logger.warn('Erro ao obter sessao:', { message: sessionError.message });
            }

            if (session?.user) {
                logger.info('Usuario autenticado e sessao carregada.', { userId: session.user.id });
                
                // Load stowage plan
                const stowageData = await DatabaseService.loadStowagePlan();

                if (stowageData) {
                    hydrateFromDb(stowageData);
                    logger.info('Plano de estiba carregado do banco de dados.', {
                        manifestShipName: stowageData.manifestShipName
                    });
                    
                    if (stowageData?.manifestShipName) {
                        setManifestDetails(stowageData.manifestShipName, stowageData.manifestAtendimento || '', stowageData.manifestRoteiro || []);
                    }
                } else {
                    logger.warn('Nenhum plano de estiba encontrado.');
                }
            } else {
                logger.info('Nenhum usuario autenticado.');
            }
            
            // Marcar hidratação como concluída após a tentativa inicial (com ou sem dados)
            setHydrationStatus(true);
        } catch (rawError) {
            logger.error('Falha na autenticacao ou hidratacao inicial.', rawError);
            // Ainda marcar como hidratado para evitar bloqueio de auto-save
            setHydrationStatus(true);
        }
    }, [hydrateFromDb, setManifestDetails, setHydrationStatus]);

    useEffect(() => {
        fetchUserData();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            logger.debug(`Evento de autenticacao Supabase: ${event}`, { session });
            if (event === 'SIGNED_IN' && session?.user) {
                logger.info('Usuario entrou em sessao.', { userId: session.user.id });
                
                // Reset hydration status before loading new data to block auto-save during load
                setHydrationStatus(false);
                
                const loadStowage = async () => {
                    try {
                        const stowageData = await DatabaseService.loadStowagePlan();
                        
                        if (stowageData) {
                            hydrateFromDb(stowageData);
                            logger.info('Plano de estiba carregado apos login.', {
                                manifestShipName: stowageData.manifestShipName
                            });
                            
                            if (stowageData?.manifestShipName) {
                                setManifestDetails(stowageData.manifestShipName, stowageData.manifestAtendimento || '', stowageData.manifestRoteiro || []);
                            }
                        } else {
                            logger.warn('Nenhum plano de estiba encontrado apos login.');
                        }
                    } catch (error) {
                        logger.error('Falha ao carregar plano de estiba apos login:', error);
                    } finally {
                        // Mark hydration as complete after attempting to load data (success or failure)
                        setHydrationStatus(true);
                    }
                };
                
                loadStowage();
            } else if (event === 'SIGNED_OUT') {
                logger.info('Usuario saiu da sessao — limpando estado completo.');
                // Reset profundo: cargos, locations, configs, logs, drafts em localStorage
                clearAllUserState();
                setManifestDetails(null, null, []);
            }
        });
        
        return () => {
            subscription.unsubscribe();
            logger.debug('Unsubscribed from auth state changes.');
        };
    }, [fetchUserData, hydrateFromDb, setManifestDetails, setHydrationStatus]);
};