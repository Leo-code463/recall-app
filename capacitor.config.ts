import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recap.app',
  appName: 'Recap',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;