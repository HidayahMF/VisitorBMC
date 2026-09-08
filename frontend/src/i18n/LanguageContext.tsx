import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { formatDate, translate, type Language } from './translations';

const STORAGE_KEY = 'visitorbmc.language';
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: string) => string; formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string };
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): Language { const stored = window.localStorage.getItem(STORAGE_KEY); return stored === 'en' || stored === 'id' ? stored : 'id'; }
export function LanguageProvider({ children }: { children: ReactNode }) { const [language, setLanguageState] = useState<Language>(getInitialLanguage); const value = useMemo(() => ({ language, setLanguage: (next: Language) => { setLanguageState(next); window.localStorage.setItem(STORAGE_KEY, next); }, t: (key: string) => translate(language, key), formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) => formatDate(value, language, options) }), [language]); return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>; }
export function useLanguage() { const context = useContext(LanguageContext); if (!context) throw new Error('useLanguage must be used within LanguageProvider'); return context; }
