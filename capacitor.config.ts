import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polaris.learn',
  appName: 'Polaris',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
