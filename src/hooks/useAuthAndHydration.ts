// src/hooks/useAuthAndHydration.ts
/**
 * @file Hook para gerenciar a autenticacao e hidratacao inicial de dados.
 * Aprimorado com tratamento de erros robusto e logging.
 */
import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '../utils/logger';
import { useCargoStore } from '@/features/cargoStore';
import { DatabaseService } from '@/infrastructure/DatabaseService';

export const useAuthAndHydration = () => {
    const { hydrateFromDb, shipOperationCode, setManifestDetails } = useCargoStore();

    const fetchUserData = useCallback(async () => {
        logger.info('Tentando buscar dados do usuario e sessao...');
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                logger.warn('Erro ao obter sessao:', sessionError.message);
            }

            if (session?.user) {
                logger.info('Usuario autenticado e sessao carregada.', { userId: session.user.id });
                
                // Load stowage plan
                const stowageData = await DatabaseService.loadStowagePlan(shipOperationCode);

                if (stowageData) {
                    hydrateFromDb(stowageData);
                    logger.info('Plano de estiba carregado do banco de dados.', {
                        shipOperationCode,
                        manifestShipName: stowageData.manifestShipName,
                        manifestVoyage: stowageData.manifestVoyage
                    });
                    
                    if (stowageData?.manifestShipName) {
                        setManifestDetails(stowageData.manifestShipName, stowageData.manifestVoyage || '');
                    }
                } else {
                    logger.warn('Nenhum plano de estiba encontrado para o codigo da operacao.', { shipOperationCode });
                }
            } else {
                logger.info('Nenhum usuario autenticado.');
            }
        } catch (rawError) {
            logger.error('Falha na autenticacao ou hidratacao inicial.', rawError);
        }
    }, [hydrateFromDb, setManifestDetails, shipOperationCode]);

    useEffect(() => {
        fetchUserData();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            logger.debug(`Evento de autenticacao Supabase: ${event}`, { session });
            if (event === 'SIGNED_IN' && session?.user) {
                logger.info('Usuario entrou em sessao.', { userId: session.user.id });
                
                const loadStowage = async () => {
                    try {
                        const stowageData = await DatabaseService.loadStowagePlan(shipOperationCode);
                        
                        if (stowageData) {
                            hydrateFromDb(stowageData);
                            logger.info('Plano de estiba carregado apos login.', {
                                shipOperationCode: stowageData.shipOperationCode,
                                manifestShipName: stowageData.manifestShipName
                            });
                            
                            if (stowageData?.manifestShipName) {
                                setManifestDetails(stowageData.manifestShipName, stowageData.manifestVoyage || '');
                            }
                        } else {
                            logger.warn('Nenhum plano de estiba encontrado apos login.', { shipOperationCode });
                        }
                    } catch (error) {
                        logger.error('Falha ao carregar plano de estiba apos login:', error);
                    }
                };
                
                loadStowage();
            } else if (event === 'SIGNED_OUT') {
                logger.info('Usuario saiu da sessao.');
                setManifestDetails(null, null);
            }
        });
        
        return () => {
            subscription.unsubscribe();
            logger.debug('Unsubscribed from auth state changes.');
        };
    }, [fetchUserData, hydrateFromDb, setManifestDetails, shipOperationCode]);
};