export const APP_VERSION = '3.0.0';

export const RELEASE_NOTES: string[] = [
  '跨平台静态化重构：纯前端架构，无后端依赖',
  '数据层迁移到 IndexedDB：浏览器原生持久化存储',
  '客户端直连 LLM：支持 DeepSeek/Qwen/OpenAI/Ollama',
  '本地认证系统：Web Crypto API PBKDF2 哈希',
  '响应式与高 PPI 适配：移动端底部导航栏 + 安全区',
  'Electron 桌面端改造：electron-serve + DPI 缩放',
  '前端美术全面升级：玻璃拟态 + Inter 字体 + 动画系统',
];

export function getVersion(): string {
  return APP_VERSION;
}

export function getReleaseNotes(): string[] {
  return RELEASE_NOTES;
}
