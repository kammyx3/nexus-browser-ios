import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// ─── Web Search (uses native HTTP on iOS to bypass CORS) ───

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
    // Use Capacitor's native HTTP plugin to bypass CORS
    const { CapacitorHttp } = await import('@capacitor/core');
    const res = await CapacitorHttp.request({
      url,
      method: 'GET',
      headers,
    });
    return parseDdgResults(res.data as string, count);
  }

  // Web fallback
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
    const { NexusBridge } = await import('./plugin-def');
    await NexusBridge.createWebView();
  }

  async navigate(url: string) {
    if (!isNative) {
      window.open(url, '_blank');
      return;
    }
    const { NexusBridge } = await import('./plugin-def');
    await NexusBridge.navigate({ url });
  }

  async goBack() {
    if (!isNative) return;
    const { NexusBridge } = await import('./plugin-def');
    await NexusBridge.goBack();
  }

  async goForward() {
    if (!isNative) return;
    const { NexusBridge } = await import('./plugin-def');
    await NexusBridge.goForward();
  }

  async refresh() {
    if (!isNative) return;
    const { NexusBridge } = await import('./plugin-def');
    await NexusBridge.refresh();
  }

  async showWebView() {
    if (!isNative) return;
    const { NexusBridge } = await import('./plugin-def');
    await NexusBridge.showWebView();
  }

  async hideWebView() {
    if (!isNative) return;
    const { NexusBridge } = await import('./plugin-def');
    await NexusBridge.hideWebView();
  }
}

export const nativeBridge = new NativeBridge();
