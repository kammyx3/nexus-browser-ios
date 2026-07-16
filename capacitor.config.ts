import { CapacitorConfig } from '@capacitor/cli';
const liveReloadUrl = process.env.NEXUS_LIVE_RELOAD_URL;

const config: CapacitorConfig = {
  appId: 'com.nexus.browser',
  appName: 'Nexus Browser',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    CapacitorCookies: {
      enabled: false,
    },
  },
  ...(liveReloadUrl
    ? {
      server: {
        url: liveReloadUrl,
        cleartext: true,
      },
    }
    : {}),
};

export default config;
