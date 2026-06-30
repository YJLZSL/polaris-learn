# Polaris 部署指南（v4.0.0 Vite SPA）

> v4.0.0 起 Polaris 改为纯前端 SPA 应用（Vite 7 + React 19 + React Router 7），**无需部署任何后端服务、无需数据库、无需 Docker**。`npm run build` 产出的 `dist/` 目录是纯静态文件，可托管在任意静态文件服务器或对象存储上。

## 目录

1. [架构说明](#架构说明)
2. [环境要求](#环境要求)
3. [开发环境部署](#开发环境部署)
4. [Electron 桌面端构建](#electron-桌面端构建)
5. [Android APK 构建](#android-apk-构建)
6. [静态托管部署（可选）](#静态托管部署可选)

---

## 架构说明

### v4.0.0 SPA 架构

| 维度 | v4.0.0 |
|------|--------|
| 应用形态 | 纯前端 SPA（Vite 7 + React 19） |
| 路由 | React Router 7（HashRouter） |
| 数据存储 | IndexedDB（浏览器原生） |
| AI 调用 | 客户端 fetch 直连 LLM |
| 认证 | Web Crypto PBKDF2（本地） |
| 部署方式 | 静态文件托管 / Electron 安装包 / Android APK |

### 关键特点

- ✅ **纯静态产物**：`vite build` 产出 `dist/` 目录，完全自包含
- ✅ **无运行时依赖**：无需 PostgreSQL、SQLite、Redis、Docker 等任何运行时依赖
- ✅ **三端统一**：同一份 `dist/` 产物可同时支撑 Web 托管、Electron 打包、Android APK
- ✅ **HashRouter**：客户端路由，无需服务端 SPA fallback 配置

详见 [ARCHITECTURE.md](./ARCHITECTURE.md) 了解完整架构设计。

---

## 环境要求

| 组件 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18+ | 仅构建时需要，运行时无需 |
| npm | 9+ | 包管理 |

> v4.0.0 起不再需要 PostgreSQL、SQLite、Docker、Redis 等任何运行时依赖。所有数据由浏览器 IndexedDB 持久化。

---

## 开发环境部署

```bash
# 1. 克隆仓库
git clone https://github.com/YJLZSL/polaris-learn.git
cd polaris-learn

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
# 访问 http://localhost:5173
```

> v4.0.0 起无需：
> - 配置 `.env` 文件
> - 运行数据库迁移或种子脚本
> - 启动 PostgreSQL / SQLite 数据库
>
> 首次访问应用时，前端会自动向 IndexedDB 注入种子数据（12 徽章 + 39 知识点 + 60 道示例题目）。

---

## Electron 桌面端构建

```bash
# 构建 Vite 静态产物并打包 Electron 安装包
npm run electron:build
```

`electron:build` 内部会执行 `vite build` 再调用 `electron-builder`。构建产出（位于 `electron-dist/`）：

- Windows: `Polaris 北极星学习平台 Setup.exe`（NSIS 安装包）
- macOS: `Polaris 北极星学习平台.dmg`
- Linux: `Polaris 北极星学习平台.AppImage`
- 自动更新元数据：`latest.yml`（供 `electron-updater` 比对版本）

Electron 通过 `electron-serve` 加载 `dist/` 静态文件，并自动检测 DPI 缩放比例适配高 PPI 显示器。

> 构建前请替换 `public/icon-512.png` 为品牌图标。

### Electron 开发模式

```bash
npm run electron:dev
# 等价于 concurrently "vite" "wait-on http://localhost:5173 && electron ."
```

会同时启动 Vite 开发服务器（http://localhost:5173）与 Electron 主进程，Electron 在开发模式下加载 `http://localhost:5173`，支持热更新。

---

## Android APK 构建

详见 [ANDROID_BUILD.md](./ANDROID_BUILD.md)

```bash
# 1. 构建 Web 静态资源并同步到 Android 项目
npm run android:build

# 2. 进入 Android 目录构建 APK
cd android
./gradlew assembleDebug       # Debug APK
./gradlew assembleRelease     # Release APK（需签名配置）
```

`android:build` 等价于 `vite build && npx cap sync android`。

构建产出：
- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`

---

## 静态托管部署（可选）

> v4.0.0 主要支持 PC（Electron）和 Android（Capacitor）两种部署方式。如需 Web 托管作为可选方案，可参考以下步骤。

### 1. 构建静态产物

```bash
npm install
npm run build
```

构建完成后，`dist/` 目录即为完整的静态应用，包含：

```
dist/
├── index.html              # 入口 HTML
├── assets/
│   ├── index-[hash].js     # 主 JS bundle
│   └── index-[hash].css    # 主 CSS bundle
├── favicon.ico             # 站点图标
├── icon.svg / icon-192.png / icon-512.png   # 应用图标
├── manifest.json           # PWA manifest
└── sw.js                   # Service Worker
```

### 2. 选择托管平台

#### Vercel

1. 在 [vercel.com](https://vercel.com) 导入 GitHub 仓库
2. 框架预设选择 "Vite"
3. 构建命令：`npm run build`
4. 输出目录：`dist`
5. 部署即可，自动 HTTPS + CDN

#### Netlify

1. 在 [netlify.com](https://netlify.com) 导入仓库
2. 构建命令：`npm run build`
3. 发布目录：`dist`

> 因 v4.0.0 使用 HashRouter，无需额外的 SPA fallback 配置（`_redirects` 文件）。

#### GitHub Pages

```bash
# 构建产物
npm run build

# 推送到 gh-pages 分支
npx gh-pages -d dist
```

#### 对象存储（OSS / S3 / COS）

将 `dist/` 目录内容上传到对象存储 bucket，开启静态网站托管：

- 阿里云 OSS：开启静态页面，默认首页设为 `index.html`
- AWS S3：开启 Static website hosting，Index document 设为 `index.html`
- 腾讯云 COS：开启静态网站，索引文档设为 `index.html`
- 配合 CDN 加速 + HTTPS 证书

### Nginx 自托管

将 `dist/` 内容复制到服务器 `/var/www/polaris/`：

```bash
# 本地构建
npm run build

# 上传到服务器
scp -r dist/* user@server:/var/www/polaris/
```

Nginx 配置（因使用 HashRouter，无需 SPA fallback）：

```nginx
server {
    listen 80;
    server_name polaris.example.com;
    root /var/www/polaris;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/css application/javascript text/javascript application/json;
    gzip_min_length 1024;
}

# HTTPS 配置（推荐使用 certbot 自动申请 Let's Encrypt 证书）
server {
    listen 443 ssl http2;
    server_name polaris.example.com;
    root /var/www/polaris;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/polaris.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/polaris.example.com/privkey.pem;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 部署方案对比

| 方案 | 适用场景 | 成本 | HTTPS | 自动部署 |
|------|---------|------|-------|---------|
| Electron 安装包 | PC 桌面端（Windows/Mac/Linux） | 免费 | 不适用 | GitHub Release |
| Android APK | Android 手机/平板 | 免费 | 不适用 | 手动分发 |
| Vercel | Web 托管（可选） | 免费（Hobby） | 自动 | Git push 自动 |
| Netlify | Web 托管（可选） | 免费（Starter） | 自动 | Git push 自动 |
| GitHub Pages | Web 托管（可选，开源项目） | 免费 | 自动 | Actions 自动 |
| 对象存储 + CDN | Web 托管（可选，中国大陆访问） | 低 | 需配置 | 手动/脚本 |
| Nginx 自托管 | Web 托管（可选，内网/自有服务器） | 服务器成本 | 需配置 | 手动 |

---

## 相关文档

- [架构说明](./ARCHITECTURE.md) - v4.0.0 Vite SPA 架构设计
- [Android 构建](./ANDROID_BUILD.md) - Android APK 构建指南
- [发布规范](./RELEASE.md) - 版本管理与发布流程
- [安全规范](./SECURITY.md) - 客户端架构下的密钥与数据安全
- [README](../README.md) - 项目概览
