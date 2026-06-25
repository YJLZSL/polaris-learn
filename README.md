# 智学AI - 开源个人 AI 学习平台

> 纯开源个人 AI 学习平台 | AGPL-3.0

一个面向 K-12 学生的纯开源个人 AI 学习平台，提供苏格拉底式 AI 辅导、智能题库、知识图谱、游戏化学习等功能。无管理后台、无计费、无 API Key 网关，用户自带大模型 API Key，所有学习数据由自己掌控。

## 功能特性

| 模块 | 功能 |
|------|------|
| AI 老师 | 苏格拉底式智能辅导，通过引导提问帮助学生自主思考 |
| 练习题库 | 多学科题库，支持分类/难度筛选，自动判分与错题收录 |
| 知识图谱 | 知识点关联可视化，掌握度热力图 |
| 错题本 | 自动收录错题，支持复习与消除机制 |
| 学习报告 | 30天学习趋势、学科分布、知识点掌握度分析 |
| 游戏化 | XP / 等级 / 徽章 / 排行榜 / 连续打卡激励系统 |
| 学习小组 | 学习小组、PK 挑战、学习计划 |
| 拍照搜题 | 拍照识别题目并给出解析 |
| 课程 | 课程内容浏览与学习 |

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
git clone https://github.com/YJLZSL/ai-edu-platform.git
cd ai-edu-platform
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
| [项目概述](docs/README.md) | 功能特性、技术栈、项目结构 |
| [部署指南](docs/DEPLOYMENT.md) | 自托管 / Docker / 生产环境 |
| [API 参考](docs/API_REFERENCE.md) | 学生端 REST API 端点文档 |
| [开发指南](docs/DEVELOPER_GUIDE.md) | 架构说明、本地开发、贡献 |
| [Android 构建](docs/ANDROID_BUILD.md) | Android APK 打包指南 |
| [设计文档](docs/design/) | 调研报告、安全方案、技术参考 |
| [贡献指南](CONTRIBUTING.md) | 如何参与开源贡献 |

## 参与贡献

> ⚠️ 安全提醒:禁止提交任何密钥、证书、`.env` 真值文件。详见 [密钥与安全规范](docs/SECURITY.md)。

欢迎社区贡献！无论是修复 Bug、新增功能、完善文档还是提出建议，都非常欢迎。

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发环境搭建、代码规范与提交 PR 的流程。

## 许可证

本项目采用 **AGPL-3.0** 协议开源。任何人可自由使用、修改、分发，但衍生作品必须同样以 AGPL-3.0 开源。使用者需自备大模型 API Key，平台本身完全免费。
