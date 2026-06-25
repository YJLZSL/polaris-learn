# Polaris 部署指南

## 目录

1. [环境要求](#环境要求)
2. [环境隔离](#环境隔离)
3. [开发环境部署](#开发环境部署)
4. [Docker 部署](#docker-部署)
5. [生产环境 PostgreSQL 部署](#生产环境-postgresql-部署)
6. [HTTPS 配置](#https-配置)
7. [Electron 桌面端构建](#electron-桌面端构建)
8. [Android APK 构建](#android-apk-构建)

---

## 环境要求

| 组件 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18+ | 运行时 |
| npm | 9+ | 包管理 |
| SQLite | - | 开发环境默认，无需安装 |
| PostgreSQL | 16+ | 生产环境推荐 |

---

## 环境隔离

本平台通过分离的开发/生产环境配置文件实现环境隔离,确保开发用本地资源、生产用真实资源,且真值不入库。

### 开发环境(`.env.development`)

- 数据库:SQLite(`DATABASE_URL="file:./dev.db"`),无需额外安装。
- 站点地址:`http://localhost:3000`。
- Capacitor:`CAPACITOR_SERVER_URL="http://localhost:3000"`,Android 端调试时加载本地开发服务器。
- `ANDROID_DOWNLOAD_URL` 留空(开发环境无需检查更新)。
- 该文件仅含开发占位值,可安全提交到仓库。

### 生产环境(`.env.production` 模板)

- `.env.production` 仅作为模板提交,含占位空值,**真值通过部署环境注入**(系统环境变量 / Docker `env` / CI Secrets),禁止填入真实密钥后提交。
- 数据库:PostgreSQL(`DATABASE_URL` 填生产连接串)。
- `NEXTAUTH_URL` 填生产域名,`AUTH_SECRET` 填 32+ 字符随机串。
- `CAPACITOR_SERVER_URL` 填生产实际域名。
- `ANDROID_DOWNLOAD_URL` 填 APK 分发地址,供 `/api/version` 接口返回给 Android 客户端。

### 关键环境变量对照

| 变量 | 开发环境 | 生产环境 |
|------|----------|----------|
| `DATABASE_URL` | `file:./dev.db`(SQLite) | PostgreSQL 连接串(注入) |
| `CAPACITOR_SERVER_URL` | `http://localhost:3000`(或留空走默认) | 生产实际域名 |
| `ANDROID_DOWNLOAD_URL` | 留空 | APK 分发地址 |
| `AUTH_SECRET` / `NEXTAUTH_URL` | 开发占位值 | 真值注入 |

### Capacitor server 模式说明

本平台 Android 端采用**远程 webview 模式**:Capacitor 配置中的 `server.url` 指向生产 Next.js 服务地址,Android 应用本身不打包前端静态资源,而是加载线上服务。

- 开发时 `server.url` 指向 `http://localhost:3000`,与本地 `npm run dev` 联调。
- 生产时 `server.url` 指向生产域名,客户端依赖该服务可达。
- **发布前务必确认生产 Next.js 服务正常运行且可被 Android 设备访问**,否则应用启动后白屏。
- 这不是离线壳模式:服务不可达 = 应用不可用。

### 签名密钥管理

签名密钥(Android keystore、Electron 代码签名证书)严禁入库,本地或 CI 注入,详见 [SECURITY.md](./SECURITY.md)。

---

## 开发环境部署

```bash
# 1. 克隆仓库
git clone https://github.com/YJLZSL/polaris-learn.git
cd polaris-learn

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local

# 4. 编辑 .env.local，至少配置 DATABASE_URL 与 AUTH_SECRET
#    LLM API Key 无需在服务端配置，用户登录后在「设置」页填入自己的 Key

# 5. 初始化数据库
npx prisma db push

# 6. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

---

## Docker 部署

### 最小化部署（个人/小团队）
```bash
docker-compose -f docker-compose.minimal.yml up -d
```

### 标准部署（学校/机构）
```bash
# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 设置 DATABASE_PROVIDER=postgresql

docker-compose up -d
```

服务组成：
- `app` - Next.js 应用服务（前端 + API）
- `postgres` - PostgreSQL 主数据库（标准部署）

---

## 生产环境 PostgreSQL 部署

### 1. 配置数据库
```env
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://user:password@host:5432/polaris_learn?schema=public"
```

### 2. 同步表结构
```bash
npx prisma db push
```

### 3. 数据迁移（从 SQLite）
```bash
npm run db:migrate-pg
```

### 4. 构建与启动
```bash
npm run build
npm run start
```

---

## HTTPS 配置

### Nginx 反向代理示例
```nginx
server {
    listen 443 ssl;
    server_name api.polaris.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Electron 桌面端构建

```bash
# 开发模式（同时启动 Next.js 和 Electron）
npm run electron:dev

# 构建安装包（输出到 electron-dist/）
npm run electron:build
```

构建产出：
- Windows: `electron-dist/Polaris 北极星学习平台 Setup.exe`
- macOS: `electron-dist/Polaris 北极星学习平台.dmg`
- Linux: `electron-dist/Polaris 北极星学习平台.AppImage`

> 构建前请替换 `public/icon-512.png` 为品牌图标。

---

## Android APK 构建

详见 [ANDROID_BUILD.md](./ANDROID_BUILD.md)

```bash
# 初始化 Android 项目
npm run android:init

# 构建同步
npm run android:build

# 生成 APK（需要 Android Studio）
cd android && ./gradlew assembleRelease
```

---

## 环境变量参考

全部环境变量见 `.env.example`，关键变量：

| 变量 | 说明 | 必填 |
|------|------|------|
| `DATABASE_URL` | 数据库连接字符串 | 是 |
| `DATABASE_PROVIDER` | sqlite 或 postgresql | 否(sqlite) |
| `AUTH_SECRET` | NextAuth 加密密钥 | 是 |
| `NEXTAUTH_URL` | 站点访问地址 | 是(生产) |
| `LLM_PROVIDER` | deepseek/qwen/openai/ollama/custom，服务端默认 Provider | 否 |

> 注：LLM API Key 由用户登录后在「设置」页面填入并保存在浏览器本地，服务端无需配置 `DEEPSEEK_API_KEY` 等密钥。
