import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTranslation, type AppLanguage, type Translations } from '../i18n';
import { getPatients } from '../api/client';

export type { AppLanguage } from '../i18n';
export type ViewMode = 'patient' | 'care-team';
export type TextSize = '18px' | '22px';

interface AppContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  patientId: string;
  setPatientId: (id: string) => void;
  availablePatientIds: string[];
  refreshPatientList: () => Promise<void>;
  t: Translations;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('renalis_view_mode');
    return saved === 'care-team' ? 'care-team' : 'patient';
  });

  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('renalis_language');
    if (saved === 'hi' || saved === 'mr' || saved === 'en') return saved;
    return 'en';
  });

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    const saved = localStorage.getItem('renalis_text_size');
    return saved === '22px' ? '22px' : '18px';
  });

  const [patientId, setPatientIdState] = useState<string>(() => {
    const saved = localStorage.getItem('renalis_patient_id');
    return saved || 'SYN-001';
  });

  const [availablePatientIds, setAvailablePatientIds] = useState<string[]>(['SYN-001']);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('renalis_view_mode', mode);
  };

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('renalis_language', lang);
  };

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size);
    localStorage.setItem('renalis_text_size', size);
  };

  const setPatientId = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    setPatientIdState(trimmed);
    localStorage.setItem('renalis_patient_id', trimmed);
  };

  // Synchronize document font-size with textSize setting
  useEffect(() => {
    document.documentElement.style.fontSize = textSize;
    if (textSize === '22px') {
      document.body.classList.add('text-size-larger');
    } else {
      document.body.classList.remove('text-size-larger');
    }
  }, [textSize]);

  // Fetch synthetic patient IDs for the picker
  const refreshPatientList = useCallback(async () => {
    try {
      const res = await getPatients({ limit: 500 });
      if (res && res.patients && res.patients.length > 0) {
        const ids = res.patients.map((p) => p.patient_id);
        setAvailablePatientIds(ids);

        // If current patientId is not valid or was default, keep current or fallback to first
        setPatientIdState((current) => {
          if (!current || current === 'RN-2041') {
            const first = ids[0] || 'SYN-001';
            localStorage.setItem('renalis_patient_id', first);
            return first;
          }
          return current;
        });
      }
    } catch {
      // Backend may be offline; fallback to SYN-001
      setAvailablePatientIds((prev) => (prev.length > 0 ? prev : ['SYN-001']));
    }
  }, []);

  useEffect(() => {
    refreshPatientList();
  }, [refreshPatientList]);

  const t = getTranslation(language);

  return (
    <AppContext.Provider
      value={{
        viewMode,
        setViewMode,
        language,
        setLanguage,
        textSize,
        setTextSize,
        patientId,
        setPatientId,
        availablePatientIds,
        refreshPatientList,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
