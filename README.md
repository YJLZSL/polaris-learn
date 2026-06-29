# Polaris 北极星学习平台

> 纯前端个人 AI 学习平台 | AGPL-3.0 | v3.0.0

一个面向多年龄段学习者的纯前端个人 AI 学习平台，提供苏格拉底式 AI 辅导、智能题库、知识图谱、游戏化学习等功能。**v3.0.0 起改为纯前端架构，无后端服务器，所有数据由浏览器本地持久化（IndexedDB），所有 LLM 调用由客户端直连，无需自建或部署任何服务端。**

## What's New in v3.0.0

- **纯前端架构**：移除所有后端依赖，Next.js 启用 `output: 'export'` 静态导出，部署后仅需静态文件托管即可运行
- **IndexedDB 数据层**：浏览器原生持久化存储替代 Prisma + SQLite，所有学习数据保存在用户设备本地
- **客户端直连 LLM**：直接从浏览器调用 DeepSeek / Qwen / OpenAI / Ollama API，API Key 仅存 localStorage，不经任何服务器转发
- **本地认证系统**：基于 Web Crypto API PBKDF2 哈希的本地认证，无 NextAuth 依赖，无 OAuth 流程
- **跨平台统一**：Web（PWA）+ Android（Capacitor）+ PC（Electron）三端共用同一套静态产物
- **响应式与高 PPI 适配**：移动端底部导航栏、安全区适配、高 PPI 字号优化
- **前端美术升级**：玻璃拟态设计、Inter 可变字体、统一的 EASE_OUT_EXPO 缓动曲线动画系统

完整变更记录见 [CHANGELOG.md](CHANGELOG.md)。

## 架构概览

| 维度 | v3.0.0 静态化架构 |
|------|------|
| **应用形态** | 纯前端静态应用，无后端服务器 |
| **数据存储** | IndexedDB（浏览器原生），无数据库依赖 |
| **AI 服务** | 客户端直连 LLM API（DeepSeek/Qwen/OpenAI/Ollama），API Key 仅存 localStorage |
| **认证** | Web Crypto API PBKDF2 本地认证，无 NextAuth |
| **跨平台** | Web（PWA）+ Android（Capacitor）+ PC（Electron） |
| **构建产物** | `out/` 静态目录，可直接托管在任意静态文件服务器 |

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
| 课程 | 课程内容浏览与学习（静态示例课程） |
| 拍照搜题 | 拍照识别题目并给出解析（敬请期待） |
| 学习小组 | 学习小组、PK 挑战、学习计划（敬请期待） |

## 学习模式说明

平台内置 5 种学习模式，针对不同年龄段学习者的认知特点与学习目标进行差异化适配：

| 模式 | 适用人群 | UI 风格 | AI 教学语气 |
|------|---------|---------|------------|
| 幼儿园（KINDERGARTEN） | 学龄前儿童 | 大圆角、大字号、大按钮，复杂图表自动隐藏 | emoji 鼓励、亲切友好 |
| 小学（PRIMARY） | 小学生 | 亲切引导、圆润配色 | 亲切引导、循循善诱 |
| 初高中（MIDDLE_HIGH） | 初高中学生 | 标准布局、学术配色 | 学术严谨、逻辑清晰 |
| 大学生（COLLEGE） | 大学生 | 标准布局、研究风格 | 研究探讨、深度分析 |
| 上班族（PROFESSIONAL） | 职场人士 | 紧凑布局、首页"5 分钟速学"入口、排行榜默认隐藏 | 实用简洁、去除装饰 emoji |

学习模式可在注册流程选择，也可在登录后通过首页 Banner 徽章或设置页"学习模式"Tab 随时切换，所有相关页面会自动同步模式状态。

## 自带 LLM API Key

本平台**不提供**大模型服务，也**不代管** API Key。每位用户需在登录后前往 **设置（Settings）** 页面填入自己的大模型 API Key（如 DeepSeek、通义千问、OpenAI、Ollama 等）。

v3.0.0 起 API Key 仅保存在浏览器 `localStorage` 中，**不会上传到任何服务器**（因为应用本身就是纯前端，没有服务器）。客户端会直接通过 `fetch` 调用对应 LLM 供应商的 API。

- 推荐使用 DeepSeek，性价比高
- 本地部署可使用 Ollama，零成本
- 多模型可在设置页自由切换
- 支持的 Provider：DeepSeek / Qwen / OpenAI / Ollama / Custom（兼容 OpenAI 协议）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16（React 19 + TypeScript + Tailwind CSS 4） |
| 动画 | Framer Motion 12（统一 EASE_OUT_EXPO 缓动曲线） |
| 本地存储 | IndexedDB（通过 `idb` 库封装） |
| AI 服务 | 客户端直连（DeepSeek / Qwen / OpenAI / Ollama，用户自带 Key） |
| 认证 | Web Crypto API（PBKDF2 哈希 + crypto.randomUUID 会话 token） |
| 字体 | Inter（可变字体）+ 思源黑体 / PingFang SC（中文优先） |
| 状态管理 | Zustand + React Context（SessionProvider） |
| 桌面端 | Electron + electron-serve + electron-builder + electron-updater |
| 移动端 | Capacitor 8（Android APK） |
| PWA | manifest.json + Service Worker（Capacitor 原生环境跳过） |

## 快速开始

```bash
git clone https://github.com/YJLZSL/polaris-learn.git
cd polaris-learn
npm install
npm run dev
```

访问 http://localhost:3000 ，注册账号后前往 **设置** 页面配置你的 LLM API Key 即可开始使用。

> v3.0.0 起无需配置 `.env` 文件、无需运行数据库迁移、无需启动任何后端服务。首次访问时应用会自动向 IndexedDB 注入种子数据（12 徽章 + 39 知识点 + 60 道示例题目）。

## 构建目标

| 目标 | 命令 | 产物 |
|------|------|------|
| Web 开发 | `npm run dev` | http://localhost:3000 |
| Web 生产构建（静态导出） | `npm run build` | `out/` 静态目录 |
| Electron 桌面端 | `npm run electron:build` | `electron-dist/` 安装包 |
| Android APK | `npm run android:build` → `cd android && ./gradlew assembleDebug` | `android/app/build/outputs/apk/` |

### 静态产物部署

`npm run build` 产出的 `out/` 目录是纯静态文件，可直接托管在：

- **Vercel**：连接仓库后自动识别 Next.js 静态导出
- **Netlify**：将 `out/` 设为发布目录
- **GitHub Pages**：将 `out/` 内容推送到 `gh-pages` 分支
- **Nginx / Apache**：将 `out/` 内容复制到 web root
- **对象存储**：将 `out/` 内容上传到 OSS / S3 / COS

详见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

### Android 构建

```bash
# 1. 构建 Web 静态资源并同步到 Android 项目
npm run android:build

# 2. 进入 Android 目录构建 APK
cd android
./gradlew assembleDebug      # Debug APK（开发测试）
./gradlew assembleRelease     # Release APK（需配置签名）

# 3. 获取 APK
# android/app/build/outputs/apk/debug/app-debug.apk
```

详见 [docs/ANDROID_BUILD.md](docs/ANDROID_BUILD.md)。

### Electron 构建

```bash
npm run electron:build
# 产物：electron-dist/Polaris 北极星学习平台 Setup.exe（Windows）
```

Electron 通过 `electron-serve` 加载 `out/` 静态文件，并自动检测 DPI 缩放比例适配高 PPI 显示器。

## 文档

| 文档 | 说明 |
|------|------|
| [变更记录](CHANGELOG.md) | 版本变更历史 |
| [架构说明](docs/ARCHITECTURE.md) | v3.0.0 静态化架构设计与数据流 |
| [项目概述](docs/README.md) | 功能特性、技术栈、项目结构 |
| [部署指南](docs/DEPLOYMENT.md) | 静态托管方案（Vercel/Netlify/GitHub Pages/Nginx） |
| [API 参考](docs/API_REFERENCE.md) | ⚠️ 已废弃（v3.0.0 移除服务端 API，保留作历史参考） |
| [开发指南](docs/DEVELOPER_GUIDE.md) | 架构说明、本地开发、贡献 |
| [Android 构建](docs/ANDROID_BUILD.md) | Android APK 打包指南 |
| [发布规范](docs/RELEASE.md) | 版本管理、发布流程、自动更新 |
| [安全规范](docs/SECURITY.md) | 客户端架构下的密钥与数据安全 |
| [设计文档](docs/design/) | 调研报告、安全方案、技术参考 |
| [贡献指南](CONTRIBUTING.md) | 如何参与开源贡献 |

## 参与贡献

> ⚠️ 安全提醒：禁止提交任何密钥、证书、`.env` 真值文件。详见 [密钥与安全规范](docs/SECURITY.md)。

欢迎社区贡献！无论是修复 Bug、新增功能、完善文档还是提出建议，都非常欢迎。

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发环境搭建、代码规范与提交 PR 的流程。

## 许可证

本项目采用 **AGPL-3.0** 协议开源。任何人可自由使用、修改、分发，但衍生作品必须同样以 AGPL-3.0 开源。使用者需自备大模型 API Key，平台本身完全免费。
