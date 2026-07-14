import React, { useState, useEffect, useCallback } from 'react';
import { webSearch, nativeBridge, BrowserState } from './lib/capacitor-bridge';

interface Tab {
  id: number;
  url: string | null;
  title: string;
}

interface ViewState {
  type: 'home' | 'loading' | 'results' | 'error' | 'browsing';
  query: string;
  results: any[];
  error?: string;
}

function isUrl(input: string) {
  if (/^https?:\/\//i.test(input)) return true;
  if (/^[\w-]+\.[\w-]{2,}(?:\/|$)/.test(input)) return true;
  if (/\s/.test(input)) return false;
  return /\./.test(input);
}

function formatUrl(input: string) {
  if (/^https?:\/\//i.test(input)) return input;
  return 'https://' + input;
}

export default function App() {
  const [tabs] = useState<Tab[]>([{ id: 1, url: null, title: 'New Tab' }]);
  const [activeTabId] = useState(1);
  const [viewState, setViewState] = useState<ViewState>({ type: 'home', query: '', results: [] });
  const [browserState, setBrowserState] = useState<BrowserState>({
    url: '', title: '', isLoading: false, canGoBack: false, canGoForward: false,
  });

  useEffect(() => {
    nativeBridge.onState(setBrowserState);
    nativeBridge.createWebView();
  }, []);

  const doSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // If it's a URL, navigate directly
    if (isUrl(trimmed)) {
      await nativeBridge.navigate(formatUrl(trimmed));
      setViewState({ type: 'browsing', query: '', results: [] });
      return;
    }

    setViewState({ type: 'loading', query: trimmed, results: [] });
    const data = await webSearch(trimmed, 10);
    if (data.error) {
      setViewState({ type: 'error', query: trimmed, results: [], error: data.error });
      return;
    }
    setViewState({ type: 'results', query: trimmed, results: data.results });
  }, []);

  const handleResultClick = useCallback(async (result: any) => {
    await nativeBridge.navigate(result.url);
    setViewState({ type: 'browsing', query: '', results: [] });
  }, []);

  const handleBack = useCallback(() => nativeBridge.goBack(), []);
  const handleForward = useCallback(() => nativeBridge.goForward(), []);
  const handleRefresh = useCallback(() => nativeBridge.refresh(), []);

  const [searchInput, setSearchInput] = useState('');

  return (
    <div className="flex flex-col h-screen" style={{ background: '#121828' }}>
      {/* Toolbar — brightened for mobile */}
      <div className="flex items-center gap-2 px-2 py-1.5 shrink-0"
           style={{ background: '#1a2440', paddingTop: 'env(safe-area-inset-top, 6px)' }}>
        <button onClick={handleBack} disabled={!browserState.canGoBack}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[#a0a0c0] hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-default transition-colors shrink-0">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button onClick={handleForward} disabled={!browserState.canGoForward}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[#a0a0c0] hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-default transition-colors shrink-0">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
        <button onClick={handleRefresh}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[#a0a0c0] hover:text-white hover:bg-white/10 transition-colors shrink-0">
          {browserState.isLoading ? (
            <div className="w-5 h-5 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          )}
        </button>

        {/* URL/Search bar — brighter bg */}
        <div className="flex-1 flex items-center bg-[#0f3460]/70 rounded-xl px-3 border border-[#2a4a7a]/50">
          {viewState.type === 'browsing' ? (
            <input type="text" value={browserState.url} readOnly
              className="flex-1 bg-transparent border-none outline-none text-[#d0d0e0] text-[15px] py-2.5 font-sans"
            />
          ) : (
            <input type="text" value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setViewState({ type: 'home', query: '', results: [] }); doSearch(searchInput); } }}
              placeholder="Search or enter URL..."
              spellCheck={false}
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-[#d0d0e0] text-[15px] py-2.5 placeholder-[#606080] font-sans"
            />
          )}
        </div>

        {/* Home/back button */}
        {viewState.type === 'browsing' ? (
          <button onClick={async () => { await nativeBridge.hideWebView(); setViewState({ type: 'home', query: '', results: [] }); }}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-[#a0a0c0] hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Home">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden" style={{ background: '#0a0f1e' }}>
        {viewState.type === 'home' && (
          <HomePage onSearch={doSearch} />
        )}

        {viewState.type === 'results' && (
          <ResultsPage query={viewState.query} results={viewState.results} onResultClick={handleResultClick} onSearch={doSearch} />
        )}

        {viewState.type === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#0a0f1e' }}>
            <div className="w-8 h-8 border-2 border-[#e94560] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {viewState.type === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-8" style={{ background: '#0a0f1e' }}>
            <p className="text-[#e94560] text-sm text-center">{viewState.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HomePage ───

function HomePage({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState('');
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #121828 50%, #1a2440 100%)' }}>
      <svg width="72" height="72" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="mb-5">
        <defs>
          <linearGradient id="bg3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16213e"/><stop offset="100%" stopColor="#1a3050"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill="url(#bg3)"/>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#e94560" strokeWidth="3"/>
        <circle cx="82" cy="75" r="28" fill="none" stroke="#d0d0e0" strokeWidth="4"/>
        <line x1="102" y1="95" x2="125" y2="118" stroke="#d0d0e0" strokeWidth="5" strokeLinecap="round"/>
        <text x="110" y="155" fontFamily="Arial" fontSize="80" fontWeight="bold" fill="#d0d0e0" transform="skewX(-8)">N</text>
      </svg>

      <div className="flex items-center bg-[#1a2440]/80 backdrop-blur-sm border border-[#2a4a7a]/50 rounded-2xl px-4 w-full max-w-md
                      transition-all duration-200">
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) onSearch(q.trim()); }}
          placeholder="Search with Nexus..."
          spellCheck={false}
          autoFocus
          className="flex-1 bg-transparent border-none outline-none text-[#d0d0e0] text-base py-3.5 placeholder-[#606080] font-sans"
        />
      </div>

      <p className="text-xs text-[#606080] mt-4 text-center">Enter a URL or search query to get started</p>
    </div>
  );
}

// ─── ResultsPage ───

function ResultsPage({ query, results, onResultClick, onSearch }: {
  query: string; results: any[]; onResultClick: (r: any) => void; onSearch: (q: string) => void;
}) {
  const [searchInput, setSearchInput] = useState(query);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#0a0f1e' }}>
      {/* Results header with search bar */}
      <div className="shrink-0 px-3 py-2.5 border-b border-[#2a4a7a]/30" style={{ background: '#121828' }}>
        <div className="flex items-center bg-[#1a2440]/80 rounded-xl px-3 border border-[#2a4a7a]/50 mb-2">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-[#606080] mr-2">
            <circle cx="10.5" cy="10.5" r="7.5"/><line x1="21" y1="21" x2="15.8" y2="15.8"/>
          </svg>
          <input type="text" value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && searchInput.trim()) onSearch(searchInput.trim()); }}
            className="flex-1 bg-transparent border-none outline-none text-[#d0d0e0] text-sm py-2.5 placeholder-[#606080] font-sans"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#c0c0d0]">{query}</span>
          <span className="text-xs text-[#606080]">{results.length} results</span>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {results.map((r, i) => {
          const snippet = (r.snippet || '').substring(0, 200);
          return (
            <div key={i} onClick={() => onResultClick(r)}
              className="px-4 py-3.5 border-b border-[#2a4a7a]/20 active:bg-white/[0.03]">
              <h3 className="text-[15px] font-semibold text-[#6ab0ff] leading-snug mb-1">{r.title}</h3>
              <p className="text-xs text-[#2eaa60] truncate mb-1.5">{r.url}</p>
              {snippet && <p className="text-xs text-[#9090a8] leading-relaxed">{snippet}...</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
