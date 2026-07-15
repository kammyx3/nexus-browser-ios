import { Capacitor } from '@capacitor/core';
import { BrowserTab, NexusBridge, ProxySettings, ProxyStatus } from './plugin-def';

const isNative = Capacitor.isNativePlatform();

// ─── Web Search ───

export async function webSearch(query: string, count = 10, safeSearch = 'blur') {
  if (!isNative) throw new Error('Private search is available in the Nexus iOS app.');
  return NexusBridge.search({ query, count, safeSearch });
}

// ─── Native Bridge ───

export interface BrowserState {
  tabId: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  tabs: BrowserTab[];
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

  async createTab(url?: string, incognito = false) {
    if (!isNative) return { id: String(Date.now()) };
    return NexusBridge.createTab({ url, incognito });
  }

  async switchTab(id: string) { if (isNative) await NexusBridge.switchTab({ id }); }
  async closeTab(id: string) { if (isNative) await NexusBridge.closeTab({ id }); }
  async listTabs() { return isNative ? NexusBridge.listTabs() : { tabs: [], activeTabId: '' }; }

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

  async getProxyStatus(): Promise<ProxyStatus> {
    if (!isNative) return { supported: false, enabled: false, host: '80-190-72-122.sslip.io', port: 8443, username: '', configured: false };
    return NexusBridge.getProxyStatus();
  }

  async setProxy(settings: ProxySettings): Promise<ProxyStatus> {
    if (!isNative) throw new Error('The Nexus proxy is available only in the iOS app.');
    return NexusBridge.setProxy(settings);
  }
}

export const nativeBridge = new NativeBridge();
