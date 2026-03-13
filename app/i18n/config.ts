'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslations from './locales/en/translation.json';
import frTranslations from './locales/fr/translation.json';
import esTranslations from './locales/es/translation.json';
import jaTranslations from './locales/ja/translation.json';
import zhTranslations from './locales/zh/translation.json';
import itTranslations from './locales/it/translation.json';
import deTranslations from './locales/de/translation.json';
import ptTranslations from './locales/pt/translation.json';
import lbTranslations from './locales/lb/translation.json';

export const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português' },
  { code: 'lb', name: 'Luxembourgish', flag: '🇱🇺', nativeName: 'Lëtzebuergesch' },
];

export const defaultNS = 'translation';
export const fallbackLng = 'en';

// Configure i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      fr: {
        translation: frTranslations,
      },
      es: {
        translation: esTranslations,
      },
      ja: {
        translation: jaTranslations,
      },
      zh: {
        translation: zhTranslations,
      },
      it: {
        translation: itTranslations,
      },
      de: {
        translation: deTranslations,
      },
      pt: {
        translation: ptTranslations,
      },
      lb: {
        translation: lbTranslations,
      },
    },
    fallbackLng,
    supportedLngs: supportedLanguages.map((lang) => lang.code),
    ns: defaultNS,
    defaultNS,
    interpolation: {
      escapeValue: false, // React already safe from XSS
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;

