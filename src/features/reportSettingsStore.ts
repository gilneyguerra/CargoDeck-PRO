import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Configurações de relatório (PDF e CSV) — persistidas no localStorage.
 * - logoBase64: data URL PNG (sem fundo) usada no canto superior esquerdo do cabeçalho
 * - signatoryName / signatoryRole: assinatura única substitui Imediato/Comandante
 */
export interface ReportSettings {
  /** Logo PNG embutida como data URL (apenas .png, idealmente sem fundo) */
  logoBase64: string | null;
  /** Nome do signatário único do relatório (rodapé). Ex.: "João da Silva" */
  signatoryName: string;
  /** Função/cargo do signatário. Ex.: "Supervisor de Carga", "Coordenador de Pátio" */
  signatoryRole: string;
}

interface ReportSettingsState extends ReportSettings {
  setLogoBase64: (logo: string | null) => void;
  setSignatoryName: (name: string) => void;
  setSignatoryRole: (role: string) => void;
  resetAll: () => void;
}

const DEFAULT_SETTINGS: ReportSettings = {
  logoBase64: null,
  signatoryName: '',
  signatoryRole: '',
};

export const useReportSettings = create<ReportSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setLogoBase64: (logo) => set({ logoBase64: logo }),
      setSignatoryName: (name) => set({ signatoryName: name }),
      setSignatoryRole: (role) => set({ signatoryRole: role }),
      resetAll: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'cargodeck-report-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
