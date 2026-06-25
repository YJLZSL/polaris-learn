# 智学AI 发布流程

本指南规范 `ai-edu-platform` 的版本管理、Git 标签、原子提交以及 PC 端(Electron)和 Android 端(Capacitor)的发布流程。所有发布者请严格遵守,确保产物可追溯、更新链路可用、密钥不泄露。

> 配套文档:[SECURITY.md](./SECURITY.md)(密钥与签名)、[DEPLOYMENT.md](./DEPLOYMENT.md)(部署)、[ANDROID_BUILD.md](./ANDROID_BUILD.md)(Android 构建)。

---

## 1. 版本号规范

本平台采用 [语义化版本控制(SemVer)](https://semver.org/lang/zh-CN/),格式为 `MAJOR.MINOR.PATCH`:

- **MAJOR**:破坏性变更(不兼容的 API/数据库结构调整)
- **MINOR**:向下兼容的新功能
- **PATCH**:向下兼容的 Bug 修复

示例:

- `1.0.0` → `1.1.0`:新增「学习报告导出」功能
- `1.1.0` → `1.1.1`:修复登录跳转 Bug
- `1.1.1` → `2.0.0`:重构数据库 schema,需用户重新初始化

版本号统一维护在根目录 `package.json` 的 `version` 字段,可用 `npm run version:check` 查看当前版本。**Electron、Android、Next.js 服务端共用此版本号**,各客户端据此判断是否需要更新。

---

## 2. Git tag 规范

- 标签格式:`vX.Y.Z`(与 `package.json` version 对应),如 `v1.0.0`。
- **仅在 `main`/`master` 分支打 tag**,发布前确保该分支构建通过、自查清单(见第 7 节)全部完成。
- 使用带说明的 annotated tag:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

- 一个版本一个 tag,严禁复用、覆盖已发布 tag。如需修订,发布新 patch 版本并打新 tag。

---

## 3. 原子提交要求

发布由若干提交累积而成,提交质量直接决定发布可追溯性。请遵守:

### 3.1 一个逻辑变更一个 commit

- 一个 commit 只做一件事:新增功能、修复 Bug、改文档、重构各自独立提交。
- 禁止把多个不相关变更塞进同一 commit,也禁止把一个功能拆成零碎 commit 刷记录。
- commit message 遵循约定式提交(Conventional Commits),如 `feat: 新增学习报告导出`、`fix: 修复登录跳转`、`docs: 补充发布流程`。

### 3.2 禁止整工作区暂存

- **禁止 `git add -A` / `git add .`** 整目录暂存,这会把未审查的临时文件、产物、密钥一并提交。
- 一律按具体文件路径暂存,如 `git add src/app/api/version/route.ts docs/RELEASE.md`。

### 3.3 禁止入库的内容

以下内容严禁入库(规则同步写入 `.gitignore` 与 [SECURITY.md](./SECURITY.md)):

- **构建产物**:`.next/`、`electron-dist/`、`out/`、`android/`、`build/`
- **依赖**:`node_modules/`
- **密钥与证书**:`*.keystore`、`*.p12`/`*.pfx`、`*.cert`/`*.pem`、`key.properties`、`dev-app-update.yml`
- **环境真值**:`.env`、`.env.local`、`.env.*.local`(模板 `.env.development` / `.env.production` 仅含占位,可入库)
- **本地数据库**:`*.db`、`*.db-journal`

### 3.4 提交前必做

```bash
npm run lint   # 必须无 lint 错误
npm run build  # 必须构建成功
git status     # 复核暂存区,确认无密钥/产物
```

> 密钥与签名的完整管理规范见 [SECURITY.md](./SECURITY.md)。

---

## 4. PC 端(Electron)发布流程

### 4.1 升级版本号

编辑 `package.json`,将 `version` 调整为目标版本(如 `1.0.0` → `1.1.0`)。提交该变更:

```bash
git add package.json
git commit -m "chore: bump version to 1.1.0"
```

### 4.2 构建 Next.js 与 Electron 安装包

```bash
npm run build          # 构建 Next.js
npm run electron:build # 调用 electron-builder,生成 electron-dist/ 下的安装包 + latest.yml
```

`electron:build` 内部会执行 `next build` 再调用 `electron-builder`。产物位于 `electron-dist/`:

- Windows:`智学AI教育平台 Setup.exe`
- macOS:`智学AI教育平台.dmg`
- Linux:`智学AI教育平台.AppImage`
- 自动更新元数据:`latest.yml`(供 `electron-updater` 比对版本)

### 4.3 创建 GitHub Release 并上传资产

1. 在 `main`/`master` 分支打 tag:`git tag -a v1.1.0 -m "Release v1.1.0"` 并推送。
2. 在 GitHub 仓库 `YJLZSL/ai-edu-platform` 基于 tag 创建 Release,标题为 `Release vX.Y.Z`,正文填写更新说明。
3. 上传 Release 资产:**仅上传安装包(`.exe` / `.dmg` / `.AppImage`)与 `latest.yml`**,不要上传源码工作区、`node_modules/` 或构建中间产物。

> `package.json` 的 `build.publish` 已指向 GitHub(`owner: YJLZSL`、`repo: ai-edu-platform`)。若在 CI 中执行 `electron:build` 且注入了 `GH_TOKEN`,`electron-builder` 也可自动上传资产并生成 Release。

### 4.4 用户端自动更新

已安装的桌面应用启动时,`electron/main.js` 中的 `electron-updater` 会:

1. 自动检查 GitHub Release 上的 `latest.yml` 比对版本;
2. 后台下载新版本安装包(`autoDownload = true`);
3. 下载完成后通过 IPC 通知渲染进程,提示用户重启;
4. 用户确认后调用 `autoUpdater.quitAndInstall()` 安装并重启。

开发模式(`!app.isPackaged`)下自动更新不启用,避免误报。

### 4.5 代码签名(可选但推荐)

未签名的安装包在 Windows/macOS 会触发系统安全警告。签名材料严禁入库,具体注入方式见 [SECURITY.md](./SECURITY.md#electron-代码签名):

- **Windows**:使用 `.pfx` 证书,通过 `CSC_LINK`(证书 base64 或路径)与 `CSC_KEY_PASSWORD` 环境变量注入。
- **macOS**:使用 Developer ID Application 证书,同样通过 `CSC_LINK` / `CSC_KEY_PASSWORD` 注入;如需公证,补充 `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID`。

```bash
# 本地签名构建示例(PowerShell)
$env:CSC_LINK = "C:\path\to\cert.pfx"
$env:CSC_KEY_PASSWORD = "your-password"
npm run electron:build
```

---

## 5. Android 端发布流程

### 5.1 升级版本号

与 PC 端共用 `package.json` 的 `version`。Android 应用的 `versionName` 来源于此;如需调整 `versionCode`,在 `android/app/build.gradle` 中维护。

### 5.2 配置生产服务器地址

通过 `.env.production` 设置 `CAPACITOR_SERVER_URL` 指向生产域名(如 `https://zixueai.com`)。`capacitor.config.ts` 会读取该环境变量作为 webview 的 `server.url`,使 Android 端以远程 webview 模式加载生产 Next.js 服务。

```env
# .env.production(模板,真值由部署环境注入)
CAPACITOR_SERVER_URL="https://your-production-domain.com"
```

### 5.3 构建 Next.js 并同步到 Android

```bash
npm run android:build  # 等价于 npm run build && npx cap sync android
```

### 5.4 在 Android Studio 中签名打包

签名密钥由维护者本地生成,严禁入库(规范见 [SECURITY.md](./SECURITY.md#android-keystore-管理)):

1. 在 `android/` 目录下配置 `key.properties`(指向本地 keystore、口令等),该文件已被 `.gitignore` 忽略。
2. 用 Android Studio 打开 `android/`(`npm run android:open`),选择 Build → Generate Signed Bundle / APK,选用 Release 构建变体生成 APK 或 AAB。

```bash
# 或通过命令行
cd android && ./gradlew assembleRelease
```

### 5.5 上传 APK 并回填分发地址

1. 将生成的 Release APK 上传到分发地址(自托管静态服务器或第三方网盘),确保该地址可被 Android 浏览器直接下载。
2. 将该地址填入**生产环境**的 `ANDROID_DOWNLOAD_URL`(通过部署环境变量注入,不要把真值写回 `.env.production` 模板)。

### 5.6 用户端更新提示

Android 应用启动时调用 `GET /api/version` 接口,获取最新 `version` 与 `androidUrl`。`useVersionCheck` hook 比对当前版本,若落后则通过 `AndroidUpdateBanner` 组件展示更新横幅;用户点击后跳转系统浏览器下载新 APK,完成手动安装更新。

---

## 6. 版本检查接口

`GET /api/version` 由 Next.js 服务端提供,返回当前发布版本与各平台下载地址:

```json
{
  "version": "1.1.0",
  "androidUrl": "https://your-host/app-release.apk",
  "electronUrl": "https://github.com/YJLZSL/ai-edu-platform/releases/latest",
  "notes": ""
}
```

| 字段 | 来源 | 用途 |
|------|------|------|
| `version` | `package.json` 的 `version` | 各客户端比对当前版本,判断是否落后 |
| `androidUrl` | 环境变量 `ANDROID_DOWNLOAD_URL` | Android 端更新横幅点击跳转地址 |
| `electronUrl` | 环境变量 `ELECTRON_DOWNLOAD_URL` | 桌面端手动下载兜底地址(自动更新仍以 GitHub Release + `latest.yml` 为准) |
| `notes` | 预留字段 | 更新说明,当前为空,后续可扩展 |

> Electron 桌面端主要依赖 `electron-updater` 通过 GitHub Release 的 `latest.yml` 自动更新;`/api/version` 接口主要服务于 Android 端与 PWA 端的版本提示。

---

## 7. 发布自查清单

发布前逐项核对,任何一项未通过都不要打 tag、不要发 Release:

- [ ] ① `package.json` `version` 已升级到目标版本,与计划 tag 一致
- [ ] ② `npm run lint` 与 `npm run build` 均通过,无错误
- [ ] ③ `git status` 无未提交的密钥、证书、构建产物(`.next/` / `electron-dist/` / `out/` / `android/` / `node_modules/`)
- [ ] ④ 已在 `main`/`master` 分支打 `vX.Y.Z` tag 并推送
- [ ] ⑤ GitHub Release 资产已上传,**仅包含安装包与 `latest.yml`**,不含源码工作区、依赖或中间产物
