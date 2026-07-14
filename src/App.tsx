import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { webSearch, nativeBridge, BrowserState } from './lib/capacitor-bridge';

const isNative = Capacitor.isNativePlatform();

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
  const [viewState, setViewState] = useState<'home' | 'loading' | 'results' | 'browsing'>('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [browserState, setBrowserState] = useState<BrowserState>({
    url: '', title: '', isLoading: false, canGoBack: false, canGoForward: false,
  });
  const [searchInput, setSearchInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    nativeBridge.onState(setBrowserState);
    nativeBridge.createWebView();

    if (isNative) {
      // Keyboard handling — prevents page from shifting
      import('@capacitor/keyboard').then(({ Keyboard }) => {
        Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardHeight(info.keyboardHeight);
        });
        Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0);
        });
      }).catch(() => {});
    }
  }, []);

  const doSearch = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isUrl(trimmed)) {
      await nativeBridge.navigate(formatUrl(trimmed));
      setViewState('browsing');
      return;
    }

    setViewState('loading');
    setQuery(trimmed);
    const data = await webSearch(trimmed, 10);
    if (data.error) {
      // Treat as empty results on error
      setResults([]);
      setViewState('results');
      return;
    }
    setResults(data.results);
    setViewState('results');
  }, []);

  const handleResultClick = useCallback(async (result: any) => {
    await nativeBridge.navigate(result.url);
    setViewState('browsing');
  }, []);

  const handleBack = useCallback(() => nativeBridge.goBack(), []);
  const handleForward = useCallback(() => nativeBridge.goForward(), []);
  const handleRefresh = useCallback(() => nativeBridge.refresh(), []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column',
      background: '#121828',
      paddingBottom: keyboardHeight,
      transition: 'padding-bottom 0.25s ease-out',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
        paddingTop: 'env(safe-area-inset-top, 6px)',
        background: '#1a2440', flexShrink: 0,
      }}>
        <NavBtn onClick={handleBack} disabled={!browserState.canGoBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </NavBtn>
        <NavBtn onClick={handleForward} disabled={!browserState.canGoForward}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18"/></svg>
        </NavBtn>
        <NavBtn onClick={handleRefresh}>
          {browserState.isLoading ? (
            <div style={{ width: 18, height: 18, border: '2px solid #e94560', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          )}
        </NavBtn>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#0f3460', borderRadius: 12, padding: '0 10px', border: '1px solid rgba(42,74,122,0.5)' }}>
          {viewState === 'browsing' ? (
            <input type="text" value={browserState.url} readOnly
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#d0d0e0', fontSize: 15, padding: '10px 0', fontFamily: 'inherit' }}
            />
          ) : (
            <input type="text" value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchInput.trim()) { setViewState('home'); doSearch(searchInput); } }}
              placeholder="Search or enter URL..."
              spellCheck={false}
              autoFocus
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#d0d0e0', fontSize: 15, padding: '10px 0', fontFamily: 'inherit', placeholder: '#606080' }}
            />
          )}
        </div>

        {viewState === 'browsing' && (
          <NavBtn onClick={async () => { await nativeBridge.hideWebView(); setViewState('home'); setSearchInput(''); }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </NavBtn>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0f1e' }}>
        {viewState === 'home' && <HomePage onSearch={doSearch} />}
        {viewState === 'results' && (
          <ResultsPage query={query} results={results} onResultClick={handleResultClick} onSearch={doSearch} />
        )}
        {viewState === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1e' }}>
            <div style={{ width: 32, height: 32, border: '2px solid #e94560', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Components ───

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: 10, border: 'none',
        color: disabled ? 'rgba(160,160,192,0.3)' : '#a0a0c0',
        background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function HomePage({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState('');
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 24px',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #121828 50%, #1a2440 100%)',
    }}>
      <svg width="72" height="72" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 20 }}>
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

      <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 400, background: 'rgba(26,36,64,0.8)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '0 14px', border: '1px solid rgba(42,74,122,0.5)' }}>
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) onSearch(q.trim()); }}
          placeholder="Search with Nexus..."
          spellCheck={false} autoFocus
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#d0d0e0', fontSize: 16, padding: '14px 0', fontFamily: 'inherit' }}
        />
      </div>
      <p style={{ color: '#606080', fontSize: 12, marginTop: 16, textAlign: 'center' }}>Enter a URL or search query</p>
    </div>
  );
}

function ResultsPage({ query, results, onResultClick, onSearch }: {
  query: string; results: any[]; onResultClick: (r: any) => void; onSearch: (q: string) => void;
}) {
  const [searchInput, setSearchInput] = useState(query);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#0a0f1e' }}>
      <div style={{ flexShrink: 0, padding: '10px 12px 8px', borderBottom: '1px solid rgba(42,74,122,0.3)', background: '#121828' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(26,36,64,0.8)', borderRadius: 12, padding: '0 10px', border: '1px solid rgba(42,74,122,0.5)', marginBottom: 8 }}>
          <input type="text" value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && searchInput.trim()) onSearch(searchInput.trim()); }}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#d0d0e0', fontSize: 14, padding: '10px 0', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#c0c0d0' }}>{query}</span>
          <span style={{ fontSize: 11, color: '#606080' }}>{results.length} results</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {results.map((r, i) => {
          const snippet = (r.snippet || '').substring(0, 200);
          return (
            <div key={i} onClick={() => onResultClick(r)}
              style={{ padding: '14px 16px', borderBottom: '1px solid rgba(42,74,122,0.15)', cursor: 'pointer' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#6ab0ff', marginBottom: 2, lineHeight: 1.3 }}>{r.title}</h3>
              <p style={{ fontSize: 12, color: '#2eaa60', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</p>
              {snippet && <p style={{ fontSize: 12, color: '#9090a8', lineHeight: 1.5 }}>{snippet}...</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
