# 智学AI教育平台

> 开源 AI 教育平台 | AGPL-3.0 | 半商业化

一个面向 K-12 学生的开源 AI 教育平台，提供苏格拉底式 AI 辅导、智能题库、知识图谱、游戏化学习等功能。

## v1.0.0 发布说明

本次 v1.0.0 为首个正式发布版本，主要变更：

- **版本号**：从 `0.1.0` 提升至 `1.0.0`，标志着首个生产就绪版本
- **环境变量**：补全 `.env.example`，覆盖 `DATABASE_URL`、`AUTH_SECRET`、`NEXTAUTH_URL`、LLM API Key、`REDIS_URL`、`ADMIN_IP_WHITELIST` 等全部必需变量
- **管理后台隔离**：管理后台与学生端完全隔离，独立登录入口 `/admin/login`，服务端中间件层强制 admin 角色校验
- **构建验证**：通过 `npm run lint` 与 `npm run build` 零错误验证

升级/部署步骤：

1. 拉取最新代码
2. 复制 `.env.example` 为 `.env.local` 并填写实际配置
3. 至少配置一个 LLM API Key（推荐 DeepSeek）
4. 运行 `npm install` 安装依赖
5. 运行 `npm run build` 构建生产版本
6. 运行 `npm run create-admin` 创建首个管理员账号
7. 运行 `npm start` 启动服务

## 管理后台

管理后台用于平台运营管理（用户、题库、订单等），与学生端完全隔离，互不影响。

### 创建管理员账号

```bash
npm run create-admin
```

按提示交互式输入邮箱、密码、姓名，脚本会创建一个 `role=admin` 的账号。生产环境请使用强密码。

### 访问管理后台

1. 浏览器访问 `/admin/login`（注意：不是学生端的 `/login`）
2. 使用管理员邮箱和密码登录
3. 登录成功后自动跳转到 `/admin` 管理首页

### 隔离机制

- **独立登录入口**：管理后台使用 `/admin/login`，学生端使用 `/login`，两套入口完全独立
- **服务端角色校验**：`/admin/*` 与 `/api/admin/*` 路由在中间件层强制校验 `role=admin`，未登录或非管理员账号无法访问
- **未登录重定向**：未登录访问 `/admin/*` 会重定向到 `/admin/login`（而非学生端登录页）
- **可选 IP 白名单**：通过 `ADMIN_IP_WHITELIST` 环境变量可进一步限制管理后台的访问来源 IP

## 快速开始

```bash
git clone https://github.com/openedu-ai/ai-edu-platform.git
cd ai-edu-platform
npm install
cp .env.example .env.local
npm run dev
```

访问 http://localhost:3000

## 文档

| 文档 | 说明 |
|------|------|
| [项目概述](docs/README.md) | 功能特性、技术栈、项目结构 |
| [部署指南](docs/DEPLOYMENT.md) | 自托管 / Docker / 生产环境 |
| [API 参考](docs/API_REFERENCE.md) | 完整 REST API 端点文档 |
| [开发指南](docs/DEVELOPER_GUIDE.md) | 架构说明、本地开发、贡献 |
| [Android 构建](docs/ANDROID_BUILD.md) | Android APK 打包指南 |
| [设计文档](docs/design/) | 调研报告、安全方案、技术参考 |

## 构建目标

| 目标 | 命令 |
|------|------|
| Web 开发 | `npm run dev` |
| Web 生产构建 | `npm run build` |
| Electron 桌面端 | `npm run electron:build` |
| Android APK | `npm run android:build` |

## 许可证

AGPL-3.0 - 开源核心免费，自托管需自备大模型 API Key。云端 API 按量付费。
