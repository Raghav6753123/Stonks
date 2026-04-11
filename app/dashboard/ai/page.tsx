'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Send, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const SUGGESTED = [
  'Which stocks in my feed are trending up right now?',
  'Summarize top opportunities in technology stocks.',
  'Compare AAPL vs MSFT in one short view.',
  'What are the riskiest stocks from current data?',
];

const SESSION_KEY = 'stonks_ai_session_id';
const CHAT_REQUEST_TIMEOUT_MS = 35000;

export default function AiChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [maxMessages, setMaxMessages] = useState(40);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) {
      setSessionId(existing);
      return;
    }
    const next = makeId();
    localStorage.setItem(SESSION_KEY, next);
    setSessionId(next);
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!sessionId) return;

    let alive = true;
    setHistoryLoading(true);
    setError(null);

    fetch(`/api/ai/chat?sessionId=${encodeURIComponent(sessionId)}&limit=80`, { cache: 'no-store' })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!alive) return;
        if (!ok) throw new Error(data?.error || 'Failed to load chat history');

        const incoming = Array.isArray(data?.messages) ? data.messages : [];
        if (Number.isFinite(Number(data?.meta?.sessionLimit))) {
          setMaxMessages(Number(data.meta.sessionLimit));
        }
        const normalized: ChatMessage[] = incoming.map((m: any) => ({
          id: String(m?.id || makeId()),
          role: m?.role === 'user' ? 'user' : 'assistant',
          text: String(m?.text || ''),
          createdAt: String(m?.createdAt || new Date().toISOString()),
        }));
        setMessages(normalized);
      })
      .catch((err) => {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : 'Failed to load chat history';
        setError(msg);
      })
      .finally(() => {
        if (!alive) return;
        setHistoryLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [sessionId]);

  const limitReached = useMemo(() => messages.length >= maxMessages, [messages.length, maxMessages]);
  const canSend = useMemo(
    () => input.trim().length > 0 && !loading && !!sessionId && !limitReached,
    [input, loading, sessionId, limitReached]
  );

  function startNewChat() {
    const next = makeId();
    localStorage.setItem(SESSION_KEY, next);
    setSessionId(next);
    setMessages([]);
    setInput('');
    setError(null);
  }

  async function sendPrompt(customPrompt?: string) {
    const prompt = (customPrompt ?? input).trim();
    if (!prompt || !sessionId || loading) return;

    if (limitReached) {
      setError('This chat reached its message limit. Please start a new chat.');
      return;
    }

    const userMsg: ChatMessage = {
      id: makeId(),
      role: 'user',
      text: prompt,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sessionId }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (Number.isFinite(Number(data?.meta?.sessionLimit))) {
          setMaxMessages(Number(data.meta.sessionLimit));
        }
        throw new Error(data?.error || 'Failed to get AI response');
      }

      if (Number.isFinite(Number(data?.meta?.sessionLimit))) {
        setMaxMessages(Number(data.meta.sessionLimit));
      }

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        text: String(data?.answer || 'No response generated.'),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const msg = isAbort
        ? 'Request timed out. Please try again or start a new chat.'
        : err instanceof Error
          ? err.message
          : 'Something went wrong.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl bg-[#1a1a2e] border border-[#2a2a3e] text-gray-400 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#10b981]" />
            AI Chat
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Reads stock + chat memory from Chroma on every prompt</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1a1a2e] bg-[#0c0c18] overflow-hidden">
        <div ref={listRef} className="h-[60vh] overflow-y-auto p-4 space-y-3">
          {historyLoading && (
            <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f1a] p-3 text-xs text-gray-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading previous chats...
            </div>
          )}

          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f1a] p-3 text-sm text-gray-300">
                Ask anything about your market feed. I’ll use database context from Chroma before answering.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendPrompt(s)}
                    className="text-left rounded-xl border border-[#1a1a2e] bg-[#0f0f1a] px-3 py-2 text-xs text-gray-400 hover:text-white hover:border-[#2a2a3e] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const user = m.role === 'user';
            return (
              <div key={m.id} className={`flex ${user ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed border ${
                    user
                      ? 'bg-[#10b981]/10 border-[#10b981]/25 text-[#d1fae5]'
                      : 'bg-[#111122] border-[#2a2a3e] text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-3.5 py-2.5 text-sm border bg-[#111122] border-[#2a2a3e] text-gray-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking with DB context...
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#1a1a2e] p-3.5 space-y-2">
          {limitReached && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
              <p className="text-xs text-amber-300">This chat reached its limit. Start a new chat to continue.</p>
              <button
                onClick={startNewChat}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-400 text-black hover:bg-amber-300 transition-all"
              >
                New Chat
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendPrompt();
                }
              }}
              placeholder="Ask about stocks, sectors, or trends..."
              className="min-h-11.5 max-h-40 resize-y flex-1 rounded-xl bg-[#090914] border border-[#1a1a2e] text-sm text-white placeholder-gray-600 px-3 py-2 outline-none focus:border-[#10b981]/40"
            />
            <button
              onClick={() => sendPrompt()}
              disabled={!canSend}
              className="h-11.5 px-3.5 rounded-xl bg-[#10b981] text-black font-semibold text-sm hover:bg-[#34d399] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
