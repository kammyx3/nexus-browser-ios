import { registerPlugin } from '@capacitor/core';

export interface NexusBridgePlugin {
  createWebView(): Promise<{ created: boolean }>;
  navigate(options: { url: string }): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  refresh(): Promise<void>;
  showWebView(): Promise<void>;
  hideWebView(): Promise<void>;
  getState(): Promise<{
    url: string;
    title: string;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
  }>;
}

export const NexusBridge = registerPlugin<NexusBridgePlugin>('NexusBridge');
