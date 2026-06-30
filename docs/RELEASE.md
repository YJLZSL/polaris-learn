# Polaris 发布流程

本指南规范 `polaris-learn` 的版本管理、Git 标签、原子提交以及 PC 端(Electron)和 Android 端(Capacitor)的发布流程。所有发布者请严格遵守,确保产物可追溯、更新链路可用、密钥不泄露。

> 配套文档:[SECURITY.md](./SECURITY.md)(密钥与签名)、[DEPLOYMENT.md](./DEPLOYMENT.md)(部署)、[ANDROID_BUILD.md](./ANDROID_BUILD.md)(Android 构建)。

---

## 0. v5.0.0 发布说明（面向用户）

**Polaris 北极星学习平台 v5.0.0** 是一次体验重构大版本，在 v4.0.0 纯 SPA 架构上完成全面升级，未改变"无服务器 / 本地数据 / 自带 API Key"的核心定位。

### 给用户的新功能

- **学段自适应 2.0**：5 学段（幼儿园/小学/初中/高中/上班族）自动适配圆角、字号、游戏化强度，暗色模式默认开启，北极星主题渐变流光
- **AI 老师全新体验**：苏格拉底 6 阶段语义化辅导，流式逐字渲染，语音朗读 + 语音输入，停止生成，思考过程折叠，模型配置向导（多配置切换 + 连接测试 + Ollama 自动探测）
- **知识星图**：力导向图可视化，亮星/星云/红光三态，缩放拖拽，超期未复习自动裂纹衰减
- **错题消灭战**：60 秒心流倒计时挑战，连续答对点亮红→绿节点，星光奖励
- **学习伙伴养成**：Polaris 小灵 4 形态（蛋→幼体→成体→觉醒），按学习时长进化，首页常驻陪伴
- **双货币 + 连胜容错**：星光（日常）+ 晶核（里程碑），冻结卡断签保护，里程碑保护盾，历史最高纪录保留
- **每日任务**：每日 3 个任务，全完成触发宝箱 + 徽章碎片
- **专注心流护盾**：25 分钟番茄钟，心流能量条，深色聚焦态，XP × 1.5 加成
- **Bento Grid 首页**：6-8 块卡片网格布局，stagger 入场 + spring hover
- **排行榜去毒性化**：5-15 人小队列 + "超越昨日自己"个人进步榜

### 升级须知

- **学段 ID 自动迁移**：旧值 PRIMARY/MIDDLE_HIGH/COLLEGE 自动迁移为 ELEMENTARY/MIDDLE/HIGH，历史用户无缝升级
- **数据兼容**：IndexedDB 自动从 v1/v2 升级到 v3（新增 `daily_quests` store），老数据保留
- **API Key 兼容**：旧的单配置自动迁移为多配置格式
- **架构不变**：仍是无服务器纯前端 SPA，无需部署后端，无需迁移数据

完整变更见 [CHANGELOG.md](../CHANGELOG.md) 的 v5.0.0 条目。

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

版本号统一维护在根目录 `package.json` 的 `version` 字段,可用 `npm run version:check` 查看当前版本。**Electron、Android 客户端共用此版本号**,据此判断是否需要更新。

---

## 2. Git tag 规范

- 标签格式:`vX.Y.Z`(与 `package.json` version 对应),如 `v5.0.0`。
- **仅在 `main`/`master` 分支打 tag**,发布前确保该分支构建通过、自查清单(见第 6 节)全部完成。
- 使用带说明的 annotated tag:

```bash
git tag -a v5.0.0 -m "Release v5.0.0"
git push origin v5.0.0
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
- 一律按具体文件路径暂存,如 `git add src/pages/HomePage.tsx docs/RELEASE.md`。

### 3.3 禁止入库的内容

以下内容严禁入库(规则同步写入 `.gitignore` 与 [SECURITY.md](./SECURITY.md)):

- **构建产物**:`dist/`、`electron-dist/`、`android/`、`build/`
- **依赖**:`node_modules/`
- **密钥与证书**:`*.keystore`、`*.p12`/`*.pfx`、`*.cert`/`*.pem`、`key.properties`、`dev-app-update.yml`
- **环境真值**:`.env`、`.env.local`、`.env.*.local`(模板 `.env.development` / `.env.production` 仅含占位,可入库)
- **本地数据库**:`*.db`、`*.db-journal`

### 3.4 提交前必做

```bash
npm run lint   # 必须无 lint 错误
npm run build  # 必须构建成功（vite build）
git status     # 复核暂存区,确认无密钥/产物
```

> 密钥与签名的完整管理规范见 [SECURITY.md](./SECURITY.md)。

---

## 4. PC 端(Electron)发布流程

### 4.1 升级版本号

编辑 `package.json`,将 `version` 调整为目标版本(如 `4.0.0` → `5.0.0`)。提交该变更:

```bash
git add package.json
git commit -m "chore: bump version to 5.0.0"
```

### 4.2 构建 Vite 产物与 Electron 安装包

```bash
npm run build          # 构建 Vite 静态产物到 dist/
npm run electron:build # 调用 electron-builder,生成 electron-dist/ 下的安装包 + latest.yml
```

`electron:build` 内部会执行 `vite build` 再调用 `electron-builder`。产物位于 `electron-dist/`:

- Windows:`Polaris 北极星学习平台 Setup.exe`（NSIS 安装包）
- macOS:`Polaris 北极星学习平台.dmg`
- Linux:`Polaris 北极星学习平台.AppImage`
- 自动更新元数据:`latest.yml`(供 `electron-updater` 比对版本)

### 4.3 创建 GitHub Release 并上传资产

1. 在 `main`/`master` 分支打 tag:`git tag -a v5.0.0 -m "Release v5.0.0"` 并推送。
2. 在 GitHub 仓库 `YJLZSL/polaris-learn` 基于 tag 创建 Release,标题为 `Release vX.Y.Z`,正文填写更新说明。
3. 上传 Release 资产:**仅上传安装包(`.exe` / `.dmg` / `.AppImage`)与 `latest.yml`**,不要上传源码工作区、`node_modules/` 或构建中间产物。

> `package.json` 的 `build.publish` 已指向 GitHub(`owner: YJLZSL`、`repo: polaris-learn`)。若在 CI 中执行 `electron:build` 且注入了 `GH_TOKEN`,`electron-builder` 也可自动上传资产并生成 Release。

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

### 5.2 构建 Vite 静态产物并同步到 Android

```bash
npm run android:build  # 等价于 vite build && npx cap sync android
```

v4.0.0 起 Android 端通过 Capacitor 加载本地 `dist/` 静态文件,**不再连接任何远程服务**,无需配置 `CAPACITOR_SERVER_URL` 等环境变量。

### 5.3 在 Android Studio 中签名打包

签名密钥由维护者本地生成,严禁入库(规范见 [SECURITY.md](./SECURITY.md#android-keystore-管理)):

1. 在 `android/` 目录下配置 `key.properties`(指向本地 keystore、口令等),该文件已被 `.gitignore` 忽略。
2. 用 Android Studio 打开 `android/`(`npm run android:open`),选择 Build → Generate Signed Bundle / APK,选用 Release 构建变体生成 APK 或 AAB。

```bash
# 或通过命令行
cd android && ./gradlew assembleRelease
```

### 5.4 上传 APK 并分发

1. 将生成的 Release APK 上传到分发地址(自托管静态服务器或第三方网盘),确保该地址可被 Android 浏览器直接下载。
2. 在 GitHub Release 中附上 APK 文件,或通过应用内提示引导用户下载。

### 5.5 用户端更新提示

> 注意:v4.0.0 已移除 `useVersionCheck` hook 与 `/api/version` 接口(因纯前端 SPA 无服务端)。

Android 端的版本更新提示目前依赖以下方式之一:

- **GitHub Release 通知**:用户关注仓库或通过 Release 页面获取新版本。
- **应用内静态提示**:可在 `src/lib/version.ts` 中维护最新版本号,应用启动时与本地版本比对,提示用户前往下载地址。

如需恢复动态版本检查,可自行接入第三方版本托管服务(如 Firebase Remote Config、自定义静态 JSON 托管等),但需注意 v4.0.0 架构本身不提供服务端接口。

---

## 6. 发布自查清单

发布前逐项核对,任何一项未通过都不要打 tag、不要发 Release:

- [ ] ① `package.json` `version` 已升级到目标版本(当前 v5.0.0),与计划 tag 一致
- [ ] ② `npx tsc --noEmit` 零类型错误
- [ ] ③ `npm run lint` 与 `npm run build`(`vite build`)均通过,无错误
- [ ] ④ `git status` 无未提交的密钥、证书、构建产物(`dist/` / `electron-dist/` / `android/` / `node_modules/`)
- [ ] ⑤ 已在 `main`/`master` 分支打 `v5.0.0` tag 并推送
- [ ] ⑥ GitHub Release 资产已上传,**仅包含安装包与 `latest.yml`**(Electron)或 APK(Android),不含源码工作区、依赖或中间产物
- [ ] ⑦ CHANGELOG.md / README.md / ARCHITECTURE.md / AGENTS.md / RELEASE.md 版本号已同步为 v5.0.0

---

## 7. 开发与构建命令速查

| 场景 | 命令 | 说明 |
|------|------|------|
| 本地开发 | `npm run dev` | 启动 Vite 开发服务器,访问 http://localhost:5173 |
| Electron 开发 | `npm run electron:dev` | 同时启动 Vite + Electron,支持热更新 |
| Web 生产构建 | `npm run build` | `vite build`,产出 `dist/` |
| Electron 打包 | `npm run electron:build` | `vite build && electron-builder`,产出 `electron-dist/` |
| Android 构建 | `npm run android:build` | `vite build && cap sync android` |
| 类型检查 | `npx tsc --noEmit` | 零类型错误校验 |
| Lint 检查 | `npm run lint` | ESLint 代码规范检查 |

---

## 相关文档

- [架构说明](./ARCHITECTURE.md) - v5.0.0 Vite SPA 架构设计
- [部署指南](./DEPLOYMENT.md) - 各平台部署方案
- [Android 构建](./ANDROID_BUILD.md) - Android APK 构建指南
- [安全规范](./SECURITY.md) - 密钥与签名管理
