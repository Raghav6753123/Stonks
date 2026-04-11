'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  Customized,
} from 'recharts';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CalendarRange,
  BrainCircuit,
  Wallet,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';

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

type MinutePoint = {
  datetime: string;
  close: number;
};

type DailyPoint = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

type DailyCandle = {
  day: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ma: number;
};

type Holding = {
  sym: string;
  quantity: number;
  avgPrice: number;
  costBasis: number;
};

type Txn = {
  id: number;
  sym: string;
  name: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalValue: number;
  createdAt: string;
};

type PortfolioResponse = {
  walletBalance: number;
  holdings: Holding[];
  transactions: Txn[];
};

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function symbolSeed(symbol: string) {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function moneyINR(v: number) {
  return `₹${Number(v || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

function createDailyCandles(symbol: string, base: number, days = 16): DailyCandle[] {
  const seed = symbolSeed(symbol);
  const points: Omit<DailyCandle, 'ma'>[] = [];
  const now = new Date();

  let prevClose = base;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    const vol = 0.012 + seededRandom(seed + i * 1.7) * 0.02;
    const drift = (seededRandom(seed + i * 4.1) - 0.48) * vol;
    const open = prevClose * (1 + (seededRandom(seed + i * 2.3) - 0.5) * 0.012);
    const close = open * (1 + drift);

    const upperWick = Math.max(open, close) * (0.003 + seededRandom(seed + i * 3.1) * 0.014);
    const lowerWick = Math.min(open, close) * (0.003 + seededRandom(seed + i * 5.9) * 0.014);

    const high = Math.max(open, close) + upperWick;
    const low = Math.max(0.01, Math.min(open, close) - lowerWick);

    points.push({
      day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      open: round2(open),
      close: round2(close),
      high: round2(high),
      low: round2(low),
    });

    prevClose = close;
  }

  return points.map((p, idx) => {
    const from = Math.max(0, idx - 4);
    const window = points.slice(from, idx + 1);
    const ma = window.reduce((sum, item) => sum + item.close, 0) / window.length;
    return { ...p, ma: round2(ma) };
  });
}

function formatPrice(symbol: string, price: number) {
  const isInr = symbol.endsWith('.NSE');
  return `${isInr ? '₹' : '$'}${price.toLocaleString(isInr ? 'en-IN' : 'en-US', {
    maximumFractionDigits: 2,
  })}`;
}

function CandleLayer({
  candles,
  xAxisMap,
  yAxisMap,
}: {
  candles: DailyCandle[];
  xAxisMap?: Record<string, { scale: (value: string) => number; bandwidth?: () => number }>;
  yAxisMap?: Record<string, { scale: (value: number) => number }>;
}) {
  const xAxis = xAxisMap ? (Object.values(xAxisMap)[0] ?? null) : null;
  const yAxis = yAxisMap ? (Object.values(yAxisMap)[0] ?? null) : null;

  if (!xAxis || !yAxis || candles.length === 0) return null;

  const band = typeof xAxis.bandwidth === 'function' ? xAxis.bandwidth() : 18;
  const bodyWidth = Math.max(5, Math.min(14, band * 0.58));

  return (
    <g>
      {candles.map((c) => {
        const xRaw = xAxis.scale(c.day);
        const xCenter = xRaw + band / 2;
        const yHigh = yAxis.scale(c.high);
        const yLow = yAxis.scale(c.low);
        const yOpen = yAxis.scale(c.open);
        const yClose = yAxis.scale(c.close);

        const isUp = c.close >= c.open;
        const top = Math.min(yOpen, yClose);
        const height = Math.max(1.5, Math.abs(yClose - yOpen));
        const color = isUp ? '#22c55e' : '#ef4444';

        return (
          <g key={c.day}>
            <line
              x1={xCenter}
              x2={xCenter}
              y1={yHigh}
              y2={yLow}
              stroke={color}
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={0.9}
            />
            <rect
              x={xCenter - bodyWidth / 2}
              y={top}
              width={bodyWidth}
              height={height}
              rx={1}
              fill={color}
              opacity={0.95}
            />
          </g>
        );
      })}
    </g>
  );
}

export default function StockDetailsPage() {
  const params = useParams<{ symbol: string }>();
  const routeSymbol = decodeURIComponent(params.symbol || '').toUpperCase();

  const [stock, setStock] = useState<Stock | null>(null);
  const [minuteData, setMinuteData] = useState<MinutePoint[]>([]);
  const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
  const [modelPredictedPrice, setModelPredictedPrice] = useState<number | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeQty, setTradeQty] = useState('');
  const [tradeSubmitting, setTradeSubmitting] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json?.holdings) && Array.isArray(json?.transactions)) {
        setPortfolio(json as PortfolioResponse);
      }
    } catch {
      // keep previous snapshot
    }
  }, []);

  useEffect(() => {
    if (!routeSymbol) return;

    let alive = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [stocksRes, dailyRes] = await Promise.all([
          fetch('/api/market/stocks', { cache: 'no-store' }),
          fetch(`/api/market/history?symbol=${encodeURIComponent(routeSymbol)}&source=yahoo&range=3mo&interval=1day&outputsize=50`, {
            cache: 'no-store',
          }),
        ]);

        const stocksJson = await stocksRes.json();
        const dailyJson = await dailyRes.json();

        if (!alive) return;

        const stockMatch = Array.isArray(stocksJson?.stocks)
          ? (stocksJson.stocks as Stock[]).find((s) => s.sym.toUpperCase() === routeSymbol)
          : null;

        if (!stockMatch) {
          setError('Stock not found in market list');
          setLoading(false);
          return;
        }

        const minutePoints: MinutePoint[] = Array.isArray(stockMatch?.spark)
          ? stockMatch.spark
              .map((p: { v: number }, idx: number) => ({
                datetime: String(idx),
                close: Number(p.v),
              }))
              .filter((p: MinutePoint) => Number.isFinite(p.close))
          : [];

        const dailyPoints: DailyPoint[] = Array.isArray(dailyJson?.ohlc)
          ? dailyJson.ohlc
              .map((p: { datetime: string; open: number; high: number; low: number; close: number }) => ({
                datetime: p.datetime,
                open: Number(p.open),
                high: Number(p.high),
                low: Number(p.low),
                close: Number(p.close),
              }))
              .filter((p: DailyPoint) => [p.open, p.high, p.low, p.close].every(Number.isFinite))
              .sort((a: DailyPoint, b: DailyPoint) => {
                return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
              })
          : [];

        setStock(stockMatch);
        setMinuteData(minutePoints);
        setDailyData(dailyPoints);
        await loadPortfolio();
      } catch {
        if (!alive) return;
        setError('Unable to load stock details right now');
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    const iv = setInterval(async () => {
      if (!alive) return;
      try {
        const res = await fetch('/api/market/stocks', { cache: 'no-store' });
        const json = await res.json();
        if (!alive) return;
        const stockMatch = Array.isArray(json?.stocks)
          ? (json.stocks as Stock[]).find((s) => s.sym.toUpperCase() === routeSymbol)
          : null;
        if (stockMatch) {
          const minutePoints: MinutePoint[] = Array.isArray(stockMatch?.spark)
            ? stockMatch.spark
                .map((p: { v: number }, idx: number) => ({
                  datetime: String(idx),
                  close: Number(p.v),
                }))
                .filter((p: MinutePoint) => Number.isFinite(p.close))
            : [];
          setStock(stockMatch);
          setMinuteData(minutePoints);
        }
      } catch {
        // keep old quote
      }
    }, 1000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [routeSymbol, loadPortfolio]);

  const todayPrice = useMemo(() => {
    const last = minuteData[minuteData.length - 1]?.close;
    if (Number.isFinite(last)) return Number(last);
    return stock?.price ?? 0;
  }, [minuteData, stock?.price]);

  useEffect(() => {
    let alive = true;

    const runPrediction = async () => {
      if (dailyData.length < 50) {
        setModelPredictedPrice(null);
        return;
      }

      try {
        const closes = dailyData.slice(-50).map((d) => d.close);
        const res = await fetch('/api/market/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ closes }),
          cache: 'no-store',
        });
        const json = await res.json();

        if (!alive) return;
        if (res.ok && Number.isFinite(Number(json?.predicted))) {
          setModelPredictedPrice(Number(json.predicted));
        } else {
          setModelPredictedPrice(null);
        }
      } catch {
        if (!alive) return;
        setModelPredictedPrice(null);
      }
    };

    runPrediction();
    return () => {
      alive = false;
    };
  }, [dailyData]);

  const predictedPrice = useMemo(() => {
    if (Number.isFinite(modelPredictedPrice)) return round2(Number(modelPredictedPrice));
    const seed = symbolSeed(routeSymbol || 'STOCK') % 1000;
    const bump = ((seed % 28) - 7) / 1000;
    return round2(todayPrice * (1 + bump));
  }, [modelPredictedPrice, routeSymbol, todayPrice]);

  const dailyCandles = useMemo(() => {
    if (dailyData.length > 0) {
      return dailyData.map((p, idx) => {
        const day = new Date(p.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const from = Math.max(0, idx - 4);
        const window = dailyData.slice(from, idx + 1);
        const ma = window.reduce((sum, item) => sum + item.close, 0) / window.length;

        return {
          day,
          open: round2(p.open),
          high: round2(p.high),
          low: round2(p.low),
          close: round2(p.close),
          ma: round2(ma),
        };
      });
    }

    const base = todayPrice || stock?.price || 100;
    return createDailyCandles(routeSymbol || 'STOCK', base, 18);
  }, [dailyData, routeSymbol, todayPrice, stock?.price]);

  const intraday = useMemo(() => {
    if (minuteData.length === 0) {
      return { open: todayPrice, high: todayPrice, low: todayPrice, changePct: 0 };
    }
    const open = minuteData[0].close;
    const values = minuteData.map((p) => p.close);
    const high = Math.max(...values);
    const low = Math.min(...values);
    const changePct = open > 0 ? ((todayPrice - open) / open) * 100 : 0;

    return {
      open: round2(open),
      high: round2(high),
      low: round2(low),
      changePct,
    };
  }, [minuteData, todayPrice]);

  const todayChangePct = useMemo(() => {
    const quoteChange = Number(stock?.chg);
    if (Number.isFinite(quoteChange) && Math.abs(quoteChange) > 0.0001) {
      return quoteChange;
    }
    return intraday.changePct;
  }, [stock?.chg, intraday.changePct]);

  const predictionDelta = predictedPrice - todayPrice;
  const predictionUp = predictionDelta >= 0;

  const currentHolding = useMemo(() => {
    return (portfolio?.holdings || []).find((h) => h.sym.toUpperCase() === routeSymbol) || null;
  }, [portfolio?.holdings, routeSymbol]);

  const recentTrades = useMemo(() => {
    return (portfolio?.transactions || [])
      .filter((t) => t.sym?.toUpperCase?.() === routeSymbol)
      .slice(0, 5);
  }, [portfolio?.transactions, routeSymbol]);

  const tradeQtyNum = Number(tradeQty);
  const tradeValue = Number.isFinite(tradeQtyNum) && tradeQtyNum > 0 ? round2(tradeQtyNum * todayPrice) : 0;

  const submitTrade = useCallback(async () => {
    if (!stock) return;
    setTradeError('');
    setTradeSuccess('');

    const quantity = Number(tradeQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setTradeError('Enter valid quantity');
      return;
    }
    if (!Number.isFinite(todayPrice) || todayPrice <= 0) {
      setTradeError('Live price unavailable');
      return;
    }

    setTradeSubmitting(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          side: tradeSide,
          sym: stock.sym,
          name: stock.name,
          sector: stock.sector,
          quantity,
          price: todayPrice,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : 'Trade failed');
      }

      setTradeSuccess(`${tradeSide === 'BUY' ? 'Bought' : 'Sold'} ${quantity} ${stock.sym}`);
      setTradeQty('');
      await loadPortfolio();
    } catch (e) {
      setTradeError(e instanceof Error ? e.message : 'Trade failed');
    } finally {
      setTradeSubmitting(false);
    }
  }, [stock, tradeQty, todayPrice, tradeSide, loadPortfolio]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/stocks"
          className="p-2 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{routeSymbol || 'Stock Details'}</h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {stock?.name || 'Live stock view'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 h-115 rounded-3xl border border-[#1a1a2e] bg-[#0f0f1a] animate-pulse" />
          <div className="h-115 rounded-3xl border border-[#1a1a2e] bg-[#0f0f1a] animate-pulse" />
        </div>
      ) : error || !stock ? (
        <div className="rounded-2xl border border-dashed border-[#2a2a3e] bg-[#0f0f1a]/50 p-14 text-center">
          <p className="text-sm text-gray-300">{error || 'Unable to load this stock'}</p>
          <p className="text-xs text-gray-500 mt-1">Try another symbol from the stocks list.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="xl:col-span-2 rounded-3xl border border-[#1a1a2e] bg-[#0c0c18] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm sm:text-base text-gray-300 font-semibold">Daily Price Movement</h2>
                <p className="text-xs text-gray-500 mt-0.5">Y axis: rate, X axis: day</p>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#1f2937] text-xs text-gray-300">
                {dailyData.length > 0 ? 'Yahoo historical (last 50 days)' : 'Demo fallback candles'} + 5-day moving average
              </div>
            </div>

            <div className="h-90 w-full rounded-2xl bg-[#080811] border border-[#151527] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyCandles} margin={{ top: 14, right: 16, bottom: 8, left: 2 }}>
                  <defs>
                    <linearGradient id="maGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 6" opacity={0.7} />
                  <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={74}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0b1220',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                    }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 700 }}
                    formatter={(value: number, key: string) => {
                      if (['open', 'high', 'low', 'close', 'ma'].includes(key)) {
                        return [formatPrice(stock.sym, Number(value)), key.toUpperCase()];
                      }
                      return [value, key];
                    }}
                  />

                  <Customized component={(p: unknown) => (
                    <CandleLayer
                      {...(p as { xAxisMap: Record<string, { scale: (value: string) => number; bandwidth?: () => number }>; yAxisMap: Record<string, { scale: (value: number) => number }> })}
                      candles={dailyCandles}
                    />
                  )}
                  />

                  <Line
                    type="monotone"
                    dataKey="ma"
                    stroke="url(#maGlow)"
                    strokeWidth={2.4}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <aside className="rounded-3xl border border-[#1a1a2e] bg-[#0c0c18] p-4 sm:p-5 flex flex-col gap-3.5">
            <div className="rounded-2xl border border-[#1f2937] bg-[#0b1220] p-4">
              <p className="text-xs text-gray-400">Today's Price (real, Finnhub)</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{formatPrice(stock.sym, todayPrice)}</p>
              <div
                className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  todayChangePct >= 0
                    ? 'text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20'
                    : 'text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20'
                }`}
              >
                {todayChangePct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(todayChangePct).toFixed(2)}% today
              </div>
            </div>

            <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-400">
                  Predicted Price {modelPredictedPrice !== null ? '(model)' : '(demo fallback)'}
                </p>
                <BrainCircuit className="w-3.5 h-3.5 text-[#38bdf8]" />
              </div>
              <p className="text-2xl font-bold mt-1 tracking-tight">{formatPrice(stock.sym, predictedPrice)}</p>
              <p className={`text-xs mt-2 ${predictionUp ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {predictionUp ? '+' : '-'}{formatPrice(stock.sym, Math.abs(predictionDelta))} vs current
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Metric label="Open" value={formatPrice(stock.sym, intraday.open)} icon={<CalendarRange className="w-3.5 h-3.5" />} />
              <Metric label="High" value={formatPrice(stock.sym, intraday.high)} icon={<ArrowUpRight className="w-3.5 h-3.5" />} />
              <Metric label="Low" value={formatPrice(stock.sym, intraday.low)} icon={<ArrowDownRight className="w-3.5 h-3.5" />} />
              <Metric label="Volume" value={stock.vol} icon={<Activity className="w-3.5 h-3.5" />} />
            </div>

            <div className="rounded-2xl border border-[#1f2937] bg-[#0b1220] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#10b981]" />
                  <p className="text-xs text-gray-300 font-semibold">Trade {stock.sym}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadPortfolio}
                    className="text-[11px] text-gray-400 hover:text-white inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                  <Link href="/dashboard/portfolio" className="text-[11px] text-[#10b981] hover:text-[#34d399]">Portfolio</Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradeSide('BUY')}
                  className={`h-8 rounded-lg text-xs font-semibold border transition-all ${
                    tradeSide === 'BUY'
                      ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#22c55e]'
                      : 'bg-[#111528] border-[#2a2f45] text-gray-400 hover:text-white'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeSide('SELL')}
                  className={`h-8 rounded-lg text-xs font-semibold border transition-all ${
                    tradeSide === 'SELL'
                      ? 'bg-[#ef4444]/20 border-[#ef4444]/40 text-[#ef4444]'
                      : 'bg-[#111528] border-[#2a2f45] text-gray-400 hover:text-white'
                  }`}
                >
                  Sell
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={tradeQty}
                  onChange={(e) => setTradeQty(e.target.value)}
                  placeholder="Quantity"
                  className="flex-1 h-9 rounded-lg border border-[#2a2f45] bg-[#111528] px-2.5 text-sm outline-none focus:border-[#10b981]/50"
                />
                <button
                  onClick={() => {
                    if (tradeSide === 'BUY') {
                      const max = (portfolio?.walletBalance || 0) / Math.max(todayPrice, 0.0001);
                      setTradeQty(String(round2(max)));
                    } else {
                      setTradeQty(String(round2(currentHolding?.quantity || 0)));
                    }
                  }}
                  className="h-9 px-2.5 rounded-lg border border-[#2a2f45] bg-[#111528] text-xs text-gray-300 hover:text-white"
                >
                  Max
                </button>
              </div>

              <div className="rounded-xl border border-[#212944] bg-[#10172c] p-2.5 text-[11px] space-y-1.5">
                <div className="flex justify-between text-gray-400">
                  <span>Wallet</span>
                  <span className="text-white inline-flex items-center gap-1"><Wallet className="w-3 h-3" />{moneyINR(portfolio?.walletBalance || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Your Holding</span>
                  <span className="text-white">{currentHolding ? currentHolding.quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '0'}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Est. Trade Value</span>
                  <span className="text-white">{tradeValue > 0 ? formatPrice(stock.sym, tradeValue) : '—'}</span>
                </div>
              </div>

              <button
                onClick={submitTrade}
                disabled={tradeSubmitting || !Number.isFinite(tradeQtyNum) || tradeQtyNum <= 0 || todayPrice <= 0}
                className={`w-full h-9 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
                  tradeSide === 'BUY'
                    ? 'bg-[#10b981] text-[#05150d] hover:bg-[#34d399]'
                    : 'bg-[#ef4444] text-white hover:bg-[#f87171]'
                }`}
              >
                {tradeSubmitting ? 'Executing...' : tradeSide === 'BUY' ? 'Execute Buy' : 'Execute Sell'}
              </button>

              {tradeError && <p className="text-[11px] text-[#ef4444]">{tradeError}</p>}
              {!tradeError && tradeSuccess && <p className="text-[11px] text-[#10b981]">{tradeSuccess}</p>}
            </div>

            <div className="rounded-2xl border border-[#1f2937] bg-[#0b1220] p-4">
              <p className="text-xs text-gray-400 mb-2">Recent Trades ({stock.sym})</p>
              {recentTrades.length === 0 ? (
                <p className="text-[11px] text-gray-500">No transactions for this symbol yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentTrades.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-[11px] border-b border-[#1a1a2e] pb-1.5 last:border-0 last:pb-0">
                      <div>
                        <p className={t.side === 'BUY' ? 'text-[#22c55e] font-semibold' : 'text-[#ef4444] font-semibold'}>{t.side}</p>
                        <p className="text-gray-500">{fmtDate(t.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-200">{t.quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })} @ {formatPrice(stock.sym, t.price)}</p>
                        <p className="text-gray-400">{formatPrice(stock.sym, t.totalValue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-auto text-[11px] text-gray-500 leading-relaxed border-t border-[#1a1a2e] pt-3">
              Daily candles come from Yahoo history (3 months, last 50 sessions). Today's price uses live per-minute market API values.
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#0b1220] p-3">
      <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
        <span className="text-[#38bdf8]">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold mt-1.5 text-gray-100 truncate">{value}</p>
    </div>
  );
}
