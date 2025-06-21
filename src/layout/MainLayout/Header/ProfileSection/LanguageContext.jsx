import React, { createContext, useState, useEffect, useContext } from 'react';
import { translations } from './translations';

// Context with default values
const LanguageContext = createContext({
  language: 'fr',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key, params = {}) => key,
});

// Provider component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'fr');

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'fr' ? 'en' : 'fr'));
  };

  const t = (key, params = {}) => {
    let text = translations[language]?.[key] || key;
    Object.keys(params).forEach((param) => {
      text = text.replace(`{${param}}`, params[param]);
    });
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hooks
export const useLanguage = () => {
  const { language, toggleLanguage } = useContext(LanguageContext);
  return { language, toggleLanguage };
};

export const useTranslation = () => {
  const { t, language } = useContext(LanguageContext);
  return { t, language };
};