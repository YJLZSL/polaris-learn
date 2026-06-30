export const APP_VERSION = '4.0.0';

export const RELEASE_NOTES: string[] = [
  '架构彻底翻新：从 Next.js 迁移到 Vite 7 + React Router 7 纯 SPA',
  '彻底解决 Android ERR_CLEARTEXT_NOT_PERMITTED 错误',
  '全新 Polaris 北极星主题应用图标',
  '新增 AGENTS.md AI 编程规范文档',
  '14 个页面迁移到 React Router 客户端路由',
  '清理所有服务端残留代码与孤立文件',
];

export function getVersion(): string {
  return APP_VERSION;
}

export function getReleaseNotes(): string[] {
  return RELEASE_NOTES;
}
