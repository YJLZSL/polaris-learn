# Changelog

本项目所有重要变更记录均会写入此文件。版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [2.0.0] - 2026-06-25

### 重磅变更
- **品牌重命名**：项目从「智学AI / ai-edu-platform」更名为 **Polaris / 北极星**（北极星隐喻导航指引，寓意引导学生学习之路）
- **全新应用图标**：设计北极星主题图标——深紫渐变夜空背景 + 金色 4 角星 + 中心白点 + 微小辅星，替换原有占位符图标
- **BREAKING**：appId 从 `com.zixueai.edu` 变更为 `com.polaris.learn`，npm 包名从 `ai-edu-platform` 变更为 `polaris-learn`

### 新增
- 安装 Framer Motion，创建统一动画预设库 `src/lib/motion.ts`（pageTransition、staggerContainer、listItem、cardHover、buttonTap、slideInBottom 等）
- 新增 CSS keyframes：`gradient-flow`（渐变流动）、`shimmer-fast`（快速闪烁）、`float`（浮动）
- Dashboard 页面切换过渡动画（AnimatePresence + motion.main）
- 首页 Banner 渐变流动动画
- 首页统计卡片 stagger 渐入 + CountUp 数字计数动画
- 侧边栏导航项 whileHover/whileTap 弹簧微交互 + 品牌 logo 悬停放大
- 练习页选项卡片 stagger 渐入 + 答题反馈缩放动画
- AI 老师消息气泡 slideInBottom 滑入动画
- 排行榜 Top3 领奖台 scaleIn + float 浮起 + 排名列表 stagger + Tab 切换 AnimatePresence
- 卡片 hover 浮起 + 阴影 elevation 细化
- 按钮按压缩放反馈（active:scale-[0.97]）
- 新增 `CHANGELOG.md`

### 修复
- 修复 Electron `main.js` 中 `autoUpdater` 未导入导致生产环境构建崩溃的严重 Bug
- 修复 Electron 窗口未显示应用图标的问题

### 变更
- 仓库名建议从 `ai-edu-platform` 改为 `polaris-learn`（需用户在 GitHub 端手动改名）
- 所有文档（README、CONTRIBUTING、docs/*）全量替换品牌名
- Service Worker 缓存名从 `zhixue-ai-v1` 更新为 `polaris-v1`
- Electron 窗口标题改为 `Polaris`

---

## [1.0.0] - 2026-06-25（已归档）

### 首次发布
- 开源个人 AI 学习平台（AGPL-3.0）
- 苏格拉底式 AI 辅导、智能题库、知识图谱、错题本、学习报告
- 游戏化学习：XP / 等级 / 徽章 / 排行榜 / 连续打卡
- 用户自带 LLM API Key（DeepSeek / Qwen / OpenAI / Ollama）
- PC 桌面端（Electron + electron-builder）
- 移动端（Capacitor Android）
- PWA Service Worker 离线支持
- Electron 自动更新（electron-updater + GitHub Releases）
- Android 版本检查（/api/version + 更新提示横幅）
- 环境隔离（.env.development / .env.production）
- 密钥安全规范（docs/SECURITY.md）
