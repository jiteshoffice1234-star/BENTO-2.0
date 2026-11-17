import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Heart,
  Home,
  LayoutGrid,
  Lightbulb,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Target,
  Wallet,
} from 'lucide-react';
import { useBentoStore } from './store/useBentoStore';
import { NavSection } from './types/bento';
import { BentoBrandMark } from './components/BentoBrandMark';
import { OnboardingModal } from './components/OnboardingModal';
import { LockScreen } from './components/LockScreen';
import { QuickAddSheet } from './components/QuickAddSheet';
import { AssistantModal } from './components/AssistantModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { HomePage } from './pages/HomePage';
import { MoneyPage } from './pages/MoneyPage';
import { DailyPage } from './pages/DailyPage';
import { GoalsPage } from './pages/GoalsPage';
import { LifePage } from './pages/LifePage';
import { MorePage } from './pages/MorePage';
import { ImprovementsPage } from './pages/ImprovementsPage';

const PRIMARY_NAV: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'money', label: 'Money', icon: Wallet },
  { id: 'daily', label: 'Daily', icon: CalendarCheck },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'life', label: 'Life', icon: Heart },
  { id: 'improvements', label: 'Improve', icon: Lightbulb },
  { id: 'more', label: 'More', icon: LayoutGrid },
];

export default function App() {
  const store = useBentoStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrefill, setAssistantPrefill] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  useEffect(() => {
    void store.hydrate();
  }, []);

  // Theme & Accent synchronization
  useEffect(() => {
    const applyTheme = () => {
      const mode = store.settings.theme;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = mode === 'dark' || (mode === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', isDark);
      setIsDarkTheme(isDark);
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', isDark ? '#090A0D' : '#F6F7F9');
      }
    };
    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, [store.settings.theme]);

  useEffect(() => {
    const map: Record<string, { primary: string; hover: string; soft: string }> = {
      emerald: { primary: '#10b981', hover: '#059669', soft: 'rgba(16, 185, 129, 0.14)' },
      violet: { primary: '#8b5cf6', hover: '#7c3aed', soft: 'rgba(139, 92, 246, 0.14)' },
      champagne: { primary: '#d4a053', hover: '#b88435', soft: 'rgba(212, 160, 83, 0.16)' },
      sky: { primary: '#3b82f6', hover: '#2563eb', soft: 'rgba(59, 130, 246, 0.14)' },
      rose: { primary: '#f43f5e', hover: '#e11d48', soft: 'rgba(244, 63, 94, 0.14)' },
    };
    const chosen = map[store.settings.accent] || map.emerald;
    document.documentElement.style.setProperty('--accent-primary', chosen.primary);
    document.documentElement.style.setProperty('--accent-hover', chosen.hover);
    document.documentElement.style.setProperty('--accent-soft', chosen.soft);
  }, [store.settings.accent]);

  // Keyboard command shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setAssistantPrefill(undefined);
        setAssistantOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!store.hydrated) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex flex-col items-center justify-center gap-4">
        <BentoBrandMark size={56} />
        <div className="text-center">
          <p className="text-lg font-extrabold tracking-tight font-display">BENTO</p>
          <p className="text-xs text-[var(--text-secondary)]">Your Life. One Place.</p>
        </div>
      </div>
    );
  }

  const toggleTheme = () => {
    store.updateSettings({ theme: isDarkTheme ? 'light' : 'dark' });
  };

  const themeToggleLabel = isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme';

  const openAssistantWith = (prefill?: string) => {
    setAssistantPrefill(prefill);
    setAssistantOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-r bento-divider bg-[var(--bg-surface)] p-4 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <BentoBrandMark size={38} />
            <div>
              <p className="text-base font-extrabold tracking-tight font-display leading-none">BENTO</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Your Life. One Place.</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Add</span>
            </button>
            <button
              type="button"
              onClick={() => openAssistantWith(undefined)}
              className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border-hairline)] text-xs font-medium transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Tell BENTO...</span>
              </span>
              <span className="text-[10px] font-mono-num text-[var(--text-muted)]">⌘J</span>
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center justify-between py-2 px-3.5 rounded-xl hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Search & Commands</span>
              </span>
              <span className="text-[10px] font-mono-num text-[var(--text-muted)]">⌘K</span>
            </button>
          </div>

          <nav className="space-y-1">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const active = store.activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => store.setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-accent-soft text-accent font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-4 border-t bento-divider">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeToggleLabel}
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] transition-colors"
          >
            <span className="flex items-center gap-2">
              {isDarkTheme ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{isDarkTheme ? 'Dark theme' : 'Light theme'}</span>
            </span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              Switch
            </span>
          </button>
          <PWAInstallButton />
          <p className="text-[11px] text-[var(--text-muted)] px-2">
            Local-first · Offline ready
          </p>
        </div>
      </aside>

      {/* Mobile Compact Header (48px) */}
      <header className="lg:hidden sticky top-0 z-30 h-12 px-3.5 flex items-center justify-between gap-2 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b bento-divider">
        <div className="flex items-center gap-2 min-w-0">
          <BentoBrandMark size={28} />
          <span className="text-sm font-extrabold tracking-tight font-display whitespace-nowrap">BENTO</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeToggleLabel}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)]"
          >
            {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)]"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => openAssistantWith(undefined)}
            aria-label="Tell BENTO"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)] text-accent"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Quick Add"
            className="min-h-[36px] px-3 flex items-center justify-center gap-1 rounded-xl bg-accent text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-10 max-w-7xl w-full mx-auto">
        {store.activeSection === 'home' && (
          <HomePage
            onOpenQuickAdd={() => setQuickAddOpen(true)}
            onOpenAssistant={() => openAssistantWith(undefined)}
          />
        )}
        {store.activeSection === 'money' && <MoneyPage />}
        {store.activeSection === 'daily' && <DailyPage />}
        {store.activeSection === 'goals' && <GoalsPage />}
        {store.activeSection === 'life' && <LifePage />}
        {store.activeSection === 'improvements' && <ImprovementsPage />}
        {store.activeSection === 'more' && <MorePage />}
      </main>

      {/* Mobile Bottom Thumb-Zone Navigation (56px) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t bento-divider grid grid-cols-7 items-center">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = store.activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => store.setActiveSection(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-accent' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Global Overlays */}
      <OnboardingModal />
      <LockScreen />
      <QuickAddSheet
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onOpenAssistant={(prefill) => openAssistantWith(prefill)}
      />
      <AssistantModal
        isOpen={assistantOpen}
        initialPrompt={assistantPrefill}
        onClose={() => setAssistantOpen(false)}
      />
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenQuickAdd={() => setQuickAddOpen(true)}
        onOpenAssistant={() => openAssistantWith(undefined)}
      />
      <OfflineIndicator />
    </div>
  );
}
