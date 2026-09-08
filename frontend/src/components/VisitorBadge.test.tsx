import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisitorBadge } from './VisitorBadge';
import { LanguageProvider } from '../i18n/LanguageContext';

const visit = { VisitCode: 'VIS-20260908-001', VisitDate: '2026-09-08', HostName: 'Hidayah Muhammad Fadillah', Company: { Id: 1, CompanyName: 'PT Bakrie Autoparts' }, Visitors: [{ VisitorCode: 'VST-000565', VisitorName: 'Visitor Development Test', PhoneNumber: null }] } as never;

function renderBadge() { return render(<LanguageProvider><VisitorBadge visit={visit} /></LanguageProvider>); }

describe('VisitorBadge', () => {
  beforeEach(() => window.localStorage.clear());
  it('renders a print-focused hierarchy and traceability fields', () => { renderBadge(); expect(screen.getByText('TAMU')).toBeInTheDocument(); expect(screen.getByAltText('Braja Mukti Cakra')).toBeInTheDocument(); expect(screen.getByText('Visitor Development Test')).toBeInTheDocument(); expect(screen.getByText('VST-000565')).toBeInTheDocument(); expect(screen.getByText('PT Bakrie Autoparts')).toBeInTheDocument(); expect(screen.getByText('VIS-20260908-001')).toBeInTheDocument(); });
  it('uses English labels when language preference is English', () => { window.localStorage.setItem('visitorbmc.language', 'en'); renderBadge(); expect(screen.getByText('VISITOR')).toBeInTheDocument(); expect(screen.getByText('Visitor Code')).toBeInTheDocument(); expect(screen.getByText('Visit Date')).toBeInTheDocument(); });
});
