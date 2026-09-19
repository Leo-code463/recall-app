import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recall.ai',
  appName: 'recall',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;