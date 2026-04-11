'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/hooks/use-wishlist';
import {
  AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from 'recharts';
import {
  Heart, ChevronRight, ArrowUpRight, ArrowDownRight,
  Newspaper, BarChart3, TrendingUp, TrendingDown, Clock,
  ExternalLink, Zap, Wallet,
} from 'lucide-react';

/* ── types ─────────────────────────────────────────────────────────────── */
type Stock = {
  sym: string;
  name: string;
  sector: string;
  price: number;
  chg: number;
  vol: string;
  color: string;
  live: boolean;
  spark?: { v: number }[];
};
//comments
type NewsItem = {
  headline: string;
  description?: string | null;
  sentiment: string;
  sentimentReview?: string | null;
  impact: string;
  time: string;
  source: string;
  url: string | null;
};

type PortfolioHolding = {
  sym: string;
  name: string;
  quantity: number;
  avgPrice: number;
  costBasis: number;
};

type PortfolioTxn = {
  realizedPnl: number;
  createdAt: string;
};

type PortfolioSnapshot = {
  holdings: PortfolioHolding[];
  transactions: PortfolioTxn[];
  summary: {
    totalInvested: number;
    realizedPnl: number;
  };
};

/* ── sentiment / impact constants ──────────────────────────────────────── */
const SENTIMENT_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  bullish: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: '↑' },
  bearish: { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     icon: '↓' },
  neutral: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   icon: '→' },
};

const IMPACT_COLORS: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const ALLOCATION_COLORS = ['#10b981', '#38bdf8', '#a78bfa', '#f59e0b', '#ef4444', '#22c55e'];

function formatInr(value: number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function AllocationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const name = row?.name || 'Stock';
  const value = Number(row?.value || 0);

  return (
    <div className="rounded-lg border border-[#2a3958] bg-[#0a1226]/95 px-2.5 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row?.color || '#38bdf8' }} />
        <span className="font-semibold text-white">{name}</span>
        <span className="text-[#93c5fd] tabular-nums">{formatInr(value)}</span>
      </div>
    </div>
  );
}

/** Derive accent color from spark trend: green / yellow / red */
function sparkAccent(spark?: { v: number }[]): { color: string; pct: number } {
  if (!spark || spark.length < 2) return { color: '#f59e0b', pct: 0 };
  const first = spark[0].v;
  const last = spark[spark.length - 1].v;
  const pct = ((last - first) / first) * 100;
  if (pct > 0.3) return { color: '#10b981', pct };
  if (pct < -0.3) return { color: '#ef4444', pct };
  return { color: '#f59e0b', pct };
}

/* ── main page ─────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { toggle, has } = useWishlist();
  const [stocks, setStocks]   = useState<Stock[]>([]);
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);

  // per-symbol sparkline data keyed by sym
  const [sparks, setSparks] = useState<Record<string, { v: number }[]>>({});
  const loadedStocksRef = useRef(false);

  useEffect(() => {
    let alive = true;

    const pull = async () => {
      try {
        const r = await fetch('/api/market/stocks', { cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;

        if (Array.isArray(d?.stocks)) {
          const nextStocks = d.stocks as Stock[];
          setStocks(nextStocks);

          const nextSparks: Record<string, { v: number }[]> = {};
          nextStocks.forEach((s) => {
            if (Array.isArray(s.spark) && s.spark.length > 0) {
              nextSparks[s.sym] = s.spark;
            }
          });
          setSparks(nextSparks);
        }
      } catch {
        // keep previous snapshot
      } finally {
        if (!loadedStocksRef.current) {
          loadedStocksRef.current = true;
          setLoading(false);
        }
      }
    };

    pull();
    const iv = setInterval(pull, 1_000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/news/realtime', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (Array.isArray(d?.news)) setNews(d.news);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError('');
    try {
      const res = await fetch('/api/wallet', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to fetch wallet');
      }
      const nextBalance = Number(data?.balance ?? 0);
      setWalletBalance(Number.isFinite(nextBalance) ? nextBalance : 0);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : 'Failed to fetch wallet');
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    let alive = true;

    const loadPortfolio = async () => {
      try {
        const res = await fetch('/api/portfolio', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok) {
          setPortfolio(data as PortfolioSnapshot);
        }
      } catch {
        // keep previous portfolio snapshot
      } finally {
        if (alive) setPortfolioLoading(false);
      }
    };

    loadPortfolio();
    const iv = setInterval(loadPortfolio, 12_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const addMoneyToWallet = useCallback(async () => {
    setWalletError('');
    setWalletSuccess('');
    const amount = Number(walletAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setWalletError('Enter a valid amount greater than 0');
      return;
    }

    setWalletSubmitting(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to add money');
      }

      const nextBalance = Number(data?.balance ?? walletBalance);
      setWalletBalance(Number.isFinite(nextBalance) ? nextBalance : walletBalance);
      setWalletAmount('');
      setWalletSuccess('Money added successfully');
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : 'Failed to add money');
    } finally {
      setWalletSubmitting(false);
    }
  }, [walletAmount, walletBalance]);

  const wishlisted    = stocks.filter((s) => has(s.sym));
  const previewStocks = stocks.slice(0, 8);
  const previewNews   = news.slice(0, 4);

  const priceBySym = useCallback(
    (sym: string) => {
      const row = stocks.find((s) => s.sym === sym);
      const p = Number(row?.price);
      return Number.isFinite(p) && p > 0 ? p : null;
    },
    [stocks]
  );

  const investedCurrentData = useCallback(() => {
    const invested = Number(portfolio?.summary?.totalInvested || 0);
    const realized = Number(portfolio?.summary?.realizedPnl || 0);

    const current = (portfolio?.holdings || []).reduce((sum, h) => {
      const live = priceBySym(h.sym);
      const value = live != null ? live * Number(h.quantity || 0) : Number(h.costBasis || 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    return [
      { name: 'Invested', value: Number(invested.toFixed(2)) },
      { name: 'Current', value: Number(current.toFixed(2)) },
      { name: 'Realized', value: Number(realized.toFixed(2)) },
    ];
  }, [portfolio, priceBySym]);

  const allocationData = useCallback(() => {
    const rows = (portfolio?.holdings || []).map((h) => {
      const live = priceBySym(h.sym);
      const value = live != null ? live * Number(h.quantity || 0) : Number(h.costBasis || 0);
      return { name: h.sym, value: Number.isFinite(value) ? value : 0 };
    });
    return rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [portfolio, priceBySym]);

  const realizedTrendData = useCallback(() => {
    const tx = Array.isArray(portfolio?.transactions) ? [...portfolio.transactions] : [];
    tx.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let running = 0;
    const rows = tx.map((t) => {
      running += Number(t.realizedPnl || 0);
      const d = new Date(t.createdAt);
      const label = Number.isNaN(d.getTime())
        ? 'N/A'
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: label, value: Number(running.toFixed(2)) };
    });

    return rows.slice(-10);
  }, [portfolio]);

  const moneyChartData = useMemo(() => investedCurrentData(), [investedCurrentData]);
  const allocationChartData = useMemo(() => allocationData(), [allocationData]);
  const realizedChartData = useMemo(() => realizedTrendData(), [realizedTrendData]);

  const totalInvested = Number(portfolio?.summary?.totalInvested || 0);
  const totalCurrent = moneyChartData.find((row) => row.name === 'Current')?.value || 0;
  const unrealized = totalCurrent - totalInvested;
  const unrealizedPct = totalInvested > 0 ? (unrealized / totalInvested) * 100 : 0;

  return (
    <>
      {/* ── header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-[#10b981] font-medium tracking-widest uppercase mb-1">
            Live · Auto-refreshing
          </p>
          <h1 className="text-2xl font-bold">Market Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
          </span>
          Markets Open
        </div>
      </div>

      <section className="flex justify-end">
        <div className="w-full max-w-sm rounded-xl border border-[#1f2538] bg-linear-to-br from-[#0e1222] to-[#0b0f1b] p-3.5 shadow-[0_10px_32px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#10b981]/15 border border-[#10b981]/20 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-[#22c55e]" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Virtual Wallet</p>
                <p className="text-[11px] text-gray-400">Current Balance</p>
              </div>
            </div>
            {walletLoading && <span className="text-[10px] text-gray-500">Loading...</span>}
          </div>

          <p className="text-xl font-bold text-white tabular-nums mb-3">
            ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          <div className="flex gap-2">
            <input
              id="wallet-amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="Amount"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              className="h-8.5 w-full rounded-lg border border-[#2a2f45] bg-[#111528] px-2.5 text-xs text-white placeholder:text-gray-500 outline-none focus:border-[#10b981]/60"
            />
            <button
              onClick={addMoneyToWallet}
              disabled={walletSubmitting || walletLoading}
              className="h-8.5 shrink-0 rounded-lg bg-[#10b981] px-3 text-xs font-semibold text-[#06110d] hover:bg-[#34d399] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {walletSubmitting ? 'Adding...' : 'Add'}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {[500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setWalletAmount(String(amt))}
                  className="h-6 rounded-md border border-[#2a2f45] bg-[#111528] px-2 text-[10px] text-gray-300 hover:border-[#10b981]/40 hover:text-white transition-colors"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <button
              onClick={loadWallet}
              disabled={walletLoading}
              className="h-6 rounded-md border border-[#2a2f45] px-2 text-[10px] text-gray-400 hover:text-white hover:border-[#3a415d] disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {walletError && <p className="text-[11px] text-[#ef4444] mt-2">{walletError}</p>}
          {!walletError && walletSuccess && <p className="text-[11px] text-[#10b981] mt-2">{walletSuccess}</p>}
        </div>
      </section>

      {/* ═══════════ PORTFOLIO CHARTS ═══════════ */}
      <section>
        <SectionHeader
          icon={<TrendingUp className="w-4 h-4 text-[#38bdf8]" />}
          title="Portfolio Charts"
          count={portfolio && Array.isArray(portfolio.holdings) ? `${portfolio.holdings.length} holdings` : undefined}
          href="/dashboard/portfolio"
        />

        {portfolioLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl border border-[#1a1a2e] bg-[#0f0f1a] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#1d2537] bg-linear-to-br from-[#11172a] to-[#0c1220] p-3">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Invested</p>
                <p className="mt-1 text-lg font-semibold text-white tabular-nums">{formatInr(totalInvested)}</p>
              </div>
              <div className="rounded-xl border border-[#1d2537] bg-linear-to-br from-[#0f1b28] to-[#0b1420] p-3">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Current Value</p>
                <p className="mt-1 text-lg font-semibold text-white tabular-nums">{formatInr(totalCurrent)}</p>
              </div>
              <div className="rounded-xl border border-[#1d2537] bg-linear-to-br from-[#1a1828] to-[#121022] p-3">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Unrealized P&amp;L</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${unrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatInr(unrealized)}
                </p>
                <p className={`text-xs mt-0.5 ${unrealized >= 0 ? 'text-emerald-300/80' : 'text-red-300/80'}`}>
                  {unrealizedPct >= 0 ? '+' : ''}{unrealizedPct.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-5 rounded-2xl border border-[#1a1f33] bg-linear-to-b from-[#0f1528] to-[#0a1020] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)]">
                <h3 className="text-sm font-semibold text-white mb-3">Money Overview</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moneyChartData} barGap={10}>
                      <defs>
                        <linearGradient id="portfolioBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.45} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2740" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#a7b2cb', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#a7b2cb', fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
                      <Tooltip
                        cursor={{ fill: 'rgba(34, 211, 238, 0.08)' }}
                        contentStyle={{ background: '#0c1120', border: '1px solid #25304b', borderRadius: 10, color: '#e2e8f0' }}
                        formatter={(value: number) => formatInr(Number(value || 0))}
                      />
                      <Bar dataKey="value" radius={[8, 8, 2, 2]} fill="url(#portfolioBarGradient)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 rounded-2xl border border-[#1a1f33] bg-linear-to-b from-[#161227] to-[#0d0f1d] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)]">
                <h3 className="text-sm font-semibold text-white mb-3">Top Allocation</h3>
                {allocationChartData.length === 0 ? (
                  <p className="text-sm text-gray-500 mt-10 text-center">No allocation data yet.</p>
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={allocationChartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={78}
                            paddingAngle={3}
                            stroke="#0b1020"
                            strokeWidth={2}
                          >
                            {allocationChartData.map((_, idx) => (
                              <Cell key={idx} fill={ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={<AllocationTooltip />}
                            cursor={false}
                            wrapperStyle={{ outline: 'none', zIndex: 20 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {allocationChartData.map((row, idx) => (
                        <div key={row.name} className="flex items-center gap-1.5 text-[11px] text-gray-300 rounded-md px-1.5 py-1 hover:bg-white/5 transition-colors">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }}
                          />
                          <span className="truncate">{row.name}</span>
                          <span className="ml-auto tabular-nums text-gray-400">{formatInr(row.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="lg:col-span-3 rounded-2xl border border-[#1a1f33] bg-linear-to-b from-[#10251f] to-[#0b1614] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)]">
                <h3 className="text-sm font-semibold text-white mb-3">Realized P&amp;L Trend</h3>
                {realizedChartData.length === 0 ? (
                  <p className="text-sm text-gray-500 mt-10 text-center">No realized P&amp;L history yet.</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={realizedChartData}>
                        <defs>
                          <linearGradient id="realizedTrendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.75} />
                            <stop offset="100%" stopColor="#34d399" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1d2d2a" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: '#9fb6ae', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#9fb6ae', fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
                        <Tooltip
                          contentStyle={{ background: '#0c1120', border: '1px solid #27413a', borderRadius: 10, color: '#d1fae5' }}
                          formatter={(value: number) => formatInr(Number(value || 0))}
                        />
                        <Area type="monotone" dataKey="value" stroke="none" fill="url(#realizedTrendGradient)" />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.4} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════ STOCKS ═══════════ */}
      <section>
        <SectionHeader
          icon={<BarChart3 className="w-4 h-4 text-[#10b981]" />}
          title="Stocks"
          count={`${stocks.length} available`}
          href="/dashboard/stocks"
        />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-22 rounded-2xl border border-[#1a1a2e] bg-[#0f0f1a] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {previewStocks.map((s) => (
              <StockCard key={s.sym} stock={s} wished={has(s.sym)} onToggle={() => toggle(s.sym)} spark={sparks[s.sym]} />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════ WISHLIST ═══════════ */}
      <section>
        <SectionHeader
          icon={<Heart className="w-4 h-4 text-[#ef4444]" />}
          title="Wishlist"
          count={`${wishlisted.length} saved`}
          href={wishlisted.length > 8 ? '/dashboard/stocks?filter=wishlist' : undefined}
        />
        {wishlisted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2a2a3e] bg-[#0f0f1a]/50 p-10 text-center">
            <Heart className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No stocks wishlisted yet</p>
            <p className="text-xs text-gray-600 mt-1">Tap the heart on any stock to save it</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {wishlisted.slice(0, 8).map((s) => (
              <StockCard key={s.sym} stock={s} wished onToggle={() => toggle(s.sym)} spark={sparks[s.sym]} />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════ NEWS ═══════════ */}
      <section>
        <SectionHeader
          icon={<Newspaper className="w-4 h-4 text-[#f59e0b]" />}
          title="News & Sentiment"
          count={news.length > 0 ? `${news.length} articles` : undefined}
          href="/dashboard/news"
        />
        {previewNews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2a2a3e] bg-[#0f0f1a]/50 p-10 text-center">
            <Newspaper className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Loading news…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {previewNews.map((n, i) => (
              <NewsCard key={i} item={n} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function SectionHeader({
  icon,
  title,
  count,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  count?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        {icon}
        <h2 className="text-lg font-bold">{title}</h2>
        {count && (
          <span className="text-[10px] text-gray-500 bg-[#1a1a2e] px-2.5 py-0.5 rounded-full font-medium">
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-sm text-[#10b981] hover:text-[#34d399] transition-colors font-medium">
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

/* ── STOCK CARD (vertical with sparkline) ── */
function StockCard({
  stock,
  wished,
  onToggle,
  spark,
}: {
  stock: Stock;
  wished: boolean;
  onToggle: () => void;
  spark?: { v: number }[];
}) {
  const symbol = stock.sym.replace('.NSE', '');
  const shouldUseDemoFlow = symbol !== 'AAPL' && symbol !== 'TSLA';

  const seedSpark = useMemo(() => {
    if (Array.isArray(spark) && spark.length > 0) return spark.map((p) => ({ v: Number(p.v || 0) }));
    const base = Number(stock.price || 1);
    return Array.from({ length: 26 }).map((_, i) => ({
      v: Number((base * (1 + Math.sin(i / 4) * 0.0025)).toFixed(3)),
    }));
  }, [spark, stock.price]);

  const [demoSpark, setDemoSpark] = useState<{ v: number }[]>(seedSpark);
  const demoVelocityRef = useRef(0);

  useEffect(() => {
    setDemoSpark(seedSpark);
    demoVelocityRef.current = 0;
  }, [seedSpark]);

  useEffect(() => {
    if (!shouldUseDemoFlow) return;

    const iv = setInterval(() => {
      setDemoSpark((prev) => {
        const source = prev.length > 1 ? prev : seedSpark;
        const last = Number(source[source.length - 1]?.v || stock.price || 1);
        const base = Number(seedSpark[0]?.v || stock.price || 1);
        const distanceFromBasePct = ((last - base) / base) * 100;
        const meanRevert = -distanceFromBasePct * 0.18;
        const momentum = demoVelocityRef.current * 0.55;
        const baseShock = (Math.random() - 0.5) * 1.8;
        const burstShock = Math.random() < 0.12 ? (Math.random() - 0.5) * 3.2 : 0;
        const driftPct = meanRevert + momentum + baseShock + burstShock;
        demoVelocityRef.current = driftPct;

        const unclampedNext = last * (1 + driftPct / 100);
        const upperBand = base * 1.045;
        const lowerBand = base * 0.955;
        const next = Math.max(lowerBand, Math.min(upperBand, unclampedNext));
        const nextSeries = [...source, { v: Number(next.toFixed(3)) }];
        return nextSeries.slice(-28);
      });
    }, 900);

    return () => clearInterval(iv);
  }, [seedSpark, shouldUseDemoFlow, stock.price]);

  const chartSeries = shouldUseDemoFlow ? demoSpark : seedSpark;
  const basePrice = Number(chartSeries[0]?.v || stock.price || 1);
  const deviationSeries = chartSeries.map((point) => ({
    dev: Number((((Number(point.v || basePrice) - basePrice) / basePrice) * 100 * 4).toFixed(3)),
  }));

  const displayedPrice = shouldUseDemoFlow
    ? Number(chartSeries[chartSeries.length - 1]?.v || stock.price)
    : Number(stock.price);

  const { color: accent, pct } = sparkAccent(chartSeries);
  const up = pct >= 0;
  const gradientId = `sg-${stock.sym.replace(/[^a-zA-Z0-9]/g, '')}`;
  const glowId = `sg-glow-${stock.sym.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="group relative rounded-2xl border border-[#1a1a2e] bg-[#0c0c18] hover:border-[#2a2a3e] transition-all duration-200 hover:bg-[#0e0e1c] overflow-hidden">
      {/* header row */}
      <div className="flex items-center gap-2.5 p-3.5 pb-0">
        {/* icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-extrabold shrink-0 border"
          style={{
            background: `linear-gradient(135deg, ${accent}12, ${accent}06)`,
            borderColor: accent + '20',
            color: accent,
          }}
        >
          {stock.sym.replace('.NSE', '').slice(0, 2)}
        </div>

        {/* name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white">{stock.sym.replace('.NSE', '')}</span>
            {stock.live && <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />}
          </div>
          <p className="text-[10px] text-gray-500 truncate">{stock.name}</p>
        </div>

        {/* heart */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-all shrink-0"
        >
          <Heart
            className={`w-4 h-4 transition-all duration-200 ${
              wished
                ? 'fill-[#ef4444] text-[#ef4444] scale-110'
                : 'text-gray-600 group-hover:text-gray-400'
            }`}
          />
        </button>
      </div>

      {/* sparkline chart */}
      <div className="h-16 px-2 mt-1">
        {chartSeries && chartSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={deviationSeries} margin={{ top: 3, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accent} stopOpacity={0.42} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={glowId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#111827" stopOpacity={0} />
                  <stop offset="50%" stopColor={accent} stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#111827" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e2437" strokeDasharray="3 5" vertical={false} />
              <YAxis hide domain={[-3.2, 3.2]} />
              <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 4" />
              <Area
                type="monotone" dataKey="dev" stroke={accent} strokeWidth={1.8}
                fill={`url(#${gradientId})`} dot={false} isAnimationActive={false}
              />
              <Area
                type="monotone" dataKey="dev" stroke="none"
                fill={`url(#${glowId})`} dot={false} isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full rounded-lg bg-[#1a1a2e]/40 animate-pulse" />
        )}
      </div>

      {/* price row */}
      <div className="flex items-end justify-between px-3.5 pb-3 pt-1">
        <p className="text-base font-bold tabular-nums text-white">
          {stock.sym.includes('.NSE') ? '₹' : '$'}
          {displayedPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
        <span
          className="flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: accent + '20', color: accent }}
        >
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(pct).toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

/* ── NEWS CARD ── */
function NewsCard({ item }: { item: NewsItem }) {
  const s = SENTIMENT_STYLES[item.sentiment] ?? SENTIMENT_STYLES.neutral;

  return (
    <div className="group rounded-2xl border border-[#1a1a2e] bg-[#0c0c18] hover:border-[#2a2a3e] transition-all duration-200 overflow-hidden">
      {/* top accent strip */}
      <div className="h-0.75" style={{ background: `linear-gradient(90deg, ${IMPACT_COLORS[item.impact] ?? '#6b7280'}60, transparent)` }} />

      <div className="p-4">
        {/* meta row */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${s.bg} ${s.text} ${s.border}`}>
            {s.icon} {item.sentiment}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border"
            style={{
              color: IMPACT_COLORS[item.impact],
              borderColor: (IMPACT_COLORS[item.impact] ?? '#6b7280') + '30',
              background: (IMPACT_COLORS[item.impact] ?? '#6b7280') + '10',
            }}
          >
            {item.impact}
          </span>
        </div>

        {/* headline */}
        <p className="text-[13px] font-medium text-gray-200 leading-relaxed line-clamp-2 group-hover:text-white transition-colors mb-3">
          {item.headline}
        </p>

        {/* sentiment review */}
        {item.sentimentReview ? (
          <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 mb-3">
            {item.sentimentReview}
          </p>
        ) : null}

        {/* footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="font-medium text-gray-400">{item.source}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {item.time}
            </span>
          </div>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#10b981] hover:text-[#34d399] flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              Read <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

