# Polaris 部署指南（v3.0.0 静态化）

> v3.0.0 起 Polaris 改为纯前端静态应用，**无需部署任何后端服务、无需数据库、无需 Docker**。`npm run build` 产出的 `out/` 目录是纯静态文件，可托管在任意静态文件服务器或对象存储上。

## 目录

1. [架构说明](#架构说明)
2. [环境要求](#环境要求)
3. [开发环境部署](#开发环境部署)
4. [静态托管部署](#静态托管部署)
5. [Nginx 自托管](#nginx-自托管)
6. [Electron 桌面端构建](#electron-桌面端构建)
7. [Android APK 构建](#android-apk-构建)

---

## 架构说明

### v3.0.0 静态化架构

| 维度 | v3.0.0 | v2.x（已废弃） |
|------|--------|----------------|
| 应用形态 | 纯前端静态应用 | Next.js 服务端 + 客户端 |
| 数据存储 | IndexedDB（浏览器原生） | SQLite / PostgreSQL |
| AI 调用 | 客户端 fetch 直连 LLM | 服务端 Route Handler 转发 |
| 认证 | Web Crypto PBKDF2（本地） | NextAuth v5（JWT） |
| 部署方式 | 静态文件托管 | Node.js 服务 + 数据库 |
| Docker | ❌ 不需要 | ✅ 可选 |

### 关键变化

- ❌ **移除**：Prisma ORM、NextAuth、所有 API Routes、Docker、PostgreSQL
- ✅ **新增**：IndexedDB schema、客户端 ai-service、本地 auth-service
- ✅ **简化**：构建产物从「Node.js 应用 + 数据库」变为「单一静态目录」

详见 [ARCHITECTURE.md](./ARCHITECTURE.md) 了解完整架构设计。

---

## 环境要求

| 组件 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18+ | 仅构建时需要，运行时无需 |
| npm | 9+ | 包管理 |

> v3.0.0 起不再需要 PostgreSQL、SQLite、Docker、Redis 等任何运行时依赖。所有数据由浏览器 IndexedDB 持久化。

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
# 访问 http://localhost:3000
```

> v3.0.0 起无需：
> - 配置 `.env` 文件
> - 运行 `prisma db push` 或 `prisma db seed`
> - 启动 PostgreSQL / SQLite 数据库
>
> 首次访问应用时，前端会自动向 IndexedDB 注入种子数据（12 徽章 + 39 知识点 + 60 道示例题目）。

---

## 静态托管部署

### 1. 构建静态产物

```bash
npm install
npm run build
```

构建完成后，`out/` 目录即为完整的静态应用，包含：

```
out/
├── index.html              # 首页
├── 404.html                # 404 页面
├── _next/                  # Next.js 静态资源（JS/CSS/字体）
├── (auth)/                 # 认证页面（登录/注册）
├── (dashboard)/            # 主应用页面
├── manifest.json           # PWA manifest
├── icons/                  # PWA 图标
└── sw.js                   # Service Worker
```

### 2. 选择托管平台

#### Vercel（推荐）

Vercel 原生支持 Next.js 静态导出，零配置部署：

1. 在 [vercel.com](https://vercel.com) 导入 GitHub 仓库
2. 框架预设选择 "Next.js"
3. 构建命令：`npm run build`
4. 输出目录：自动识别为 `out/`
5. 部署即可，自动 HTTPS + CDN

#### Netlify

1. 在 [netlify.com](https://netlify.com) 导入仓库
2. 构建命令：`npm run build`
3. 发布目录：`out`
4. 添加 `_redirects` 文件处理 SPA 路由（可选）：
   ```
   /*    /index.html   200
   ```

#### GitHub Pages

```bash
# 构建产物
npm run build

# 推送到 gh-pages 分支
npx gh-pages -d out
```

或在 GitHub Actions 中配置自动部署工作流：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

#### Cloudflare Pages

1. 在 Cloudflare Dashboard 创建 Pages 项目
2. 连接 GitHub 仓库
3. 框架预设：Next.js（静态导出）
4. 构建命令：`npm run build`
5. 输出目录：`out`

#### 对象存储（OSS / S3 / COS）

将 `out/` 目录内容上传到对象存储 bucket，开启静态网站托管：

- 阿里云 OSS：开启静态页面，默认首页设为 `index.html`，404 页设为 `404.html`
- AWS S3：开启 Static website hosting，Index document 设为 `index.html`
- 腾讯云 COS：开启静态网站，索引文档设为 `index.html`
- 配合 CDN 加速 + HTTPS 证书

---

## Nginx 自托管

### Nginx 配置示例

将 `out/` 内容复制到服务器 `/var/www/polaris/`：

```bash
# 本地构建
npm run build

# 上传到服务器
scp -r out/* user@server:/var/www/polaris/
```

Nginx 配置：

```nginx
server {
    listen 80;
    server_name polaris.example.com;
    root /var/www/polaris;
    index index.html;

    # SPA 路由回退（Next.js 静态导出已生成多级路径，此项为兜底）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /_next/static/ {
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

    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 使用 Docker 部署 Nginx + 静态文件（可选）

虽然 v3.0.0 应用本身不需要 Docker，但你可以用 Docker 来部署 Nginx 托管静态文件：

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t polaris-learn .
docker run -p 80:80 polaris-learn
```

> 这只是为了简化 Nginx 部署的可选方案，应用本身仍是纯静态的。

---

## Electron 桌面端构建

```bash
# 构建静态产物并打包 Electron 安装包
npm run electron:build
```

构建产出（位于 `electron-dist/`）：
- Windows: `Polaris 北极星学习平台 Setup.exe`
- macOS: `Polaris 北极星学习平台.dmg`
- Linux: `Polaris 北极星学习平台.AppImage`

Electron 通过 `electron-serve` 加载 `out/` 静态文件，并自动检测 DPI 缩放比例适配高 PPI 显示器。

> 构建前请替换 `public/icon-512.png` 为品牌图标。

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

构建产出：
- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`

---

## 部署方案对比

| 方案 | 适用场景 | 成本 | HTTPS | 自动部署 |
|------|---------|------|-------|---------|
| Vercel | 个人/团队，开源项目 | 免费（Hobby）| 自动 | Git push 自动 |
| Netlify | 个人/团队 | 免费（Starter）| 自动 | Git push 自动 |
| GitHub Pages | 开源项目 | 免费 | 自动 | Actions 自动 |
| Cloudflare Pages | 全球加速 | 免费 | 自动 | Git push 自动 |
| 对象存储 + CDN | 中国大陆访问 | 低 | 需配置 | 手动/脚本 |
| Nginx 自托管 | 内网/自有服务器 | 服务器成本 | 需配置 | 手动 |
| Docker + Nginx | 容器化环境 | 服务器成本 | 需配置 | CI/CD |

---

## v2.x → v3.0.0 迁移指南

如果你正在从 v2.x（Prisma + NextAuth 架构）迁移到 v3.0.0 静态化：

### 1. 移除旧部署组件

```bash
# 停止旧服务
pm2 stop polaris-learn  # 或 docker-compose down

# 删除旧数据库（可选，数据无法迁移到 IndexedDB）
rm -f prisma/dev.db
```

### 2. 部署 v3.0.0 静态产物

```bash
# 拉取新代码
git pull origin main

# 安装依赖（v3.0.0 移除了大量依赖）
npm install

# 构建静态产物
npm run build

# 部署 out/ 目录到你选择的托管平台
```

### 3. 数据迁移说明

**v3.0.0 数据存储在浏览器 IndexedDB，与 v2.x 的服务端数据库完全隔离。**已有用户数据无法自动迁移，需要：

- 让用户重新注册账号（密码需重新设置，因 v3.0.0 使用 PBKDF2 哈希，与 v2.x 的 bcrypt 不兼容）
- 或编写一次性迁移脚本，将 SQLite 中的题目/徽章/知识点数据导出为 JSON，前端首次启动时注入 IndexedDB

> 内置的种子数据已包含 12 徽章 + 39 知识点 + 60 道示例题目，新部署的开箱即用。

### 4. 删除旧的环境变量

```bash
# 不再需要的 .env 变量（可全部删除）
DATABASE_URL=
DATABASE_PROVIDER=
AUTH_SECRET=
NEXTAUTH_URL=
CAPACITOR_SERVER_URL=
LLM_PROVIDER=
```

---

## 相关文档

- [架构说明](./ARCHITECTURE.md) - v3.0.0 静态化架构设计
- [Android 构建](./ANDROID_BUILD.md) - Android APK 构建指南
- [安全规范](./SECURITY.md) - 客户端架构下的密钥与数据安全
- [README](../README.md) - 项目概览
