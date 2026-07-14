import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { NexusBridge } from './plugin-def';

const isNative = Capacitor.isNativePlatform();

// ─── Web Search ───

function parseDdgResults(html: string, count: number) {
  if (html.includes('challenge') || html.includes('captcha')) return { results: [], error: 'captcha' as const };

  const results: any[] = [];
  const blocks = html.split('class="result results_links');
  for (let i = 1; i < blocks.length && results.length < count; i++) {
    const block = blocks[i];
    const titleMatch = block.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;
    const rawUrl = titleMatch[1];
    const urlMatch = rawUrl.match(/uddg=([^&]+)/);
    const url = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;
    const title = titleMatch[2].replace(/<[^>]*>/g, '').trim();
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : '';
    results.push({ title, url, snippet, source: 'web' });
  }
  return { results, error: null as null };
}

export async function webSearch(query: string, count = 10) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://duckduckgo.com/',
  };

  if (isNative) {
    const res = await CapacitorHttp.request({ url, method: 'GET', headers });
    return parseDdgResults(res.data as string, count);
  }

  const res = await fetch(url, { headers });
  const html = await res.text();
  return parseDdgResults(html, count);
}

// ─── Native Bridge ───

export interface BrowserState {
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

type StateCallback = (state: BrowserState) => void;

class NativeBridge {
  private listeners: StateCallback[] = [];

  constructor() {
    if (isNative) {
      window.addEventListener('nexus:browserState', ((e: CustomEvent) => {
        const state: BrowserState = e.detail;
        this.listeners.forEach(cb => cb(state));
      }) as EventListener);
    }
  }

  onState(cb: StateCallback) {
    this.listeners.push(cb);
  }

  async createWebView() {
    if (!isNative) return;
    try { await NexusBridge.createWebView(); } catch (e) { console.error('createWebView failed', e); }
  }

  async navigate(url: string) {
    if (!isNative) { window.open(url, '_blank'); return; }
    try { await NexusBridge.navigate({ url }); } catch (e) { console.error('navigate failed', e); }
  }

  async goBack() {
    if (!isNative) return;
    try { await NexusBridge.goBack(); } catch {}
  }

  async goForward() {
    if (!isNative) return;
    try { await NexusBridge.goForward(); } catch {}
  }

  async refresh() {
    if (!isNative) return;
    try { await NexusBridge.refresh(); } catch {}
  }

  async showWebView() {
    if (!isNative) return;
    try { await NexusBridge.showWebView(); } catch {}
  }

  async hideWebView() {
    if (!isNative) return;
    try { await NexusBridge.hideWebView(); } catch {}
  }
}

export const nativeBridge = new NativeBridge();
