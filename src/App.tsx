import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BrowserTab } from './lib/plugin-def';
import { BrowserState, nativeBridge, webSearch } from './lib/capacitor-bridge';

const isNative = Capacitor.isNativePlatform();
type View = 'home' | 'loading' | 'results' | 'browsing';

const emptyState: BrowserState = { tabId: '', url: '', title: '', isLoading: false, canGoBack: false, canGoForward: false, tabs: [] };
const looksLikeUrl = (value: string) => /^https?:\/\//i.test(value) || (!/\s/.test(value) && /(?:\.|localhost)/i.test(value));
const normalizeUrl = (value: string) => /^https?:\/\//i.test(value) ? value : `https://${value}`;

export default function App() {
  const [view, setView] = useState<View>('home');
  const [browser, setBrowser] = useState<BrowserState>(emptyState);
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [tabsOpen, setTabsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dark, setDark] = useState(localStorage.getItem('nexus-theme') !== 'light');
  const [saveHistory, setSaveHistory] = useState(localStorage.getItem('nexus-save-history') !== 'false');
  const [safeSearch, setSafeSearch] = useState(localStorage.getItem('nexus-safe-search') || 'blur');
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxySupported, setProxySupported] = useState(true);
  const [proxyHost, setProxyHost] = useState('80-190-72-122.sslip.io');
  const [proxyPort, setProxyPort] = useState('8443');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [proxyMessage, setProxyMessage] = useState('');

  useEffect(() => {
    nativeBridge.onState(state => {
      setBrowser(state);
      if (state.url) { setAddress(state.url); setView('browsing'); }
    });
    nativeBridge.createWebView();
    nativeBridge.getProxyStatus().then(status => {
      setProxyEnabled(status.enabled); setProxySupported(status.supported);
      setProxyHost(status.host); setProxyPort(String(status.port)); setProxyUsername(status.username);
    }).catch(() => setProxySupported(false));
  }, []);

  const saveProxy = async () => {
    setProxyMessage('Applying protection…');
    try {
      const status = await nativeBridge.setProxy({ enabled: proxyEnabled, host: proxyHost.trim(), port: Number(proxyPort), username: proxyUsername, password: proxyPassword });
      setProxyEnabled(status.enabled);
      setProxyMessage(status.enabled ? 'Protected. Nexus tabs now use your VPS.' : 'Protection is off.');
      setProxyPassword('');
    } catch (error) {
      setProxyMessage(error instanceof Error ? error.message : 'Could not apply proxy settings.');
    }
  };

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('nexus-theme', dark ? 'dark' : 'light'); }, [dark]);

  const search = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setTabsOpen(false);
    if (looksLikeUrl(value)) { await nativeBridge.navigate(normalizeUrl(value)); setView('browsing'); return; }
    await nativeBridge.hideWebView();
    setQuery(value); setAddress(value); setView('loading');
    if (saveHistory) {
      const previous = JSON.parse(localStorage.getItem('nexus-history') || '[]').filter((item: string) => item !== value);
      localStorage.setItem('nexus-history', JSON.stringify([value, ...previous].slice(0, 50)));
    }
    try {
      const response = await webSearch(value, 30, safeSearch);
      setResults(response.results || []);
    } catch (error) {
      setResults([{ title: 'Private search is not configured', url: 'nexus://settings', snippet: error instanceof Error ? error.message : 'Open Settings and enter your VPS credentials.', source: 'Nexus' }]);
    }
    setView('results');
  }, [safeSearch, saveHistory]);

  const newTab = async (incognito = false) => {
    await nativeBridge.createTab(undefined, incognito);
    await nativeBridge.hideWebView();
    setAddress(''); setView('home'); setTabsOpen(false);
  };

  const selectTab = async (tab: BrowserTab) => {
    await nativeBridge.switchTab(tab.id);
    setAddress(tab.url); setView(tab.url ? 'browsing' : 'home'); setTabsOpen(false);
  };

  const home = async () => { await nativeBridge.hideWebView(); setAddress(''); setView('home'); };
  const openTabs = async () => { await nativeBridge.hideWebView(); setTabsOpen(true); };
  const closeTabs = async () => { setTabsOpen(false); if (view === 'browsing') await nativeBridge.showWebView(); };
  const openSettings = async () => { await nativeBridge.hideWebView(); setSettingsOpen(true); };
  const closeSettings = async () => { setSettingsOpen(false); if (view === 'browsing') await nativeBridge.showWebView(); };
  const tabCount = Math.max(1, browser.tabs?.length || 0);

  return <main className="ios-app">
    <header className="mobile-toolbar">
      <button className="icon-button" disabled={!browser.canGoBack} onClick={() => nativeBridge.goBack()} aria-label="Back">‹</button>
      <form className="address-pill" onSubmit={event => { event.preventDefault(); search(address); }}>
        {browser.tabs?.find(tab => tab.id === browser.tabId)?.incognito && <span className="private-dot">●</span>}
        <input value={address} onChange={event => setAddress(event.target.value)} placeholder="Search or enter URL" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        {browser.isLoading && <span className="spinner small" />}
      </form>
      <button className="icon-button" onClick={() => browser.isLoading ? nativeBridge.refresh() : nativeBridge.refresh()} aria-label="Reload">↻</button>
    </header>

    <section className="mobile-content">
      {view === 'home' && <Home onSearch={search} />}
      {view === 'loading' && <ResultSkeleton />}
      {view === 'results' && <Results query={query} results={results} onOpen={async result => {
        if (result.url === 'nexus://settings') { await openSettings(); return; }
        await nativeBridge.navigate(result.url); setView('browsing');
      }} />}
    </section>

    <nav className="bottom-toolbar">
      <button onClick={home}><span>⌂</span><small>Home</small></button>
      <button disabled={!browser.canGoForward} onClick={() => nativeBridge.goForward()}><span>›</span><small>Forward</small></button>
      <button className="new-tab" onClick={() => newTab(false)}><span>＋</span></button>
      <button onClick={openTabs}><span className="tab-count">{tabCount}</span><small>Tabs</small></button>
      <button onClick={openSettings}><span>⚙</span><small>Settings</small></button>
    </nav>

    {tabsOpen && <Sheet title="Tabs" onClose={closeTabs}>
      <div className="sheet-actions"><button onClick={() => newTab(false)}>＋ New tab</button><button className="private" onClick={() => newTab(true)}>● Private tab</button></div>
      <div className="tab-grid">{browser.tabs?.map(tab => <article key={tab.id} className={tab.id === browser.tabId ? 'active' : ''} onClick={() => selectTab(tab)}>
        <div className="tab-preview">{tab.incognito ? '●' : 'N'}</div>
        <div><strong>{tab.title || 'New Tab'}</strong><p>{tab.url || 'Nexus Home'}</p></div>
        <button aria-label="Close tab" onClick={event => { event.stopPropagation(); nativeBridge.closeTab(tab.id); }}>×</button>
      </article>)}</div>
    </Sheet>}

    {settingsOpen && <Sheet title="Settings" onClose={closeSettings}>
      <SettingToggle label="Dark appearance" detail="Use the dark Nexus theme" value={dark} onChange={setDark} />
      <SettingToggle label="Save search history" detail="Stored only on this iPhone" value={saveHistory} onChange={value => { setSaveHistory(value); localStorage.setItem('nexus-save-history', String(value)); }} />
      <div className="setting-row vertical"><div><strong>Safe Search</strong><p>Control sensitive results</p></div><select value={safeSearch} onChange={event => { setSafeSearch(event.target.value); localStorage.setItem('nexus-safe-search', event.target.value); }}><option value="off">No filter</option><option value="blur">Blur</option><option value="filter">Filter</option></select></div>
      <div className="setting-card proxy-card">
        <div className="proxy-heading"><div><strong>Nexus protection</strong><p>Encrypt and route only Nexus website traffic through your VPS.</p></div><input type="checkbox" checked={proxyEnabled} disabled={!proxySupported} onChange={event => setProxyEnabled(event.target.checked)} /></div>
        {!proxySupported ? <p className="proxy-status error">Requires iOS 17 or newer.</p> : <>
          <label>Server<input value={proxyHost} onChange={event => setProxyHost(event.target.value)} autoCapitalize="none" autoCorrect="off" placeholder="proxy.example.com" /></label>
          <label>Port<input value={proxyPort} onChange={event => setProxyPort(event.target.value.replace(/\D/g, ''))} inputMode="numeric" /></label>
          <label>Username<input value={proxyUsername} onChange={event => setProxyUsername(event.target.value)} autoCapitalize="none" autoCorrect="off" /></label>
          <label>Password<input value={proxyPassword} onChange={event => setProxyPassword(event.target.value)} type="password" placeholder="Leave blank only if unchanged" /></label>
          <button className="proxy-save" onClick={saveProxy}>Apply protection</button>
          {proxyMessage && <p className="proxy-status">{proxyMessage}</p>}
          <p className="privacy-note">Fail-closed is enabled: pages will not fall back to your regular connection if the VPS is unavailable. Other iPhone apps are unaffected.</p>
        </>}
      </div>
      <button className="danger-button" onClick={() => { localStorage.removeItem('nexus-history'); }}>Clear search history</button>
    </Sheet>}
  </main>;
}

function Home({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState('');
  const suggestions = useMemo(() => JSON.parse(localStorage.getItem('nexus-history') || '[]').slice(0, 5), []);
  return <div className="home-screen"><img src="./assets/logo.svg" alt="Nexus" /><h1>Nexus</h1><p>Private browsing, built for your phone.</p><form onSubmit={event => { event.preventDefault(); onSearch(value); }}><input value={value} onChange={event => setValue(event.target.value)} placeholder="Search the web" autoCapitalize="none" /><button>Go</button></form>{suggestions.length > 0 && <div className="suggestions">{suggestions.map((item: string) => <button key={item} onClick={() => onSearch(item)}>↗ {item}</button>)}</div>}</div>;
}

function Results({ query, results, onOpen }: { query: string; results: any[]; onOpen: (result: any) => void }) {
  const host = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };
  return <div className="results"><div className="results-heading"><h2>{query}</h2><span>{results.length} results</span></div>{results.length ? results.map((result, index) => <button className="result" key={`${result.url}-${index}`} onClick={() => onOpen(result)}><small>{host(result.url)}</small><strong>{result.title}</strong><p>{result.snippet}</p></button>) : <div className="empty"><strong>No results found</strong><p>Check your connection and try again.</p></div>}</div>;
}
function ResultSkeleton() { return <div className="results skeleton-list">{[1,2,3,4,5].map(item => <div className="skeleton" key={item}><i/><b/><span/></div>)}</div>; }
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="sheet-backdrop" onClick={onClose}><section className="sheet" onClick={event => event.stopPropagation()}><header><h2>{title}</h2><button onClick={onClose}>Done</button></header><div className="sheet-body">{children}</div></section></div>; }
function SettingToggle({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (value: boolean) => void }) { return <label className="setting-row"><div><strong>{label}</strong><p>{detail}</p></div><input type="checkbox" checked={value} onChange={event => onChange(event.target.checked)} /></label>; }
