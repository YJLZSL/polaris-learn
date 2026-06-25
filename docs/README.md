# 智学AI教育平台

> **版本**: v1.0 | **协议**: AGPL-3.0 | **类型**: 半商业化开源教育平台

## 项目简介

智学AI 是一个面向小学至高中学生的开源 AI 教育平台，采用 **"开源核心 + 云端API"** 的半商业化模式：

- **自托管模式（免费）**：下载源代码自行部署，需自备大模型 API Key，平台不收取任何费用
- **云端 API 服务（按量付费）**：免部署即用，平台统一提供大模型后端，纯按量计费

## 核心功能

| 模块 | 功能 |
|------|------|
| AI 老师 | 苏格拉底式智能辅导，通过引导提问帮助学生自主思考 |
| 练习题库 | 多学科题库，支持分类/难度筛选，自动判分与错题收录 |
| 知识图谱 | 知识点关联可视化，掌握度热力图 |
| 错题本 | 自动收录错题，支持复习与消除机制 |
| 学习报告 | 30天学习趋势、学科分布、知识点掌握度分析 |
| 游戏化 | XP/等级/徽章/排行榜/连续打卡激励系统 |
| LLM 代理 | 统一 API 代理 DeepSeek/Qwen/OpenAI，多模型故障自动转移 |
| API Key 管理 | 虚拟 Key 生成/吊销/用量监控 |
| 计费系统 | 实时 Token 计费，余额不足自动停服 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 (React 19 + TypeScript + TailwindCSS) |
| 后端 API | Next.js Route Handlers + Prisma ORM |
| 数据库 | SQLite (开发) / PostgreSQL (生产) |
| 缓存 | Redis (ioredis) |
| 认证 | NextAuth.js v5 (Credentials + JWT) |
| LLM 适配 | DeepSeek / Qwen / OpenAI / Ollama |
| 桌面端 | Electron + electron-builder |
| 移动端 | Capacitor (Android APK) |

## 快速开始

### 开发环境
```bash
git clone https://github.com/openedu-ai/ai-edu-platform.git
cd ai-edu-platform
npm install
cp .env.example .env.local
# 编辑 .env.local 配置你的 API Key
npm run dev
# 访问 http://localhost:3000
```

### Docker 部署
```bash
docker-compose -f docker-compose.minimal.yml up -d
```

## 项目文档

| 文档 | 说明 |
|------|------|
| [部署指南](docs/DEPLOYMENT.md) | 自托管 / Docker / 生产环境部署 |
| [API 参考](docs/API_REFERENCE.md) | 完整 REST API 端点文档 |
| [开发指南](docs/DEVELOPER_GUIDE.md) | 架构说明、本地开发、贡献流程 |
| [设计文档](docs/design/) | 调研报告、安全方案、大厂参考 |
| [Android 构建](docs/ANDROID_BUILD.md) | Android APK 打包指南 |

## 项目结构

```
ai-edu-platform/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # 登录/注册
│   │   ├── (dashboard)/  # 学生端控制台
│   │   ├── admin/        # 管理后台（独立）
│   │   ├── api/          # API 路由
│   │   ├── docs/         # 开发者门户
│   │   └── llm-api/      # LLM 代理端点
│   ├── components/       # 公共组件
│   ├── lib/              # 核心库（auth/billing/safety/llm等）
│   ├── stores/           # Zustand 状态管理
│   └── types/            # TypeScript 类型
├── prisma/               # 数据库 Schema
├── electron/             # Electron 桌面端
├── scripts/              # 工具脚本
├── public/               # 静态资源
└── docs/                 # 项目文档
```

## 许可证

本项目采用 **AGPL-3.0** 协议开源。核心代码开放获取，自托管需自备大模型 API Key，平台本身不收费。云端 API 服务按量付费。
