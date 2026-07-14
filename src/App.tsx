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
    setViewState({ type: 'loading', query, results: [] });
    const data = await webSearch(query, 10);
    if (data.error) {
      setViewState({ type: 'error', query, results: [], error: data.error });
      return;
    }
    setViewState({ type: 'results', query, results: data.results });
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
    <div className="flex flex-col h-screen bg-nexus-bg">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-nexus-surface shrink-0"
           style={{ paddingTop: 'env(safe-area-inset-top, 8px)' }}>
        <button onClick={handleBack} disabled={!browserState.canGoBack} className="btn-nav">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button onClick={handleForward} disabled={!browserState.canGoForward} className="btn-nav">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
        <button onClick={handleRefresh} className="btn-nav">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <div className="flex-1 flex items-center bg-[#0f3460] rounded-xl px-3 border border-transparent focus-within:border-nexus-accent/50">
          {viewState.type === 'browsing' ? (
            <input type="text" value={browserState.url} readOnly
              placeholder="Search or enter URL..."
              className="flex-1 bg-transparent border-none outline-none text-nexus-text text-sm py-2 font-sans"
            />
          ) : (
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSearch(searchInput); }}
              placeholder="Search or enter URL..."
              spellCheck={false}
              className="flex-1 bg-transparent border-none outline-none text-nexus-text text-sm py-2 placeholder-nexus-muted/60 font-sans"
            />
          )}
        </div>
        <button onClick={() => {
          if (viewState.type === 'browsing') {
            nativeBridge.hideWebView();
            setViewState({ type: 'home', query: '', results: [] });
          }
        }} className="btn-nav" title="Home">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {viewState.type === 'home' && (
          <HomePage onSearch={doSearch} />
        )}

        {viewState.type === 'results' && (
          <ResultsPage query={viewState.query} results={viewState.results} onResultClick={handleResultClick} />
        )}

        {viewState.type === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-nexus-bg">
            <div className="w-8 h-8 border-2 border-nexus-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {viewState.type === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-nexus-bg p-8">
            <p className="text-nexus-accent text-sm text-center">{viewState.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple inline components

function HomePage({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState('');
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-nexus-bg via-nexus-surface to-[#0f3460] px-6">
      <svg width="80" height="80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="mb-6">
        <defs>
          <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16213e"/><stop offset="100%" stopColor="#0f3460"/>
          </linearGradient>
          <linearGradient id="ac2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e94560"/><stop offset="100%" stopColor="#ff6b81"/>
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill="url(#bg2)"/>
        <circle cx="100" cy="100" r="92" fill="none" stroke="url(#ac2)" strokeWidth="3"/>
        <circle cx="82" cy="75" r="28" fill="none" stroke="#e0e0e0" strokeWidth="4"/>
        <line x1="102" y1="95" x2="125" y2="118" stroke="#e0e0e0" strokeWidth="5" strokeLinecap="round"/>
        <text x="110" y="155" fontFamily="Arial" fontSize="80" fontWeight="bold" fill="#e0e0e0" transform="skewX(-8)">N</text>
      </svg>

      <div className="flex items-center bg-[#0f3460]/80 backdrop-blur-sm border border-nexus-border/50 rounded-2xl px-4 w-full max-w-md
                      transition-all duration-200 focus-within:border-nexus-accent/50">
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) onSearch(q.trim()); }}
          placeholder="Search with Nexus..."
          spellCheck={false}
          className="flex-1 bg-transparent border-none outline-none text-nexus-text text-base py-3 placeholder-nexus-muted/60 font-sans"
        />
      </div>

      <div className="flex items-center gap-2 mt-4 text-xs text-nexus-muted">
        <span>Swipe to go back · Tap home to exit page</span>
      </div>
    </div>
  );
}

function ResultsPage({ query, results, onResultClick }: {
  query: string; results: any[]; onResultClick: (r: any) => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col bg-nexus-bg overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-nexus-border/50 bg-nexus-surface/80 backdrop-blur-sm">
        <h2 className="text-sm font-bold text-nexus-text truncate flex-1">{query}</h2>
        <span className="text-xs text-nexus-muted">{results.length} results</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {results.map((r, i) => {
          const snippet = (r.snippet || '').substring(0, 200);
          return (
            <div key={i} onClick={() => onResultClick(r)}
              className="py-3 border-b border-nexus-border/30 active:bg-white/[0.03]">
              <h3 className="text-sm font-semibold text-nexus-link leading-snug mb-0.5">{r.title}</h3>
              <p className="text-xs text-nexus-success/60 truncate mb-1">{r.url}</p>
              {snippet && <p className="text-xs text-nexus-text-dim/70 leading-relaxed">{snippet}...</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
