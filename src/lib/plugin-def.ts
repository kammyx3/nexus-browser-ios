import { registerPlugin } from '@capacitor/core';

export interface NexusBridgePlugin {
  createWebView(): Promise<{ created: boolean }>;
  createTab(options?: { url?: string; incognito?: boolean }): Promise<{ id: string }>;
  switchTab(options: { id: string }): Promise<void>;
  closeTab(options: { id: string }): Promise<void>;
  listTabs(): Promise<{ tabs: Array<{ id: string; title: string; url: string; incognito: boolean }>; activeTabId: string }>;
  navigate(options: { url: string }): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  refresh(): Promise<void>;
  showWebView(): Promise<void>;
  hideWebView(): Promise<void>;
  getState(): Promise<{
    tabId: string;
    url: string;
    title: string;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    tabs: BrowserTab[];
  }>;
  getProxyStatus(): Promise<ProxyStatus>;
  setProxy(options: ProxySettings): Promise<ProxyStatus>;
  search(options: { query: string; count?: number; safeSearch?: string; category?: string }): Promise<{ results: SearchResult[] }>;
}

export interface ProxySettings { enabled: boolean; host: string; port: number; username: string; password: string }
export interface ProxyStatus { supported: boolean; enabled: boolean; host: string; port: number; username: string; configured: boolean }
export interface SearchResult { title: string; url: string; snippet: string; source: string }

export interface BrowserTab { id: string; title: string; url: string; incognito: boolean }

export const NexusBridge = registerPlugin<NexusBridgePlugin>('NexusBridge');
