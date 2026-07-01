/**
 * Task 5: 安全存储统一入口
 *
 * 完全委托给平台抽象层 `platform.secureStorage`：
 * - Electron：使用主进程 safeStorage 加密
 * - Android/Capacitor：使用 @capacitor/preferences + AES-GCM
 * - Web 预览：使用 idb-keyval + 内存混淆降级
 *
 * 本文件不再包含任何 btoa/base64/字符串反转/escape/unescape 等混淆逻辑。
 */

import { platform } from '@/lib/platform';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    return platform.secureStorage.get(key);
  },
  async set(key: string, value: string): Promise<void> {
    return platform.secureStorage.set(key, value);
  },
  async remove(key: string): Promise<void> {
    return platform.secureStorage.remove(key);
  },
};
