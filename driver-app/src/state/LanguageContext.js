import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS } from '../constants/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('@driver_app_language');
      if (savedLang && ['en', 'ne', 'hi'].includes(savedLang)) {
        setLanguage(savedLang);
      }
    } catch (e) {
      console.warn('Failed to load language', e);
    }
  };

  const changeLanguage = async (newLang) => {
    if (!['en', 'ne', 'hi'].includes(newLang)) return;
    try {
      await AsyncStorage.setItem('@driver_app_language', newLang);
      setLanguage(newLang);
    } catch (e) {
      console.warn('Failed to save language', e);
    }
  };

  const t = (key) => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
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
