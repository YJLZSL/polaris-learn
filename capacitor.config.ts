import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polaris.learn',
  appName: 'Polaris',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#0B0F19',
  android: {
    backgroundColor: '#0B0F19',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0B0F19',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B0F19',
    },
    App: {
      backButton: {
        registerListener: true,
      },
    },
  },
};

export default config;
