# Polaris 北极星 - 开源个人 AI 学习平台

> **协议**: AGPL-3.0 | **类型**: 纯开源个人学习平台

## 项目简介

Polaris 是一个面向小学至高中学生的纯开源个人 AI 学习平台。无管理后台、无计费、无 API Key 网关，用户自带大模型 API Key（在「设置」页面配置，保存在浏览器本地），所有学习数据由用户自己掌控。

## 核心功能

| 模块 | 功能 |
|------|------|
| AI 老师 | 苏格拉底式智能辅导，通过引导提问帮助学生自主思考 |
| 练习题库 | 多学科题库，支持分类/难度筛选，自动判分与错题收录 |
| 知识图谱 | 知识点关联可视化，掌握度热力图 |
| 错题本 | 自动收录错题，支持复习与消除机制 |
| 学习报告 | 30天学习趋势、学科分布、知识点掌握度分析 |
| 游戏化 | XP/等级/徽章/排行榜/连续打卡激励系统 |
| 学习小组 | 学习小组、PK 挑战、学习计划 |
| 拍照搜题 | 拍照识别题目并给出解析 |
| 课程 | 课程内容浏览与学习 |

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

### 开发环境
```bash
git clone https://github.com/YJLZSL/polaris-learn.git
cd polaris-learn
npm install
cp .env.example .env.local
# 编辑 .env.local 配置 DATABASE_URL 与 AUTH_SECRET
npm run dev
# 访问 http://localhost:3000，登录后在「设置」页填入你的 LLM API Key
```

### Docker 部署
```bash
docker-compose -f docker-compose.minimal.yml up -d
```

## 项目文档

| 文档 | 说明 |
|------|------|
| [部署指南](DEPLOYMENT.md) | 自托管 / Docker / 生产环境部署 |
| [API 参考](API_REFERENCE.md) | 学生端 REST API 端点文档 |
| [开发指南](DEVELOPER_GUIDE.md) | 架构说明、本地开发、贡献流程 |
| [Android 构建](ANDROID_BUILD.md) | Android APK 打包指南 |
| [设计文档](design/) | 调研报告、安全方案、大厂参考 |
| [贡献指南](../CONTRIBUTING.md) | 如何参与开源贡献 |

## 项目结构

```
polaris-learn/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # 登录/注册
│   │   ├── (dashboard)/  # 学生端控制台
│   │   │   └── settings/ # 设置（含 LLM API Key 配置）
│   │   ├── api/          # API 路由
│   │   └── docs/         # 开发者门户
│   ├── components/       # 公共组件
│   ├── lib/              # 核心库（auth/safety/llm-adapter/rate-limit 等）
│   ├── stores/           # Zustand 状态管理
│   └── types/            # TypeScript 类型
├── prisma/               # 数据库 Schema
├── electron/             # Electron 桌面端
├── scripts/              # 工具脚本
├── public/               # 静态资源
└── docs/                 # 项目文档
```

## 许可证

本项目采用 **AGPL-3.0** 协议开源。任何人可自由使用、修改、分发，衍生作品须同样以 AGPL-3.0 开源。用户需自备大模型 API Key，平台本身完全免费。
