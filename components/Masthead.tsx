import React, { useState } from 'react';
import { formatSittingDate } from '../utils/sittingDate';

export type ThemeMode = 'light' | 'dark' | 'amoled';
export type Page = 'matter' | 'chamber';

const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'amoled', label: 'OLED' },
];

interface MastheadProps {
  page: Page;
  onNavigate: (page: Page) => void;
  onOpenRecord: () => void;
  hasCouncil: boolean;
  theme: ThemeMode;
  setThemeMode: (theme: ThemeMode) => void;
}

const tabClass = (on: boolean) =>
  `caps py-1 border-b disabled:opacity-40 disabled:cursor-not-allowed ${on ? 'text-ink border-ink' : 'text-ink2 border-transparent hover:text-ink'}`;

const Masthead: React.FC<MastheadProps> = ({ page, onNavigate, onOpenRecord, hasCouncil, theme, setThemeMode }) => {
  const [sittingDate] = useState(() => formatSittingDate(new Date()));

  return (
    <header className="shrink-0 flex flex-wrap items-center gap-x-8 gap-y-2 px-5 md:px-9 py-3 md:py-0 md:h-[58px] border-b border-rule bg-paper">
      <h1 className="wordmark">My<em>Council</em></h1>

      <nav className="order-last md:order-none w-full md:w-auto flex gap-[22px]" aria-label="Pages">
        <button className={tabClass(page === 'matter')} aria-current={page === 'matter' ? 'page' : undefined} onClick={() => onNavigate('matter')}>
          The matter
        </button>
        <button className={tabClass(page === 'chamber')} aria-current={page === 'chamber' ? 'page' : undefined} onClick={() => onNavigate('chamber')}>
          The chamber
        </button>
        <button className={tabClass(false)} onClick={onOpenRecord} disabled={!hasCouncil}>
          The record
        </button>
      </nav>

      <span className="docket ml-auto hidden md:inline">{sittingDate}</span>

      <div className="ml-auto md:ml-0 flex gap-[10px]" role="group" aria-label="Theme">
        {THEME_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setThemeMode(mode.id)}
            aria-pressed={theme === mode.id}
            className={`caps !text-[11px] underline-offset-[3px] ${theme === mode.id ? 'text-ink underline' : 'text-ink2'}`}
            title={`Switch to ${mode.label} mode`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </header>
  );
};

export default Masthead;
