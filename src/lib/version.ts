export const APP_VERSION = '2.0.0';

export const RELEASE_NOTES: string[] = [
  'Polaris V2：自学本质回归与工程规范重铸',
  '删除双货币/排行榜/每日任务/专注护盾/连胜/消灭战/学段自适应token',
  '首页从 Bento Grid 改为安静桌面（问候语 + 3 入口 + 小灵 + 鼓励语）',
  'AI 老师删除 6 阶段环形进度，降级为安静对话窗口',
  '知识地图从 @antv/g6 迁移到自绘 SVG 静态树/网图',
  '错题本从消灭战改为 Anki 式 SM-2 间隔重复复习卡片',
  '学段从 5 档简化为 3 档（YOUTH/TEEN/ADULT），仅影响 AI prompt',
  '新增 app.asar 解压调试模式与 POLARIS_DEV_MODE 三态隔离',
  'AGENTS.md 7 大新章节约束 Agent 行为，避免 IDE 卡死',
  '视觉语言 4.0：单色北极星靛蓝 + 安静动效（仅 ease-out + 150ms/300ms）',
];

export function getVersion(): string {
  return APP_VERSION;
}

export function getReleaseNotes(): string[] {
  return RELEASE_NOTES;
}
