# Polaris 北极星 - 开源个人 AI 学习平台

> 纯开源个人 AI 学习平台 | AGPL-3.0 | v2.1.0

一个面向多年龄段学习者的纯开源个人 AI 学习平台，提供苏格拉底式 AI 辅导、智能题库、知识图谱、游戏化学习等功能。无管理后台、无计费、无 API Key 网关，用户自带大模型 API Key，所有学习数据由自己掌控。

## What's New in v2.1.0

- **5 种学习模式系统**：新增幼儿园、小学、初高中、大学生、上班族 5 种学习模式，每种模式有独立的学科范围、难度范围、UI 风格与 AI 教学风格
- **AI 苏格拉底 prompt 模式分层**：AI 老师按学习模式输出差异化语气——幼儿园（emoji 鼓励）、小学（亲切引导）、初高中（学术严谨）、大学（研究探讨）、上班族（实用简洁、去装饰）
- **学科/难度按模式过滤**：练习页与知识图谱页按当前模式动态过滤学科与难度档位
- **模式切换 UI**：首页 Banner 模式徽章 + 快速切换下拉、设置页学习模式 Tab、注册流程模式卡片选择
- **上班族紧凑模式**：紧凑布局、首页"5 分钟速学"微学习入口、排行榜默认隐藏（可在设置开启）
- **幼儿园友好模式**：大圆角、大字号、大按钮、复杂统计图表自动隐藏
- **真实密码修改 API**：`POST /api/auth/change-password` 真实后端实现，配合 toast 反馈
- **侧边栏死链修复**：修正 3 个错误路径、5 个未实现页面标记 disabled + "敬请期待"
- **苏格拉底 6 阶段统一**：前端 4 阶段 → 后端 6 阶段统一（诊断/澄清/假设/推理/验证/反思）
- **种子数据**：内置 12 徽章 + 39 知识点 + 60 道示例题目（5 模式分层）

完整变更记录见 [CHANGELOG.md](CHANGELOG.md)。

## What's New in v2.0.0

- **品牌重命名**：智学AI → Polaris（北极星），全新品牌标识
- **全新图标**：北极星主题——深紫渐变夜空 + 金色 4 角星
- **动画增强**：Framer Motion 全局动画系统——页面过渡、卡片悬停、列表渐入、数字计数
- **微交互**：按钮按压反馈、侧边栏导航弹簧动画、消息气泡滑入、领奖台浮动
- **Bug 修复**：修复 Electron 自动更新模块未导入导致生产环境崩溃的问题

## 功能特性

| 模块 | 功能 |
|------|------|
| 学习模式 | 5 种学习模式（幼儿园/小学/初高中/大学生/上班族），覆盖全年龄段 |
| AI 老师 | 苏格拉底式智能辅导，6 阶段引导提问，按模式输出差异化语气 |
| 练习题库 | 多学科题库，按模式过滤学科与难度（5 档），自动判分与错题收录 |
| 知识图谱 | 知识点关联可视化，掌握度热力图，按模式过滤学科 |
| 错题本 | 自动收录错题，支持复习与消除机制 |
| 学习报告 | 30天学习趋势、学科分布、知识点掌握度分析（幼儿园模式简化） |
| 游戏化 | XP / 等级 / 徽章 / 排行榜（可隐藏） / 连续打卡激励系统 |
| 模式切换 | 首页徽章快速切换 + 设置页详细配置 + 注册流程选择 |
| 课程 | 课程内容浏览与学习 |
| 拍照搜题 | 拍照识别题目并给出解析（敬请期待） |
| 学习小组 | 学习小组、PK 挑战、学习计划（敬请期待） |

## 自带 LLM API Key

本平台**不提供**大模型服务，也**不代管** API Key。每位用户需在登录后前往 **设置（Settings）** 页面填入自己的大模型 API Key（如 DeepSeek、通义千问、OpenAI、Ollama 等），Key 仅保存在浏览器 `localStorage` 中，不会上传服务器。

- 推荐使用 DeepSeek，性价比高
- 本地部署可使用 Ollama，零成本
- 多模型可在设置页自由切换

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 (React 19 + TypeScript + TailwindCSS) |
| 后端 API | Next.js Route Handlers + Prisma ORM |
| 数据库 | SQLite (开发) / PostgreSQL (生产) |
| 认证 | NextAuth.js v5 (Credentials + JWT) |
| LLM 适配 | DeepSeek / Qwen / OpenAI / Ollama（用户自带 Key） |
| 限流 | 纯内存限流（无外部依赖） |
| 桌面端 | Electron + electron-builder |
| 移动端 | Capacitor (Android APK) |

## 快速开始

```bash
git clone https://github.com/YJLZSL/polaris-learn.git
cd polaris-learn
npm install
cp .env.example .env.local
npm run dev
```

访问 http://localhost:3000 ，注册账号后前往 **设置** 页面配置你的 LLM API Key 即可开始使用。

## 构建目标

| 目标 | 命令 |
|------|------|
| Web 开发 | `npm run dev` |
| Web 生产构建 | `npm run build` |
| Electron 桌面端 | `npm run electron:build` |
| Android APK | `npm run android:build` |

## 文档

| 文档 | 说明 |
|------|------|
| [变更记录](CHANGELOG.md) | 版本变更历史 |
| [项目概述](docs/README.md) | 功能特性、技术栈、项目结构 |
| [部署指南](docs/DEPLOYMENT.md) | 自托管 / Docker / 生产环境 |
| [API 参考](docs/API_REFERENCE.md) | 学生端 REST API 端点文档 |
| [开发指南](docs/DEVELOPER_GUIDE.md) | 架构说明、本地开发、贡献 |
| [Android 构建](docs/ANDROID_BUILD.md) | Android APK 打包指南 |
| [发布规范](docs/RELEASE.md) | 版本管理、发布流程、自动更新 |
| [安全规范](docs/SECURITY.md) | 密钥与证书管理 |
| [设计文档](docs/design/) | 调研报告、安全方案、技术参考 |
| [贡献指南](CONTRIBUTING.md) | 如何参与开源贡献 |

## 参与贡献

> ⚠️ 安全提醒:禁止提交任何密钥、证书、`.env` 真值文件。详见 [密钥与安全规范](docs/SECURITY.md)。

欢迎社区贡献！无论是修复 Bug、新增功能、完善文档还是提出建议，都非常欢迎。

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发环境搭建、代码规范与提交 PR 的流程。

## 许可证

本项目采用 **AGPL-3.0** 协议开源。任何人可自由使用、修改、分发，但衍生作品必须同样以 AGPL-3.0 开源。使用者需自备大模型 API Key，平台本身完全免费。
