import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexus.browser',
  appName: 'Nexus Browser',
  webDir: 'dist',
  bundledWebRuntime: false,
  includePlugins: ['NexusBridge'],
  plugins: {
    CapacitorCookies: {
      enabled: false,
    },
  },
};

export default config;
