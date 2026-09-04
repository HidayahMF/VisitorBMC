import { useState, useEffect, useRef, useCallback } from 'react';
import { searchCompanies } from '../api/companies.api';
import { type Company } from '../types/company';

interface Props {
  value: Company | null;
  onChange: (company: Company) => void;
  disabled?: boolean;
}

export function CompanySelector({ value, onChange, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.companyName);
  }, [value]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleQueryChange(q: string) {
    setQuery(q);
    setOpen(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (q.trim().length === 0) {
      setResults([]);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await searchCompanies(q);
        setResults(data);
      } catch { /* ignore */ }
    }, 300);
  }

  function select(c: Company) {
    setQuery(c.companyName);
    onChange(c);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search company..."
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow max-h-48 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {c.companyName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
