'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import AuthRefresh from '@/components/auth-refresh';
import {
  TrendingUp, Search, Bell, Settings, LogOut, Menu, Home, User,
  BarChart3, Newspaper, Wallet, Brain,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

/* ── constants ─────────────────────────────────────────────────────────── */
const BACKEND_POLL_MS = 120_000;
const BLUFF_TICK_MS   = 2_500;

type IndexItem = {
  id: string;
  label: string;
  price: number;
  chgPct: number;
  flag?: string;
  color?: string;
};

const SEED_INDICES: IndexItem[] = [
  { id: 'nifty',  label: 'NIFTY 50', price: 22400, chgPct: 0.45, flag: '🇮🇳', color: '#10b981' },
  { id: 'sensex', label: 'SENSEX',   price: 73800, chgPct: 0.32, flag: '🇮🇳', color: '#6366f1' },
  { id: 'nasdaq', label: 'NASDAQ',   price: 17900, chgPct: -0.18, flag: '🇺🇸', color: '#f59e0b' },
  { id: 'sp500',  label: 'S&P 500',  price: 5200,  chgPct: 0.21, flag: '🇺🇸', color: '#ec4899' },
];

const NAV = [
  { icon: Home,       label: 'Dashboard', href: '/dashboard' },
  { icon: BarChart3,  label: 'Stocks',    href: '/dashboard/stocks' },
  { icon: Newspaper,  label: 'News',      href: '/dashboard/news' },
  { icon: Brain,      label: 'AI Chat',   href: '/dashboard/ai' },
  { icon: Wallet,     label: 'Portfolio', href: '/dashboard/portfolio' },
];

/* ── layout ────────────────────────────────────────────────────────────── */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [indices, setIndices] = useState<IndexItem[]>(SEED_INDICES);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  /* fetch live indices for the ticker */
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const res = await fetch('/api/market/realtime', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        if (Array.isArray(data?.indices)) setIndices(data.indices);
      } catch { /* keep last data */ }
    };
    pull();
    const iv = setInterval(pull, BACKEND_POLL_MS);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  /* bluff micro-movements for the ticker */
  useEffect(() => {
    const iv = setInterval(() => {
      setIndices((prev) =>
        prev.map((item) => {
          const p = Number(item.price);
          if (!Number.isFinite(p) || p <= 0) return item;
          const d = (Math.random() - 0.5) * 0.06;
          return {
            ...item,
            price: Math.max(0.01, Number((p * (1 + d / 100)).toFixed(2))),
            chgPct: Number((Number(item.chgPct ?? 0) + d * 0.35).toFixed(2)),
          };
        })
      );
    }, BLUFF_TICK_MS);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!profileMenuRef.current?.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white flex overflow-hidden">
      <AuthRefresh />

      {/* ── ambient grid bg ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(16,185,129,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.04) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#10b981]/3 via-transparent to-[#6366f1]/3" />
      </div>

      {/* ═══════ SIDEBAR ═══════ */}
      <aside
        className={`relative z-20 flex flex-col shrink-0 transition-all duration-300 ease-in-out
          bg-linear-to-b from-[#0d0d16] to-[#0a0a12] border-r border-[#1a1a2e]
          ${sidebarOpen ? 'w-56' : 'w-16'}`}
      >
        {/* logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-[#1a1a2e] ${sidebarOpen ? '' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.4)] shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && <span className="text-lg font-bold tracking-tight">Stonks</span>}
        </div>

        {/* nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV.map(({ icon: Icon, label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${active
                    ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25'
                    : 'text-gray-400 hover:bg-[#1a1a2e] hover:text-white'
                  } ${sidebarOpen ? '' : 'justify-center'}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#10b981]' : ''}`} />
                {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
                {sidebarOpen && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#10b981]" />}
              </Link>
            );
          })}
        </nav>

        {/* bottom */}
        <div className="px-2 pb-4 space-y-1 border-t border-[#1a1a2e] pt-3">
          <Link
            href="#settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-[#1a1a2e] hover:text-white transition-all ${sidebarOpen ? '' : 'justify-center'}`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Settings</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-[#ef4444]/10 hover:text-[#ef4444] transition-all ${sidebarOpen ? '' : 'justify-center'}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ═══════ MAIN ═══════ */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-auto">
        {/* top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-3.5 bg-[#0a0a12]/80 backdrop-blur-xl border-b border-[#1a1a2e]">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a2e] transition-all"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* live ticker */}
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-5 animate-[tickerScroll_30s_linear_infinite]">
              {[...indices, ...indices].map((idx, i) => (
                <span key={i} className="text-xs whitespace-nowrap flex items-center gap-1.5 text-gray-400">
                  <span className="text-white font-medium">{idx.label}</span>
                  <span style={{ color: (idx.chgPct ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
                    {(idx.chgPct ?? 0) >= 0 ? '+' : ''}
                    {(idx.chgPct ?? 0).toFixed(2)}%
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* search → stocks page */}
          <Link
            href="/dashboard/stocks"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-gray-400 hover:border-[#10b981]/40 hover:text-white transition-all text-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:block">Search stocks…</span>
            <kbd className="hidden md:block text-[10px] px-1.5 py-0.5 bg-[#0a0a12] rounded border border-[#2a2a3e]">⌘K</kbd>
          </Link>

          {/* bell */}
          <button className="relative p-2 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-gray-400 hover:text-white transition-all">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
          </button>

          {/* avatar dropdown */}
          <div ref={profileMenuRef} className="relative">
            <button
              onClick={() => setProfileMenuOpen((v) => !v)}
              title="Account"
              aria-label="Account"
              className="w-8 h-8 rounded-xl bg-linear-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            >
              R
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-10 w-40 rounded-xl border border-[#2a2a3e] bg-[#0f1324] p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    router.push('/dashboard/profile');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1a1f34] hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#ef4444]/10 hover:text-[#ef4444] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* page content */}
        <main className="flex-1 px-6 py-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
