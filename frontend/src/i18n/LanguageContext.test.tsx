import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './LanguageContext';

function Probe() { const { language, setLanguage, t, formatDate } = useLanguage(); return <div><span>{language}</span><span>{t('navigation.dashboard')}</span><span>{formatDate('2026-09-08T00:00:00Z', { month: 'long' })}</span><button onClick={() => setLanguage('en')}>EN</button></div>; }

describe('LanguageProvider', () => {
  beforeEach(() => window.localStorage.clear());
  it('defaults to Indonesian and switches/persists English', () => { render(<LanguageProvider><Probe /></LanguageProvider>); expect(screen.getByText('id')).toBeInTheDocument(); expect(screen.getByText('Dasbor')).toBeInTheDocument(); fireEvent.click(screen.getByText('EN')); expect(screen.getByText('en')).toBeInTheDocument(); expect(screen.getByText('Dashboard')).toBeInTheDocument(); expect(window.localStorage.getItem('visitorbmc.language')).toBe('en'); });
  it('restores persisted language after reload', () => { window.localStorage.setItem('visitorbmc.language', 'en'); render(<LanguageProvider><Probe /></LanguageProvider>); expect(screen.getByText('en')).toBeInTheDocument(); expect(screen.getByText('September')).toBeInTheDocument(); });
});
