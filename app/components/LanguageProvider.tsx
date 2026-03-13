'use client';

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { supportedLanguages, fallbackLng } from '../i18n/config';

export type Language = string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: ReturnType<typeof useTranslation>[0];
  supportedLanguages: typeof supportedLanguages;
  mounted: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [language, setLanguageState] = useState<Language>(fallbackLng);
  
  // Use react-i18next's useTranslation
  const { t } = useTranslation();

  // Effect: initialize language from localStorage or browser
  useEffect(() => {
    // Read saved language from localStorage
    const savedLanguage = localStorage.getItem('language');
    
    if (savedLanguage && supportedLanguages.some((lang) => lang.code === savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
      setLanguageState(savedLanguage);
    } else {
      // Use fallback
      i18n.changeLanguage(fallbackLng);
    }
    
    // Mark as mounted
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    if (supportedLanguages.some((l) => l.code === lang)) {
      setLanguageState(lang);
      i18n.changeLanguage(lang);
      localStorage.setItem('language', lang);
    }
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      supportedLanguages,
      mounted,
    }),
    [language, t, mounted]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

