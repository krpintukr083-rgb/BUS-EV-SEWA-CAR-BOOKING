import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('driver_app_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('driver_app_language', lang);
  }, [lang]);

  const changeLanguage = (newLang) => {
    if (['en', 'ne', 'hi'].includes(newLang)) {
      setLang(newLang);
    }
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      lang: 'en',
      changeLanguage: () => {},
      t: (k) => translations.en?.[k] || k
    };
  }
  return context;
};
