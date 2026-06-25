import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polaris.learn',
  appName: 'Polaris',
  webDir: 'public',
  server: {
    // Android 开发时使用本地开发服务器
    // 生产构建时替换为你的实际服务器地址
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
    cleartext: process.env.NODE_ENV === 'development',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
