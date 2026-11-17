import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Heart,
  Home,
  LayoutGrid,
  Plus,
  Search,
  Sparkles,
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

const PRIMARY_NAV: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'money', label: 'Money', icon: Wallet },
  { id: 'daily', label: 'Daily', icon: CalendarCheck },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'life', label: 'Life', icon: Heart },
  { id: 'more', label: 'More', icon: LayoutGrid },
];

export default function App() {
  const store = useBentoStore();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrefill, setAssistantPrefill] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);

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
    const map: Record<string, string> = {
      emerald: '#10b981',
      violet: '#8b5cf6',
      champagne: '#d4a053',
      sky: '#3b82f6',
      rose: '#f43f5e',
    };
    document.documentElement.style.setProperty('--accent-primary', map[store.settings.accent] || '#10b981');
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
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
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
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
                      ? 'bg-[var(--accent-soft)] text-emerald-500 font-semibold'
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
          <PWAInstallButton />
          <p className="text-[11px] text-[var(--text-muted)] px-2">
            Local-first · Offline ready
          </p>
        </div>
      </aside>

      {/* Mobile Compact Header (52px) */}
      <header className="lg:hidden sticky top-0 z-30 h-[52px] px-4 flex items-center justify-between gap-3 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b bento-divider">
        <div className="flex items-center gap-2.5 min-w-0">
          <BentoBrandMark size={30} />
          <span className="text-sm font-extrabold tracking-tight font-display whitespace-nowrap">BENTO</span>
        </div>
        <div className="flex items-center gap-1">
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
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)] text-emerald-500"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Quick Add"
            className="min-h-[36px] px-3 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
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
        {store.activeSection === 'more' && <MorePage />}
      </main>

      {/* Mobile Bottom Thumb-Zone Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[var(--bg-surface)]/95 backdrop-blur-md border-t bento-divider grid grid-cols-6 items-center">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = store.activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => store.setActiveSection(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-emerald-500' : 'text-[var(--text-secondary)]'
              }`}
            >
              <Icon className="w-5 h-5" />
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
