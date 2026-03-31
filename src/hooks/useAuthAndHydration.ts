// src/hooks/useAuthAndHydration.ts
/**
 * @file Hook para gerenciar a autenticação e hidratação inicial de dados.
 * Aprimorado com tratamento de erros robusto e logging.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AppError, handleApplicationError } from '../services/errorHandler';
import { ErrorCodes } from '../lib/errorCodes';
import { logger } from '../utils/logger';
import { retry } from '../utils/retry';
import { useCargoStore } from '@/features/cargoStore';
import { DatabaseService } from '@/infrastructure/DatabaseService';

export const useAuthAndHydration = () => {
    const { hydrateFromDb, shipOperationCode, setShipOperationCode, manifestShipName, manifestVoyage } = useCargoStore();

    const fetchUserData = useCallback(async () => {
        logger.info('Tentando buscar dados do usuário e sessão...');
        try {
            // Usar o utilitário de retry para chamadas ao Supabase
            const { data: { session }, error: sessionError } = await retry(() => supabase.auth.getSession(), {
                retries: 5,
                delay: 500,
                shouldRetry: (err) => {
                    const appErr = handleApplicationError(err);
                    return [ErrorCodes.NETWORK_ERROR, ErrorCodes.API_TIMEOUT].includes(appErr.code);
                }
            });

            if (sessionError) {
                throw new AppError(ErrorCodes.AUTH_FAILED, sessionError.message, 'error', sessionError);
            }

            if (session?.user) {
                logger.info('Usuário autenticado e sessão carregada.', { userId: session.user.id });
                
                // Load stowage plan with retry
                const stowageData = await retry(() => DatabaseService.loadStowagePlan(shipOperationCode), {
                    retries: 3,
                    delay: 1000,
                    shouldRetry: (err) => {
                        const appErr = handleApplicationError(err);
                        return [ErrorCodes.NETWORK_ERROR, ErrorCodes.API_TIMEOUT].includes(appErr.code);
                    }
                });

                if (stowageData) {
                    hydrateFromDb(stowageData);
                    logger.info('Plano de estiba carregado do banco de dados.', {
                        shipOperationCode,
                        manifestShipName: stowageData.manifestShipName,
                        manifestVoyage: stowageData.manifestVoyage
                    });
                } else {
                    logger.warn('Nenhum plano de estiba encontrado para o código da operação.', { shipOperationCode });
                }
                
                // Extract manifest details if available
                if (stowageData?.manifestShipName) {
                    setManifestDetails(stowageData.manifestShipName, stowageData.manifestVoyage || '');
                }
            } else {
                logger.info('Nenhum usuário autenticado.');
                // Clear manifest details when no user
                setManifestDetails(null, null);
            }
        } catch (rawError) {
            const error = handleApplicationError(rawError, { context: 'useAuthAndHydration' });
            logger.error('Falha na autenticação ou hidratação inicial.', error);
            // Don't throw - let the app continue in unauthenticated state
        }
    }, [hydrateFromDb, setManifestDetails, shipOperationCode]);

    useEffect(() => {
        fetchUserData();
        
        // Listen for auth state changes in real time
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            logger.debug(`Evento de autenticação Supabase: ${event}`, { session });
            if (event === 'SIGNED_IN' && session?.user) {
                logger.info('Usuário entrou em sessão.', { userId: session.user.id });
                
                // Load stowage plan on sign in
                const loadStowage = async () => {
                    try {
                        const stowageData = await retry(() => DatabaseService.loadStowagePlan(shipOperationCode), {
                            retries: 3,
                            delay: 1000,
                            shouldRetry: (err) => {
                                const appErr = handleApplicationError(err);
                                return [ErrorCodes.NETWORK_ERROR, ErrorCodes.API_TIMEOUT].includes(appErr.code);
                            }
                        });
                        
                        if (stowageData) {
                            hydrateFromDb(stowageData);
                            logger.info('Plano de estiba carregado após login.', {
                                shipOperationCode: stowageData.shipOperationCode,
                                manifestShipName: stowageData.manifestShipName
                            });
                            
                            // Extract manifest details
                            if (stowageData?.manifestShipName) {
                                setManifestDetails(stowageData.manifestShipName, stowageData.manifestVoyage || '');
                            }
                        } else {
                            logger.warn('Nenhum plano de estiba encontrado após login.', { shipOperationCode });
                        }
                    } catch (error) {
                        logger.error('Falha ao carregar plano de estiba após login:', error);
                        // Don't throw - allow continued use without stowage data
                    }
                };
                
                loadStowage();
            } else if (event === 'SIGNED_OUT') {
                logger.info('Usuário saiu da sessão.');
                // Clear data on sign out
                setManifestDetails(null, null);
                // Optional: Clear other sensitive data if needed
            } else if (event === 'TOKEN_REFRESHED') {
                logger.debug('Token de autenticação atualizado.');
                // Could refresh stowage data here if needed
            }
        });
        
        return () => {
            subscription.unsubscribe();
            logger.debug('Unsubscribed from auth state changes.');
        };
    }, [fetchUserData, hydrateFromDb, setManifestDetails, shipOperationCode]);
};