import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, TranslationDict } from '../i18n/translations';

type Language = 'it' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationDict) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('RECALL_LANGUAGE');
    if (saved === 'it' || saved === 'en') {
      return saved;
    }
    return 'it'; // Default: Italiano
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('RECALL_LANGUAGE', lang);
    
    // Synchronize language with the backend if user is logged in
    const savedUser = localStorage.getItem('recall_user_profile');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          fetch('/api/users/update-language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: parsed.email.toLowerCase().trim(),
              language: lang,
            }),
          })
            .then(r => r.json())
            .then(res => {
              if (res.success) {
                console.log(`[Language Backend Sync] Language updated on server: ${lang}`);
              }
            })
            .catch(err => console.warn('[Language Backend Sync] Failed updating language on server', err));
        }
      } catch (e) {
        // ignore
      }
    }
    
    // Dispatch a custom event so other modules can react immediately if needed
    window.dispatchEvent(new Event('languagechange'));
  };

  const t = (key: keyof TranslationDict): string => {
    const dict = translations[language];
    if (dict && key in dict) {
      return dict[key];
    }
    // Fallback to Italian if not found
    const fallbackDict = translations['it'];
    if (fallbackDict && key in fallbackDict) {
      return fallbackDict[key];
    }
    return String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
