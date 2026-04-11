'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PieChart,
  Activity,
  Receipt,
  TrendingUp,
  RefreshCw,
  Star,
} from 'lucide-react';

type MarketStock = {
  sym: string;
  name: string;
  sector: string;
  price: number;
  chg: number;
  live: boolean;
};

type Holding = {
  sym: string;
  name: string;
  sector: string | null;
  quantity: number;
  avgPrice: number;
  costBasis: number;
  updatedAt: string;
};

type Txn = {
  id: number;
  sym: string;
  name: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalValue: number;
  realizedPnl: number;
  createdAt: string;
};

type PortfolioResponse = {
  walletBalance: number;
  holdings: Holding[];
  transactions: Txn[];
  summary: {
    positions: number;
    totalInvested: number;
    realizedPnl: number;
  };
};

type PortfolioRating = {
  score: number;
  summary: string;
  suggestions: Array<{ symbol: string; action: 'BUY' | 'SELL' | 'HOLD'; reason: string }>;
  risks?: string[];
  holdingsAnalyzed?: number;
};

type HoldingSignal = {
  label: 'BUY' | 'SELL';
  confidence: number | null;
};

function money(v: number) {
  return `₹${Number(v || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function qty(v: number) {
  return Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

function fmtDate(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PortfolioPage() {
  const [marketUniverse, setMarketUniverse] = useState<MarketStock[]>([]);
  const [liveMarket, setLiveMarket] = useState<MarketStock[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rating, setRating] = useState<PortfolioRating | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [holdingSignals, setHoldingSignals] = useState<Record<string, HoldingSignal>>({});
  const [signalNotice, setSignalNotice] = useState('');

  const [selectedSym, setSelectedSym] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [portfolioRes, marketUniverseRes, liveMarketRes] = await Promise.all([
        fetch('/api/portfolio', { cache: 'no-store' }),
        fetch('/api/market/stocks', { cache: 'no-store' }),
        fetch('/api/market/stocks?liveOnly=1', { cache: 'no-store' }),
      ]);

      const portfolioData = await portfolioRes.json().catch(() => ({}));
      const marketUniverseData = await marketUniverseRes.json().catch(() => ({}));
      const liveMarketData = await liveMarketRes.json().catch(() => ({}));

      if (!portfolioRes.ok) {
        throw new Error(typeof portfolioData?.error === 'string' ? portfolioData.error : 'Failed to load portfolio');
      }

      setPortfolio(portfolioData as PortfolioResponse);
      const universe = Array.isArray(marketUniverseData?.stocks) ? marketUniverseData.stocks : [];
      const live = Array.isArray(liveMarketData?.stocks) ? liveMarketData.stocks : [];
      setMarketUniverse(universe);
      setLiveMarket(live);

      const hasSelectedInUniverse = universe.some((s: MarketStock) => s.sym === selectedSym);
      if ((!selectedSym || !hasSelectedInUniverse) && universe[0]?.sym) {
        setSelectedSym(universe[0].sym);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [selectedSym]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const marketBySym = useMemo(() => {
    const map = new Map<string, MarketStock>();
    liveMarket.forEach((s) => map.set(s.sym, s));
    return map;
  }, [liveMarket]);

  const enrichedHoldings = useMemo(() => {
    const raw = portfolio?.holdings || [];
    return raw.map((h) => {
      const quote = marketBySym.get(h.sym);
      const hasLivePrice = quote && Number.isFinite(Number(quote.price)) && Number(quote.price) > 0;
      const currentPrice = hasLivePrice ? Number(quote?.price) : null;
      const marketValue = currentPrice != null ? currentPrice * h.quantity : null;
      const unrealizedPnl = marketValue != null ? marketValue - h.costBasis : null;
      const pnlPct = h.costBasis > 0 && unrealizedPnl != null ? (unrealizedPnl / h.costBasis) * 100 : null;
      return {
        ...h,
        hasLivePrice,
        currentPrice,
        marketValue,
        unrealizedPnl,
        pnlPct,
      };
    });
  }, [portfolio?.holdings, marketBySym]);

  const summary = useMemo(() => {
    const totalMarketValue = enrichedHoldings.reduce((sum, h) => sum + (h.marketValue ?? 0), 0);
    const totalCostBasis = enrichedHoldings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalUnrealized = enrichedHoldings.reduce((sum, h) => sum + (h.unrealizedPnl ?? 0), 0);
    const totalUnrealizedPct = totalCostBasis > 0 ? (totalUnrealized / totalCostBasis) * 100 : 0;
    return {
      walletBalance: Number(portfolio?.walletBalance || 0),
      totalMarketValue,
      totalCostBasis,
      totalUnrealized,
      totalUnrealizedPct,
      realizedPnl: Number(portfolio?.summary?.realizedPnl || 0),
      positions: Number(portfolio?.summary?.positions || 0),
    };
  }, [portfolio, enrichedHoldings]);

  const selectedStock = useMemo(
    () => marketUniverse.find((s) => s.sym === selectedSym) || null,
    [marketUniverse, selectedSym]
  );

  const selectedLiveQuote = useMemo(
    () => marketBySym.get(selectedSym) || null,
    [marketBySym, selectedSym]
  );

  const tradePreview = useMemo(() => {
    const q = Number(quantity);
    const price = Number(selectedLiveQuote?.price || 0);
    const total = Number.isFinite(q) && q > 0 ? q * price : 0;
    return {
      q,
      price,
      total,
    };
  }, [quantity, selectedLiveQuote]);

  const submitTrade = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!selectedStock) {
      setError('Please select a stock');
      return;
    }
    if (!selectedLiveQuote || !Number.isFinite(Number(selectedLiveQuote.price)) || Number(selectedLiveQuote.price) <= 0) {
      setError('Live price unavailable for selected stock');
      return;
    }

    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) {
      setError('Enter a valid quantity');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          side,
          sym: selectedStock.sym,
          name: selectedStock.name,
          sector: selectedStock.sector,
          quantity: q,
          price: selectedLiveQuote.price,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Trade failed');
      }

      setSuccess(`${side === 'BUY' ? 'Bought' : 'Sold'} ${q} ${selectedStock.sym}`);
      setQuantity('');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trade failed');
    } finally {
      setSubmitting(false);
    }
  }, [selectedStock, selectedLiveQuote, quantity, side, loadData]);

  const ratePortfolio = useCallback(async () => {
    setRatingError('');
    setRatingLoading(true);
    try {
      const res = await fetch('/api/portfolio/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Portfolio rating failed');
      }
      setRating(data as PortfolioRating);
    } catch (e) {
      setRatingError(e instanceof Error ? e.message : 'Portfolio rating failed');
    } finally {
      setRatingLoading(false);
    }
  }, []);

  const allocation = useMemo(() => {
    const total = summary.totalMarketValue;
    if (total <= 0) return [] as Array<{ sym: string; pct: number; value: number }>;
    return enrichedHoldings
      .filter((h) => h.marketValue != null)
      .map((h) => ({
        sym: h.sym,
        pct: ((h.marketValue ?? 0) / total) * 100,
        value: h.marketValue ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [enrichedHoldings, summary.totalMarketValue]);

  useEffect(() => {
    let alive = true;

    const loadSignals = async () => {
      if (enrichedHoldings.length === 0) {
        if (alive) {
          setHoldingSignals({});
          setSignalNotice('');
        }
        return;
      }

      const results = await Promise.all(
        enrichedHoldings.map(async (h) => {
          try {
            const res = await fetch(`/api/market/rf-signal?ticker=${encodeURIComponent(h.sym)}`, { cache: 'no-store' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return null;
            const label = String(data?.label || '').toUpperCase() === 'BUY' ? 'BUY' : 'SELL';
            const confidence = Number(data?.confidence);
            return {
              sym: h.sym,
              signal: {
                label,
                confidence: Number.isFinite(confidence) ? confidence : null,
              } as HoldingSignal,
            };
          } catch {
            return null;
          }
        })
      );

      if (!alive) return;

      const nextSignals: Record<string, HoldingSignal> = {};
      let buyCount = 0;
      let sellCount = 0;

      for (const row of results) {
        if (!row) continue;
        nextSignals[row.sym] = row.signal;
        if (row.signal.label === 'BUY') buyCount += 1;
        else sellCount += 1;
      }

      setHoldingSignals(nextSignals);
      if (buyCount || sellCount) {
        setSignalNotice(`AI suggestions updated: ${buyCount} BUY, ${sellCount} SELL`);
      } else {
        setSignalNotice('AI suggestions unavailable right now.');
      }
    };

    loadSignals();
    return () => {
      alive = false;
    };
  }, [enrichedHoldings]);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-gray-400 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Portfolio Command Center</h1>
          <p className="text-xs text-gray-500 mt-0.5">Buy, sell, monitor and rebalance your positions live.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={ratePortfolio}
            disabled={ratingLoading}
            className="h-9 rounded-xl border border-[#2a2a3e] bg-[#121526] px-3 text-xs text-gray-300 hover:text-white disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Star className={`w-3.5 h-3.5 text-[#f59e0b] ${ratingLoading ? 'animate-pulse' : ''}`} />
            {ratingLoading ? 'Rating...' : 'Portfolio Rater'}
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="h-9 rounded-xl border border-[#2a2a3e] bg-[#121526] px-3 text-xs text-gray-300 hover:text-white disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-[#ef4444]">{error}</p>}
      {success && <p className="text-sm text-[#10b981]">{success}</p>}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard icon={<Wallet className="w-4 h-4 text-[#22c55e]" />} title="Wallet Cash" value={money(summary.walletBalance)} sub="Available to trade" />
        <MetricCard icon={<PieChart className="w-4 h-4 text-[#38bdf8]" />} title="Portfolio Value" value={money(summary.totalMarketValue)} sub={`${summary.positions} open positions`} />
        <MetricCard
          icon={<Activity className="w-4 h-4 text-[#f59e0b]" />}
          title="Unrealized P&L"
          value={money(summary.totalUnrealized)}
          sub={`${summary.totalUnrealizedPct >= 0 ? '+' : ''}${summary.totalUnrealizedPct.toFixed(2)}% vs cost`}
          positive={summary.totalUnrealized >= 0}
        />
        <MetricCard
          icon={<Receipt className="w-4 h-4 text-[#a78bfa]" />}
          title="Realized P&L"
          value={money(summary.realizedPnl)}
          sub="From closed units"
          positive={summary.realizedPnl >= 0}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 rounded-2xl border border-[#1f2538] bg-linear-to-br from-[#0e1222] to-[#0b0f1b] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-wide text-white">Trade Ticket</h2>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Market Order</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setSide('BUY')}
              className={`h-9 rounded-lg text-sm font-semibold border transition-all ${
                side === 'BUY'
                  ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#22c55e]'
                  : 'bg-[#111528] border-[#2a2f45] text-gray-400 hover:text-white'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide('SELL')}
              className={`h-9 rounded-lg text-sm font-semibold border transition-all ${
                side === 'SELL'
                  ? 'bg-[#ef4444]/20 border-[#ef4444]/40 text-[#ef4444]'
                  : 'bg-[#111528] border-[#2a2f45] text-gray-400 hover:text-white'
              }`}
            >
              Sell
            </button>
          </div>

          <label className="text-xs text-gray-400 mb-1 block">Stock</label>
          <select
            value={selectedSym}
            onChange={(e) => setSelectedSym(e.target.value)}
            className="w-full h-10 rounded-lg border border-[#2a2f45] bg-[#111528] px-2.5 text-sm outline-none focus:border-[#10b981]/50"
          >
            {marketUniverse.map((s) => (
              <option key={s.sym} value={s.sym}>
                {s.sym} · {s.name}
              </option>
            ))}
          </select>
          {marketUniverse.length === 0 && (
            <p className="text-[11px] text-[#ef4444] mt-1.5">No stocks received from market API.</p>
          )}

          <label className="text-xs text-gray-400 mt-3 mb-1 block">Quantity</label>
          <input
            type="number"
            min="0.0001"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            className="w-full h-10 rounded-lg border border-[#2a2f45] bg-[#111528] px-2.5 text-sm outline-none focus:border-[#10b981]/50"
          />

          <div className="mt-3 rounded-xl border border-[#212944] bg-[#10172c] p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-gray-400">
              <span>Live Price</span>
              <span className="text-white">{tradePreview.price > 0 ? money(tradePreview.price) : 'Live price unavailable'}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Est. Trade Value</span>
              <span className="text-white">{tradePreview.total > 0 ? money(tradePreview.total) : '—'}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Wallet After Trade</span>
              <span className="text-white">
                {money(
                  side === 'BUY'
                    ? summary.walletBalance - tradePreview.total
                    : summary.walletBalance + tradePreview.total
                )}
              </span>
            </div>
          </div>

          <button
            onClick={submitTrade}
            disabled={submitting || loading || !selectedStock || !selectedLiveQuote || tradePreview.price <= 0}
            className={`w-full mt-3 h-10 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
              side === 'BUY'
                ? 'bg-[#10b981] text-[#05150d] hover:bg-[#34d399]'
                : 'bg-[#ef4444] text-white hover:bg-[#f87171]'
            }`}
          >
            {submitting ? 'Executing...' : side === 'BUY' ? 'Execute Buy' : 'Execute Sell'}
          </button>
        </div>

        <div className="xl:col-span-8 rounded-2xl border border-[#1a1a2e] bg-[#0c0c18] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a2e] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Open Holdings</h2>
            <span className="text-xs text-gray-500">{enrichedHoldings.length} positions</span>
          </div>

          {signalNotice && (
            <div className="px-4 py-2 border-b border-[#1a1a2e] bg-[#111528] text-xs text-[#38bdf8]">
              {signalNotice}
            </div>
          )}

          {loading ? (
            <div className="p-6 text-sm text-gray-400">Loading holdings...</div>
          ) : enrichedHoldings.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No holdings yet. Start by buying your first stock.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-210 text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-3">Symbol</th>
                    <th className="text-right px-4 py-3">Qty</th>
                    <th className="text-right px-4 py-3">Avg Cost</th>
                    <th className="text-right px-4 py-3">LTP</th>
                    <th className="text-right px-4 py-3">Market Value</th>
                    <th className="text-right px-4 py-3">Unrealized</th>
                    <th className="text-center px-4 py-3">AI Suggestion</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedHoldings.map((h) => {
                    const up = h.unrealizedPnl >= 0;
                    const signal = holdingSignals[h.sym];
                    return (
                      <tr key={h.sym} className="border-t border-[#1a1a2e]">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{h.sym}</div>
                          <div className="text-xs text-gray-500">{h.name}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-200">{qty(h.quantity)}</td>
                        <td className="px-4 py-3 text-right text-gray-200">{money(h.avgPrice)}</td>
                        <td className="px-4 py-3 text-right text-gray-200">{h.currentPrice != null ? money(h.currentPrice) : '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-200">{h.marketValue != null ? money(h.marketValue) : '—'}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${up ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {h.unrealizedPnl != null ? (
                            <>
                              {up ? '+' : ''}{money(h.unrealizedPnl)}
                              <span className="ml-1 text-xs opacity-80">({(h.pnlPct ?? 0) >= 0 ? '+' : ''}{(h.pnlPct ?? 0).toFixed(2)}%)</span>
                            </>
                          ) : (
                            <span className="text-gray-500 font-normal">Live price unavailable</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {signal ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                signal.label === 'BUY'
                                  ? 'bg-[#10b981]/20 text-[#22c55e]'
                                  : 'bg-[#ef4444]/20 text-[#ef4444]'
                              }`}
                              title={signal.confidence != null ? `Confidence ${(signal.confidence * 100).toFixed(1)}%` : 'Confidence unavailable'}
                            >
                              {signal.label}
                              {signal.confidence != null ? ` ${(signal.confidence * 100).toFixed(0)}%` : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#1a1a2e] bg-[#0c0c18] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-[#f59e0b]" />
          <h3 className="text-sm font-semibold">Portfolio Rater</h3>
        </div>

        {ratingError && <p className="text-xs text-[#ef4444] mb-2">{ratingError}</p>}

        {!rating ? (
          <p className="text-sm text-gray-500">Click "Portfolio Rater" near Refresh to get AI score and buy/sell suggestions.</p>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-[#2a2f45] bg-[#111528] p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Score</p>
              <p className="text-2xl font-bold text-[#f59e0b] mt-1">{rating.score.toFixed(1)}/10</p>
              <p className="text-xs text-gray-400 mt-1">{rating.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {Array.isArray(rating.suggestions) && rating.suggestions.length > 0 ? (
                rating.suggestions.slice(0, 6).map((s, idx) => (
                  <div key={`${s.symbol}-${idx}`} className="rounded-lg border border-[#2a2f45] bg-[#111528] p-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-gray-300 font-semibold">{s.symbol || 'PORTFOLIO'}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          s.action === 'BUY'
                            ? 'bg-[#10b981]/20 text-[#22c55e]'
                            : s.action === 'SELL'
                              ? 'bg-[#ef4444]/20 text-[#ef4444]'
                              : 'bg-[#334155]/40 text-[#cbd5e1]'
                        }`}
                      >
                        {s.action}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">{s.reason}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No suggestions returned.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 rounded-2xl border border-[#1a1a2e] bg-[#0c0c18] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a2e] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
            <span className="text-xs text-gray-500">Last 100 trades</span>
          </div>

          {!portfolio || portfolio.transactions.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No transactions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-3">Time</th>
                    <th className="text-left px-4 py-3">Stock</th>
                    <th className="text-center px-4 py-3">Side</th>
                    <th className="text-right px-4 py-3">Qty</th>
                    <th className="text-right px-4 py-3">Price</th>
                    <th className="text-right px-4 py-3">Value</th>
                    <th className="text-right px-4 py-3">Realized</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.transactions.map((t) => {
                    const pnlUp = t.realizedPnl >= 0;
                    return (
                      <tr key={t.id} className="border-t border-[#1a1a2e]">
                        <td className="px-4 py-3 text-gray-400">{fmtDate(t.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{t.sym}</div>
                          <div className="text-xs text-gray-500">{t.name}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              t.side === 'BUY'
                                ? 'bg-[#10b981]/20 text-[#22c55e]'
                                : 'bg-[#ef4444]/20 text-[#ef4444]'
                            }`}
                          >
                            {t.side === 'BUY' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {t.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-200">{qty(t.quantity)}</td>
                        <td className="px-4 py-3 text-right text-gray-200">{money(t.price)}</td>
                        <td className="px-4 py-3 text-right text-gray-200">{money(t.totalValue)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${pnlUp ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {pnlUp ? '+' : ''}{money(t.realizedPnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 rounded-2xl border border-[#1a1a2e] bg-[#0c0c18] p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#38bdf8]" />
            <h3 className="text-sm font-semibold">Top Allocation</h3>
          </div>

          {allocation.length === 0 ? (
            <p className="text-sm text-gray-500">Allocation appears when you have holdings.</p>
          ) : (
            <div className="space-y-2.5">
              {allocation.map((a) => (
                <div key={a.sym}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-300">{a.sym}</span>
                    <span className="text-gray-500">{a.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#111528] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-[#10b981] via-[#22c55e] to-[#38bdf8]"
                      style={{ width: `${Math.max(4, Math.min(100, a.pct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function MetricCard({
  icon,
  title,
  value,
  sub,
  positive,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  sub: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#1a1a2e] bg-[#0c0c18] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-500 uppercase tracking-wider">{title}</div>
        {icon}
      </div>
      <div className={`text-xl font-bold tabular-nums ${positive == null ? 'text-white' : positive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  );
}
