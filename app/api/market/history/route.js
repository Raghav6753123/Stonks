import { NextResponse } from 'next/server';
import { getTimeSeries, parseNumber } from '../../lib/twelveData';

function clampOutputSize(value, fallback = 60) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(5, Math.min(200, Math.floor(parsed)));
}

function ttlForInterval(interval) {
  if (interval === '1min') return 120_000;
  if (interval === '5min') return 180_000;
  if (interval === '15min') return 300_000;
  if (interval === '1h') return 900_000;
  return 3_600_000;
}

function toYahooSymbol(symbol) {
  if (symbol.endsWith('.NSE')) return symbol.replace(/\.NSE$/, '.NS');
  return symbol;
}

function toYahooInterval(interval) {
  if (interval === '1day') return '1d';
  if (interval === '1week') return '1wk';
  if (interval === '1month') return '1mo';
  return interval;
}

async function getYahooSeries(symbol, range, interval) {
  const ySymbol = toYahooSymbol(symbol);
  const yInterval = toYahooInterval(interval);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySymbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(yInterval)}&includePrePost=false&events=div%2Csplits`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'stonks-market-server/1.0',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Yahoo history request failed (${res.status})`);
  }

  const payload = await res.json();
  const result = payload?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];

  if (!result || !quote || timestamps.length === 0) {
    throw new Error('Yahoo history returned empty payload');
  }

  const ohlc = timestamps
    .map((ts, idx) => {
      const open = Number(quote?.open?.[idx]);
      const high = Number(quote?.high?.[idx]);
      const low = Number(quote?.low?.[idx]);
      const close = Number(quote?.close?.[idx]);
      const volume = Number(quote?.volume?.[idx]);

      if (![open, high, low, close].every(Number.isFinite)) return null;

      return {
        datetime: new Date(ts * 1000).toISOString(),
        open,
        high,
        low,
        close,
        volume: Number.isFinite(volume) ? volume : 0,
      };
    })
    .filter(Boolean);

  if (ohlc.length === 0) {
    throw new Error('Yahoo history has no valid OHLC points');
  }

  return {
    ohlc,
    meta: {
      source: 'yahoo-finance',
      symbol: ySymbol,
      range,
      interval: yInterval,
    },
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get('symbol') || '').trim().toUpperCase();
    const interval = (searchParams.get('interval') || '1day').trim();
    const outputsize = clampOutputSize(searchParams.get('outputsize'), 60);
    const range = (searchParams.get('range') || '3mo').trim();
    const source = (searchParams.get('source') || 'twelve-data').trim().toLowerCase();

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    }

    if (source === 'yahoo') {
      const yahooSeries = await getYahooSeries(symbol, range, interval);
      const ohlc = yahooSeries.ohlc.slice(-outputsize);

      return NextResponse.json(
        {
          symbol,
          interval,
          ohlc,
          meta: {
            ...yahooSeries.meta,
            requestedAt: new Date().toISOString(),
          },
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const series = await getTimeSeries(symbol, interval, outputsize, {
      ttlMs: ttlForInterval(interval),
    });

    const ohlc = series.values.map((item) => ({
      datetime: item.datetime,
      open: parseNumber(item.open),
      high: parseNumber(item.high),
      low: parseNumber(item.low),
      close: parseNumber(item.close),
      volume: parseNumber(item.volume),
    }));

    return NextResponse.json(
      {
        symbol,
        interval,
        ohlc,
        meta: {
          source: 'twelve-data',
          ...series.meta,
          requestedAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Failed to load chart data'
      : (error instanceof Error ? error.message : 'Failed to load chart data');

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
